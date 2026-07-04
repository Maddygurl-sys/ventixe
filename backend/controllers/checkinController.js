const Registration = require('../models/Registration');
const Event = require('../models/Event');
const Activity = require('../models/Activity');

// POST /api/checkin/:registrationId
exports.checkinStudent = async (req, res) => {
  try {
    const { registrationId } = req.params;
    
    const registration = await Registration.findById(registrationId).populate('eventId');
    if (!registration) {
      return res.status(404).json({ message: 'Registration check-in failed: Ticket not found' });
    }
    
    if (registration.checkedIn) {
      return res.status(400).json({
        alreadyCheckedIn: true,
        message: `Already Checked In: ${registration.studentName} has already checked into '${registration.eventId?.title || 'this event'}'.`
      });
    }
    
    registration.checkedIn = true;
    await registration.save();
    
    // Log activity
    try {
      const activity = new Activity({
        userName: registration.studentName,
        userEmail: registration.studentEmail,
        activityType: 'CHECKIN',
        description: `Checked in at terminal for event: '${registration.eventId?.title || 'Unknown Event'}'`
      });
      await activity.save();
    } catch (e) {
      console.warn("Failed to log checkin activity:", e);
    }
    
    res.json({
      message: `Successfully checked in ${registration.studentName} for '${registration.eventId?.title || 'the event'}'.`,
      registration
    });
  } catch (error) {
    res.status(500).json({ message: 'Error performing check-in', error: error.message });
  }
};
