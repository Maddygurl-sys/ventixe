const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const notificationController = require('../controllers/notificationController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/activities', authController.getActivities);

// Notification routes
router.get('/notifications', notificationController.getNotifications);
router.post('/notifications/:id/respond', notificationController.respondToRequest);
router.post('/notifications/clear', notificationController.clearNotifications);

module.exports = router;
