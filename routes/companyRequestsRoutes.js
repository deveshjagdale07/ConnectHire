// routes/companyRequestsRoutes.js

const express = require('express');
const router = express.Router();
const db = require('../db/db');

// Middleware to check if the user is a company
function isCompany(req, res, next) {
    if (req.session.user && req.session.user.role === 'company') {
        next();
    } else {
        res.status(403).send("Access Denied. You must be logged in as a company to view this page.");
    }
}

// GET route to display sent job requests
router.get('/company/sent_requests', isCompany, async (req, res) => {
    const userId = req.session.user.id;
    try {
        const [requests] = await db.query(
            `SELECT 
                jr.id, jr.role, jr.compensation, jr.duration, jr.job_type, jr.location, jr.status, 
                jsp.name, jsp.profile_picture
            FROM job_requests AS jr
            JOIN job_seeker_profiles AS jsp ON jr.job_seeker_id = jsp.user_id
            WHERE jr.company_id = ?`,
            [userId]
        );
        res.render('company_sent_requests', {
            title: 'Sent Job Requests',
            requests: requests
        });
    } catch (error) {
        console.error('Error fetching sent requests:', error);
        res.status(500).send('An error occurred while fetching your sent requests.');
    }
});

module.exports = router;