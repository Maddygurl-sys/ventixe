const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');

router.get('/', eventController.listEvents);
router.post('/', eventController.createEvent);
router.get('/my-events', eventController.listMyEvents);
router.get('/my-bookings/list', eventController.listMyBookings);
router.get('/:id', eventController.getEvent);
router.post('/:id/register', eventController.registerStudent);
router.get('/:id/registrations', eventController.listRegistrations);
router.delete('/:id', eventController.deleteEvent);

module.exports = router;
