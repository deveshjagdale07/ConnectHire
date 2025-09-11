// routes/notificationRoutes.js

const express = require('express');
const router = express.Router();
const db = require('../db/db');

// Middleware to ensure a user is logged in
function requireLogin(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/auth/login');
    }
}

// GET route to fetch all notifications for the logged-in user
router.get('/notifications', requireLogin, async (req, res) => {
    const userId = req.session.user.id;
    try {
        const [notifications] = await db.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        res.render('notifications', {
            title: 'Notifications',
            notifications: notifications
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).send('An error occurred.');
    }
});

// POST route to mark a notification as read
router.post('/notifications/mark_as_read/:id', requireLogin, async (req, res) => {
    const notificationId = req.params.id;
    const userId = req.session.user.id;
    try {
        await db.query('UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [notificationId, userId]);
        res.redirect('/notifications');
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).send('An error occurred.');
    }
});

module.exports = router;