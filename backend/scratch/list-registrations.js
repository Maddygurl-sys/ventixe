const mongoose = require('mongoose');
const Registration = require('../models/Registration');
const Event = require('../models/Event');

async function listAll() {
  try {
    let uri = process.env.MONGODB_URI;
    if (!uri || uri === 'memory') {
      uri = 'mongodb://127.0.0.1:27017/event-management';
    }
    await mongoose.connect(uri);

    const registrations = await Registration.find({}).populate('eventId');
    console.log(`--- Total registrations in database: ${registrations.length} ---`);
    registrations.forEach(r => {
      console.log({
        _id: r._id,
        studentName: r.studentName,
        studentEmail: r.studentEmail,
        bookedBy: r.bookedBy,
        eventTitle: r.eventId?.title,
        eventDate: r.eventId?.date,
        eventStatus: r.eventId?.status
      });
    });

    const events = await Event.find({});
    console.log(`\n--- Total events in database: ${events.length} ---`);
    events.forEach(e => {
      console.log({
        _id: e._id,
        title: e.title,
        date: e.date,
        status: e.status,
        createdBy: e.createdBy
      });
    });

    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
  }
}

listAll();
