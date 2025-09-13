// routes/messagingRoutes.js

const express = require('express');
const router = express.Router();
const db = require('../db/db');

function requireLogin(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/auth/login');
    }
}

// GET route to show the user's conversation list
router.get('/messages', requireLogin, async (req, res) => {
    const userId = req.session.user.id;
    try {
        const [conversations] = await db.query(
            `SELECT 
                c.id, c.last_updated, u.id AS partner_id, jsp.name AS partner_name, jsp.profile_picture AS partner_picture
            FROM conversations AS c
            JOIN users AS u ON u.id = CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END
            JOIN job_seeker_profiles AS jsp ON jsp.user_id = u.id
            WHERE c.user1_id = ? OR c.user2_id = ?
            ORDER BY c.last_updated DESC`,
            [userId, userId, userId]
        );
        res.render('conversation_list', { title: 'Messages', conversations: conversations });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).send('An error occurred.');
    }
});

// GET route to show a specific conversation
router.get('/messages/:partnerId', requireLogin, async (req, res) => {
    const userId = req.session.user.id;
    const partnerId = req.params.partnerId;
    try {
        // Find or create the conversation
        let [conversationRows] = await db.query(
            'SELECT id FROM conversations WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)',
            [userId, partnerId, partnerId, userId]
        );

        if (conversationRows.length === 0) {
            await db.query('INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)', [userId, partnerId]);
            [conversationRows] = await db.query(
                'SELECT id FROM conversations WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)',
                [userId, partnerId, partnerId, userId]
            );
        }
        const conversationId = conversationRows[0].id;

        // Fetch messages in the conversation
        const [messages] = await db.query(
            'SELECT sender_id, body, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
            [conversationId]
        );

        // Fetch partner's name
        const [partnerRows] = await db.query('SELECT name FROM job_seeker_profiles WHERE user_id = ?', [partnerId]);
        const partnerName = partnerRows[0].name;

        res.render('chat_interface', {
            title: `Chat with ${partnerName}`,
            messages: messages,
            partnerId: partnerId,
            partnerName: partnerName,
            userId: userId
        });
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).send('An error occurred.');
    }
});

// POST route to send a new message
router.post('/messages/:partnerId', requireLogin, async (req, res) => {
    const userId = req.session.user.id;
    const partnerId = req.params.partnerId;
    const { messageBody } = req.body;

    try {
        const [conversationRows] = await db.query(
            'SELECT id FROM conversations WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)',
            [userId, partnerId, partnerId, userId]
        );

        if (conversationRows.length === 0) {
            return res.status(404).send('Conversation not found.');
        }

        const conversationId = conversationRows[0].id;
        await db.query(
            'INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)',
            [conversationId, userId, messageBody]
        );

        res.redirect(`/messages/${partnerId}`);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).send('Failed to send message.');
    }
});

module.exports = router;