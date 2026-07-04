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
  return d1.getUTCFullYear() === d2.getUTCFullYear() &&
         d1.getUTCMonth() === d2.getUTCMonth() &&
         d1.getUTCDate() === d2.getUTCDate();
}

async function cleanupPastEvents() {
  try {
    const now = new Date();
    const events = await Event.find({});
    for (const event of events) {
      const eventDate = new Date(event.date);
      const timeStr = event.time || "00:00 - 23:59";
      const parts = timeStr.split('-');
      let endTimeStr = "23:59";
      if (parts.length === 2) {
        endTimeStr = parts[1].trim();
      }
      
      const [hours, minutes] = endTimeStr.split(':').map(Number);
      const endDateTime = new Date(eventDate);
      endDateTime.setUTCHours(hours || 0, minutes || 0, 0, 0);
      
      if (endDateTime < now) {
        console.log(`Auto-cleaning up ended event: ${event.title}`);
        await Registration.deleteMany({ eventId: event._id });
        await Event.findByIdAndDelete(event._id);
      }
    }
  } catch (err) {
    console.error("Cleanup of past events failed:", err.message);
  }
}

async function autoSeed() {
  try {
    const count = await Event.countDocuments({});
    if (count === 0) {
      console.log("Database empty. Auto-seeding default 6 events...");
      const now = new Date();
      const isJuly2026 = now.getUTCFullYear() === 2026 && now.getUTCMonth() === 6; // July is index 6
      
      const getEventDate = (dayOffset, defaultDateStr) => {
        if (isJuly2026) {
          return new Date(defaultDateStr);
        } else {
          const d = new Date();
          d.setDate(d.getDate() + dayOffset);
          d.setUTCHours(0, 0, 0, 0);
          return d;
        }
      };

      const defaultEvents = [
        {
          title: 'Arohan',
          description: 'Annual cultural fest with dance, music, and drama competitions.',
          date: getEventDate(1, '2026-07-15T00:00:00Z'),
          time: '09:00 - 18:00',
          venue: 'Main Auditorium',
          capacity: 200,
          status: 'approved',
          createdBy: 'Organiser',
          foodMenu: 'Samosa, Veg Biryani, Ice Cream',
          coordinatorName: 'Aman Preet',
          coordinatorPhone: '+91 91234 56789'
        },
        {
          title: 'Tiny Tans',
          description: "Freshers' welcome party for the new batch.",
          date: getEventDate(2, '2026-07-16T00:00:00Z'),
          time: '16:00 - 20:00',
          venue: 'Open Air Theatre',
          capacity: 150,
          status: 'approved',
          createdBy: 'Organiser',
          foodMenu: 'Cupcakes, Soft Drinks',
          coordinatorName: 'Ananya Roy',
          coordinatorPhone: '+91 96789 01234'
        },
        {
          title: 'Code Red',
          description: '24-hour coding and hackathon competition.',
          date: getEventDate(5, '2026-07-20T00:00:00Z'),
          time: '10:00 - 22:00',
          venue: 'CS Seminar Hall',
          capacity: 80,
          status: 'approved',
          createdBy: 'Organiser',
          foodMenu: 'Pizza, Burgers, Coke (Lunch & Dinner)',
          coordinatorName: 'Rohit Verma',
          coordinatorPhone: '+91 92345 67890',
          isPaid: true,
          entryFee: 150,
          upiId: 'codered@okaxis'
        },
        {
          title: 'Mic Drop',
          description: 'Open mic and stand-up comedy night.',
          date: getEventDate(7, '2026-07-22T00:00:00Z'),
          time: '18:00 - 21:00',
          venue: 'College Amphitheatre',
          capacity: 60,
          status: 'approved',
          createdBy: 'Organiser',
          foodMenu: 'None',
          coordinatorName: 'Sneha Sen',
          coordinatorPhone: '+91 93456 78901'
        },
        {
          title: 'Plate Tales',
          description: 'Food festival with stalls and cooking competitions.',
          date: getEventDate(10, '2026-07-25T00:00:00Z'),
          time: '11:00 - 16:00',
          venue: 'Main Lawn',
          capacity: 250,
          status: 'approved',
          createdBy: 'Organiser',
          foodMenu: 'Buffet Menu',
          coordinatorName: 'Karan Malhotra',
          coordinatorPhone: '+91 95678 90123',
          isPaid: true,
          entryFee: 200,
          upiId: 'platetales@oksbi'
        },
        {
          title: 'Farewell Fiesta',
          description: 'Send-off event for the graduating batch.',
          date: getEventDate(15, '2026-07-30T00:00:00Z'),
          time: '15:00 - 19:00',
          venue: 'Silver Jubilee Hall',
          capacity: 100,
          status: 'approved',
          createdBy: 'Organiser',
          foodMenu: 'Mocktails, Pulao, Paneer Curry',
          coordinatorName: 'Divya Iyer',
          coordinatorPhone: '+91 94567 89012'
        }
      ];

      await Event.insertMany(defaultEvents);
      console.log("Auto-seeded successfully!");
    }
  } catch (err) {
    console.error("Auto-seeding failed:", err.message);
  }
}

