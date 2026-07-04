const QRCode = require('qrcode');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');

// Helper to parse time string "HH:MM - HH:MM" into minutes from midnight
function parseTime(timeStr) {
  if (!timeStr) return null;
  const cleanStr = timeStr.replace(/\s+/g, '');
  const parts = cleanStr.split('-');
  if (parts.length !== 2) return null;
  
  const parsePart = (part) => {
    const timeParts = part.split(':');
    if (timeParts.length !== 2) return null;
    return parseInt(timeParts[0], 10) * 60 + parseInt(timeParts[1], 10);
  };
  
  const start = parsePart(parts[0]);
  const end = parsePart(parts[1]);
  
  if (start === null || end === null) return null;
  return { start, end };
}

// Helper to check if two time ranges overlap
function isOverlapping(timeStr1, timeStr2) {
  const range1 = parseTime(timeStr1);
  const range2 = parseTime(timeStr2);
  if (!range1 || !range2) return false;
  return range1.start < range2.end && range2.start < range1.end;
}

// Helper to check if two dates are on the same day (timezone safe)
function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
  return d1.toISOString().split('T')[0] === d2.toISOString().split('T')[0];
}

// GET /api/events
exports.listEvents = async (req, res) => {
  try {
    const events = await Event.find({ status: 'approved' }).sort({ date: 1 });
    
    // Attach live registration count to each event in the list
    const eventsWithCounts = await Promise.all(events.map(async (event) => {
      const regCount = await Registration.countDocuments({ eventId: event._id });
      return {
        ...event.toObject(),
        registrationCount: regCount
      };
    }));

    res.json(eventsWithCounts);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving events', error: error.message });
  }
};

// GET /api/events/my-events
exports.listMyEvents = async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ message: 'Username is required.' });
    }
    
    const events = await Event.find({ createdBy: username.trim() }).sort({ date: 1 });
    
    const eventsWithCounts = await Promise.all(events.map(async (event) => {
      const regCount = await Registration.countDocuments({ eventId: event._id });
      return {
        ...event.toObject(),
        registrationCount: regCount
      };
    }));

    res.json(eventsWithCounts);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving your events', error: error.message });
  }
};

// GET /api/events/:id
exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    const count = await Registration.countDocuments({ eventId: event._id });
    res.json({
      ...event.toObject(),
      registrationCount: count
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving event details', error: error.message });
  }
};

// POST /api/events
exports.createEvent = async (req, res) => {
  try {
    const { title, description, date, time, venue, capacity, createdBy, foodMenu, coordinatorName, coordinatorPhone, isPaid, entryFee, upiId } = req.body;
    
    if (!title || !description || !date || !time || !venue || !capacity) {
      return res.status(400).json({ message: 'All fields except createdBy are required' });
    }
    
    const normalizedVenue = venue.trim().replace(/\s+/g, ' ');
    
    // Clash check: check if there's any event at same venue, same day, overlapping time (excluding declined ones)
    const existingEventsAtVenue = await Event.find({
      venue: { $regex: new RegExp('^' + normalizedVenue + '$', 'i') },
      status: { $ne: 'declined' }
    });
    
    const proposedDate = new Date(date);
    let isClash = false;
    for (const extEvent of existingEventsAtVenue) {
      if (isSameDay(proposedDate, extEvent.date) && isOverlapping(time, extEvent.time)) {
        isClash = true;
        break;
      }
    }
    
    if (isClash) {
      return res.status(400).json({ message: 'Already booked' });
    }
    
    const creator = createdBy || 'Organiser';
    const isCreatorAdmin = creator.toLowerCase() === 'admin' || creator.toLowerCase() === 'organiser';
    const status = isCreatorAdmin ? 'approved' : 'pending';
    
    const newEvent = new Event({
      title,
      description,
      date: new Date(date),
      time,
      venue: normalizedVenue,
      capacity,
      createdBy: creator,
      status,
      foodMenu: foodMenu || 'None',
      coordinatorName: coordinatorName || 'Organiser',
      coordinatorPhone: coordinatorPhone || '',
      isPaid: !!isPaid,
      entryFee: isPaid ? Number(entryFee || 0) : 0,
      upiId: isPaid ? upiId : ''
    });
    
    await newEvent.save();
    
    if (status === 'pending') {
      // Create admin notification
      const notification = new Notification({
        recipient: 'admin',
        sender: creator,
        type: 'EVENT_REQUEST',
        title: 'Event Request',
        message: `${creator} has requested to host a new event: "${title}" at ${venue} (${time}).`,
        relatedEvent: newEvent._id,
        status: 'pending'
      });
      await notification.save();
      
      // Log activity
      try {
        const activity = new Activity({
          userName: creator,
          userEmail: creator,
          activityType: 'REGISTER_EVENT',
          description: `Requested approval for event: '${title}'`
        });
        await activity.save();
      } catch (err) {
        console.warn('Activity log failed:', err.message);
      }
    } else {
      // Log approved creation
      try {
        const activity = new Activity({
          userName: creator,
          userEmail: creator,
          activityType: 'REGISTER_EVENT',
          description: `Created approved event: '${title}'`
        });
        await activity.save();
      } catch (err) {
        console.warn('Activity log failed:', err.message);
      }
    }
    
    res.status(201).json(newEvent);
  } catch (error) {
    res.status(400).json({ message: 'Error creating event', error: error.message });
  }
};

