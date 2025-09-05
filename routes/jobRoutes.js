// routes/jobRoutes.js

const express = require('express');
const router = express.Router();
const db = require('../db/db');

// Middleware to check if the user is a job seeker
function isJobSeeker(req, res, next) {
    if (req.session.user && req.session.user.role === 'job_seeker') {
        next();
    } else {
        res.status(403).send("Access Denied. You must be logged in as a job seeker to view this page.");
    }
}

// GET route to display all job requests for a job seeker
router.get('/job_seeker/requests', isJobSeeker, async (req, res) => {
    const userId = req.session.user.id;
    try {
        const [requests] = await db.query(
            `SELECT 
                jr.id, jr.role, jr.compensation, jr.duration, jr.job_type, jr.location, jr.status, 
                cp.company_name, cp.company_logo
            FROM job_requests AS jr
            JOIN company_profiles AS cp ON jr.company_id = cp.user_id
            WHERE jr.job_seeker_id = ?`, 
            [userId]
        );

        res.render('job_requests', {
            title: 'Your Job Requests',
            requests: requests
        });
    } catch (error) {
        console.error('Error fetching job requests:', error);
        res.status(500).send('An error occurred while fetching your job requests.');
    }
});

module.exports = router;