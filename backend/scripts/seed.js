const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Event = require('../models/Event');

dotenv.config();

const events = [
  {
    title: 'Arohan',
    description: 'Annual cultural fest with dance, music, and drama competitions.',
    date: new Date('2026-07-15T00:00:00Z'),
    time: '09:00 - 18:00',
    venue: 'Main Auditorium',
    capacity: 200,
    createdBy: 'Organiser',
    foodMenu: 'Samosa, Veg Biryani, Ice Cream',
    coordinatorName: 'Aman Preet',
    coordinatorPhone: '+91 91234 56789'
  },
  {
    title: 'Tiny Tans',
    description: "Freshers' welcome party for the new batch.",
    date: new Date('2026-07-16T00:00:00Z'),
    time: '16:00 - 20:00',
    venue: 'Open Air Theatre',
    capacity: 150,
    createdBy: 'Organiser',
    foodMenu: 'Cupcakes, Soft Drinks',
    coordinatorName: 'Ananya Roy',
    coordinatorPhone: '+91 96789 01234'
  },
  {
    title: 'Code Red',
    description: '24-hour coding and hackathon competition.',
    date: new Date('2026-07-20T00:00:00Z'),
    time: '10:00 - 22:00',
    venue: 'CS Seminar Hall',
    capacity: 80,
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
    date: new Date('2026-07-22T00:00:00Z'),
    time: '18:00 - 21:00',
    venue: 'College Amphitheatre',
    capacity: 60,
    createdBy: 'Organiser',
    foodMenu: 'None',
    coordinatorName: 'Sneha Sen',
    coordinatorPhone: '+91 93456 78901'
  },
  {
    title: 'Plate Tales',
    description: 'Food festival with stalls and cooking competitions.',
    date: new Date('2026-07-25T00:00:00Z'),
    time: '11:00 - 16:00',
    venue: 'Main Lawn',
    capacity: 250,
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
    date: new Date('2026-07-30T00:00:00Z'),
    time: '15:00 - 19:00',
    venue: 'Silver Jubilee Hall',
    capacity: 100,
    createdBy: 'Organiser',
    foodMenu: 'Mocktails, Pulao, Paneer Curry',
    coordinatorName: 'Divya Iyer',
    coordinatorPhone: '+91 94567 89012'
  }
];

async function seedDatabase() {
  try {
    let uri = process.env.MONGODB_URI;
    if (!uri || uri === 'memory') {
      uri = 'mongodb://127.0.0.1:27017/event-management';
    }
    
    console.log(`Connecting to database at ${uri}...`);
    await mongoose.connect(uri);
    
    // Clear existing events
    await Event.deleteMany({});
    console.log('Cleared existing events.');
    
    // Insert seed events
    const insertedEvents = await Event.insertMany(events);
    console.log(`Successfully seeded ${insertedEvents.length} events!`);
    
    await mongoose.disconnect();
    console.log('Database disconnected.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error.message);
    process.exit(1);
  }
}

seedDatabase();