// POST /api/events/:id/register
exports.registerStudent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const { studentName, studentEmail, studentPhone, foodPreference, bypassClash, paymentStatus, upiTransactionId } = req.body;
    
    if (!studentName || !studentEmail || !studentPhone) {
      return res.status(400).json({ message: 'Name, email, and phone number are required' });
    }
    
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // 0. Check Registration Deadline (1 day prior to event date)
    const today = new Date();
    const eventDate = new Date(event.date);
    const dueDate = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
    dueDate.setUTCHours(23, 59, 59, 999);
    
    if (today > dueDate) {
      const formattedDueDate = dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      return res.status(400).json({ 
        message: `Registration Closed: The deadline to register was ${formattedDueDate} (1 day prior to the event).` 
      });
    }
    
    // 1. Check capacity
    const regCount = await Registration.countDocuments({ eventId });
    if (regCount >= event.capacity) {
      return res.status(400).json({ message: `Registration failed. '${event.title}' is at full capacity (${event.capacity}).` });
    }
    
    const emailLower = studentEmail.trim().toLowerCase();
    
    // 2. Check if student already registered for this event
    const existingReg = await Registration.findOne({ eventId, studentEmail: emailLower });
    if (existingReg) {
      return res.status(400).json({ message: `You are already registered for '${event.title}'.` });
    }
    
    // 3. Clash Detection Logic (Step 4)
    // Find all registrations by this student and populate their event details
    const studentRegistrations = await Registration.find({ studentEmail: emailLower }).populate('eventId');
    
    if (!bypassClash) {
      for (const reg of studentRegistrations) {
        const regEvent = reg.eventId;
        if (!regEvent) continue;
        
        // Check if dates are same and times overlap
        if (isSameDay(event.date, regEvent.date) && isOverlapping(event.time, regEvent.time)) {
          return res.status(409).json({
            clash: true,
            conflictingEvent: regEvent.title,
            message: `Schedule Clash: You are already registered for '${regEvent.title}' (${regEvent.time}) on the same day.`
          });
        }
      }
    }
    
    // 4. Payment validation checks
    let finalPaymentStatus = 'free';
    let finalUpiTxId = '';
    
    if (event.isPaid) {
      if (!paymentStatus || paymentStatus !== 'paid' || !upiTransactionId) {
        return res.status(400).json({ message: 'UPI Payment verification reference is required for this event.' });
      }
      finalPaymentStatus = 'paid';
      finalUpiTxId = upiTransactionId.trim();
    }

    // 5. Create registration placeholder to get an ID
    const registration = new Registration({
      eventId,
      studentName: studentName.trim(),
      studentEmail: emailLower,
      studentPhone: studentPhone.trim(),
      foodPreference: foodPreference || 'none',
      checkedIn: false,
      qrCode: 'PENDING',
      paymentStatus: finalPaymentStatus,
      upiTransactionId: finalUpiTxId
    });
    
    // Generate QR code encoding the registration verification details
    // We encode the registration ID which will be scanned at checkin
    const qrData = JSON.stringify({
      registrationId: registration._id,
      eventId: event._id
    });
    
    const qrCodeDataUrl = await QRCode.toDataURL(qrData);
    registration.qrCode = qrCodeDataUrl;
    
    await registration.save();
    
    // Log activity
    try {
      const activity = new Activity({
        userName: registration.studentName,
        userEmail: registration.studentEmail,
        activityType: 'REGISTER_EVENT',
        description: `Booked ticket for event: '${event.title}'`
      });
      await activity.save();
    } catch (e) {
      console.warn("Failed to log booking activity:", e);
    }

    res.status(201).json(registration);
  } catch (error) {
    res.status(500).json({ message: 'Error registering for event', error: error.message });
  }
};