// GET /api/events
exports.listEvents = async (req, res) => {
  try {
    await cleanupPastEvents();
    await autoSeed();
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
    await cleanupPastEvents();
    await autoSeed();
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
    await cleanupPastEvents();
    const { title, description, date, time, venue, capacity, createdBy, foodMenu, coordinatorName, coordinatorPhone, isPaid, entryFee, upiId, dueDate } = req.body;
    
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
    
    // Check 3-month window limit (current month + next 2 months)
    const today = new Date();
    const limitDate = new Date(today.getFullYear(), today.getMonth() + 3, 0, 23, 59, 59, 999);
    if (proposedDate > limitDate) {
      return res.status(400).json({ message: 'Event date must be within the next 3 months.' });
    }
    
    let parsedDueDate = undefined;
    if (dueDate) {
      parsedDueDate = new Date(dueDate);
      if (parsedDueDate > proposedDate) {
        return res.status(400).json({ message: 'Registration deadline cannot be after the event date.' });
      }
    }
    
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
      upiId: isPaid ? upiId : '',
      dueDate: parsedDueDate
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
    const { studentName, studentEmail, studentPhone, foodPreference, bypassClash, paymentStatus, upiTransactionId, quantity: qtyInput, bookedBy } = req.body;
    
    if (!studentName || !studentEmail || !studentPhone) {
      return res.status(400).json({ message: 'Name, email, and phone number are required' });
    }
    
    const quantity = parseInt(qtyInput, 10) || 1;
    if (quantity < 1 || quantity > 5) {
      return res.status(400).json({ message: 'Invalid ticket quantity. You can book between 1 and 5 tickets.' });
    }
    
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // 0. Check Registration Deadline (custom dueDate or 1 day prior fallback)
    const today = new Date();
    let dueDate;
    if (event.dueDate) {
      dueDate = new Date(event.dueDate);
      dueDate.setHours(23, 59, 59, 999);
    } else {
      const eventDate = new Date(event.date);
      dueDate = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
      dueDate.setUTCHours(23, 59, 59, 999);
    }
    
    if (today > dueDate) {
      const formattedDueDate = dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      return res.status(400).json({ 
        message: `Registration Closed: The deadline to register was ${formattedDueDate}.` 
      });
    }
    
    // 1. Check capacity
    const regCount = await Registration.countDocuments({ eventId });
    if (regCount >= event.capacity || regCount + quantity > event.capacity) {
      return res.status(400).json({ message: 'Event is full. Cannot book.' });
    }
    
    const emailLower = studentEmail.trim().toLowerCase();
    
    // 2. Check ticket quota for this student name / email (limit to 5)
    const studentBookingsCount = await Registration.countDocuments({ 
      eventId,
      $or: [
        { studentName: { $regex: new RegExp('^' + studentName.trim() + '$', 'i') } },
        { studentEmail: emailLower }
      ]
    });
    if (studentBookingsCount >= 5 || studentBookingsCount + quantity > 5) {
      return res.status(400).json({ message: 'You cannot book more than 5 tickets.' });
    }
    
    // 3. Clash Detection Logic
    const studentRegistrations = await Registration.find({ studentEmail: emailLower }).populate('eventId');
    if (!bypassClash) {
      for (const reg of studentRegistrations) {
        const regEvent = reg.eventId;
        if (!regEvent || regEvent._id.toString() === event._id.toString()) continue;
        
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

    const createdRegistrations = [];

    // 5. Create Q registrations in a loop
    for (let i = 0; i < quantity; i++) {
      const registration = new Registration({
        eventId,
        studentName: studentName.trim(),
        studentEmail: emailLower,
        studentPhone: studentPhone.trim(),
        foodPreference: foodPreference || 'none',
        checkedIn: false,
        qrCode: 'PENDING',
        paymentStatus: finalPaymentStatus,
        upiTransactionId: finalUpiTxId,
        bookedBy: bookedBy ? bookedBy.trim() : undefined
      });
      
      const qrData = JSON.stringify({
        registrationId: registration._id,
        eventId: event._id
      });
      
      const qrCodeDataUrl = await QRCode.toDataURL(qrData);
      registration.qrCode = qrCodeDataUrl;
      
      await registration.save();
      createdRegistrations.push(registration);
    }
    
    // Log activity
    try {
      const activity = new Activity({
        userName: studentName.trim(),
        userEmail: emailLower,
        activityType: 'REGISTER_EVENT',
        description: `Booked ${quantity} ticket(s) for event: '${event.title}'`
      });
      await activity.save();
    } catch (err) {
      console.warn('Activity log failed:', err.message);
    }
    
    res.status(201).json({
      ...createdRegistrations[0].toObject(),
      message: 'Registration successful',
      registrations: createdRegistrations
    });
  } catch (error) {
    res.status(500).json({ message: 'Error registering student', error: error.message });
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
    const { studentName, bookedBy } = req.query;
    if (!studentName && !bookedBy) {
      return res.status(400).json({ message: 'studentName or bookedBy is required.' });
    }
    
    const query = {};
    if (bookedBy) {
      query.bookedBy = bookedBy.trim();
    } else {
      query.studentName = { $regex: new RegExp('^' + studentName.trim() + '$', 'i') };
    }
    
    const registrations = await Registration.find(query).populate('eventId');
    
    // Filter: Only visible UNTIL the program ends
    const activeRegistrations = registrations.filter(reg => {
      if (!reg.eventId) return false;
      const today = new Date();
      const eventDate = new Date(reg.eventId.date);
      // Set to 23:59:59 of event day so it is visible throughout the day of the event
      const eventEndDate = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 23, 59, 59, 999);
      return today <= eventEndDate;
    });
    
    res.json(activeRegistrations);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving your bookings', error: error.message });
  }
};

