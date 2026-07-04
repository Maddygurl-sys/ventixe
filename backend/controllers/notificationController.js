const Notification = require('../models/Notification');
const Event = require('../models/Event');
const Activity = require('../models/Activity');

// GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ message: 'Username is required.' });
    }

    const recipient = username.trim().toLowerCase() === 'admin' ? 'admin' : username.trim().toLowerCase();
    
    const notifications = await Notification.find({ recipient })
      .populate('relatedEvent')
      .sort({ createdAt: -1 })
      .limit(30);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
};

// POST /api/notifications/:id/respond
exports.respondToRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' or 'decline'

    if (!action || !['approve', 'decline'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Must be approve or decline.' });
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    const event = await Event.findById(notification.relatedEvent);
    if (!event) {
      return res.status(404).json({ message: 'Associated event not found.' });
    }

    if (action === 'approve') {
      event.status = 'approved';
      await event.save();

      notification.status = 'approved';
      notification.isRead = true;
      await notification.save();

      // Notify the user
      const userNotification = new Notification({
        recipient: event.createdBy,
        sender: 'admin',
        type: 'EVENT_APPROVED',
        title: 'Event Approved',
        message: `Your event "${event.title}" has been approved!`,
        relatedEvent: event._id,
        status: 'approved'
      });
      await userNotification.save();

      // Log activity
      try {
        const activity = new Activity({
          userName: 'Admin',
          userEmail: 'admin',
          activityType: 'REGISTER_EVENT',
          description: `Approved user event: '${event.title}'`
        });
        await activity.save();
      } catch (err) {
        console.warn('Activity log failed:', err.message);
      }
    } else {
      event.status = 'declined';
      await event.save();

      notification.status = 'declined';
      notification.isRead = true;
      await notification.save();

      // Notify the user
      const userNotification = new Notification({
        recipient: event.createdBy,
        sender: 'admin',
        type: 'EVENT_DECLINED',
        title: 'Event Declined',
        message: `Your event "${event.title}" was declined by the Admin.`,
        relatedEvent: event._id,
        status: 'declined'
      });
      await userNotification.save();

      // Log activity
      try {
        const activity = new Activity({
          userName: 'Admin',
          userEmail: 'admin',
          activityType: 'REGISTER_EVENT',
          description: `Declined user event: '${event.title}'`
        });
        await activity.save();
      } catch (err) {
        console.warn('Activity log failed:', err.message);
      }
    }

    res.json({ message: `Event ${action}d successfully.`, event });
  } catch (error) {
    res.status(500).json({ message: 'Error responding to event request', error: error.message });
  }
};

// POST /api/notifications/clear
exports.clearNotifications = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ message: 'Username is required.' });
    }

    const recipient = username.trim().toLowerCase() === 'admin' ? 'admin' : username.trim().toLowerCase();

    // Mark as read or delete
    await Notification.deleteMany({ recipient });

    res.json({ message: 'Notifications cleared successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error clearing notifications', error: error.message });
  }
};