// GET /api/events/:id/registrations
exports.listRegistrations = async (req, res) => {
  try {
    const eventId = req.params.id;
    const registrations = await Registration.find({ eventId }).sort({ registeredAt: -1 });
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving registrations', error: error.message });
  }
};

// DELETE /api/events/:id
exports.deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ message: 'username is required to delete event' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const isDeleterAdmin = username.toLowerCase() === 'admin';
    const isDeleterCreator = event.createdBy.toLowerCase() === username.toLowerCase();

    if (!isDeleterAdmin && !isDeleterCreator) {
      return res.status(403).json({ message: 'Unauthorized: Only the host or Admin can cancel this event' });
    }

    const registrations = await Registration.find({ eventId });

    if (isDeleterAdmin) {
      // 1. Notify Host
      const notifyHost = new Notification({
        recipient: event.createdBy,
        sender: 'admin',
        type: 'SYSTEM',
        title: 'Event Cancelled by Admin',
        message: `Admin has cancelled your hosted event: "${event.title}".`,
        relatedEvent: event._id,
        status: 'pending'
      });
      await notifyHost.save();

      // 2. Notify all registered students
      for (const reg of registrations) {
        const notifyStudent = new Notification({
          recipient: reg.studentEmail,
          sender: 'admin',
          type: 'SYSTEM',
          title: 'Event Cancelled',
          message: `The event "${event.title}" you registered for has been cancelled by the Admin.`,
          relatedEvent: event._id,
          status: 'pending'
        });
        await notifyStudent.save();
      }
    } else {
      // Host cancelled
      // 1. Notify Admin
      const notifyAdmin = new Notification({
        recipient: 'admin',
        sender: event.createdBy,
        type: 'SYSTEM',
        title: 'Hosted Event Cancelled',
        message: `Host ${event.createdBy} has cancelled their event: "${event.title}".`,
        relatedEvent: event._id,
        status: 'pending'
      });
      await notifyAdmin.save();

      // 2. Notify all registered students
      for (const reg of registrations) {
        const notifyStudent = new Notification({
          recipient: reg.studentEmail,
          sender: event.createdBy,
          type: 'SYSTEM',
          title: 'Event Cancelled',
          message: `The event "${event.title}" you registered for has been cancelled by the host.`,
          relatedEvent: event._id,
          status: 'pending'
        });
        await notifyStudent.save();
      }
    }

    // Delete registrations
    await Registration.deleteMany({ eventId });

    // Delete event
    await Event.findByIdAndDelete(eventId);

    // Log activity
    try {
      const activity = new Activity({
        userName: username,
        userEmail: username,
        activityType: 'CANCEL_EVENT',
        description: `Cancelled event: '${event.title}'`
      });
      await activity.save();
    } catch (e) {
      console.warn("Failed to log cancellation activity:", e);
    }

    res.json({ message: 'Event cancelled successfully and participants notified.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting event', error: error.message });
  }
};

// GET /api/events/my-bookings/list
exports.listMyBookings = async (req, res) => {
  try {
    const { studentName } = req.query;
    if (!studentName) {
      return res.status(400).json({ message: 'studentName is required.' });
    }
    
    const registrations = await Registration.find({ 
      studentName: { $regex: new RegExp('^' + studentName.trim() + '$', 'i') } 
    }).populate('eventId');
    
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving your bookings', error: error.message });
  }
};

