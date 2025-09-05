// routes/browseRoutes.js

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

// GET route to display all job seeker profiles
router.get('/company/browse_developers', isCompany, async (req, res) => {
    try {
        // Fetch all job seeker profiles from the database
        const [profiles] = await db.query('SELECT user_id, profile_picture, name, role, skills, work_preferences, location FROM job_seeker_profiles');

        res.render('browse_developers', { 
            title: 'Browse Developers',
            profiles: profiles
        });
    } catch (error) {
        console.error('Error fetching developer profiles:', error);
        res.status(500).send('An error occurred while fetching profiles.');
    }
});
// GET route to show the job request form
router.get('/company/request_job/:id', isCompany, async (req, res) => {
    const jobSeekerId = req.params.id;
    try {
        const [rows] = await db.query('SELECT name FROM job_seeker_profiles WHERE user_id = ?', [jobSeekerId]);
        const developer = rows[0];

        if (developer) {
            res.render('job_request_form', {
                title: 'Send Job Request',
                developer: developer,
                jobSeekerId: jobSeekerId
            });
        } else {
            res.status(404).send('Developer not found.');
        }
    } catch (error) {
        console.error('Error fetching developer info for request form:', error);
        res.status(500).send('An error occurred.');
    }
});
// POST route to handle job request form submission
router.post('/company/submit_request', isCompany, async (req, res) => {
    const { jobSeekerId, role, compensation, duration, job_type, location } = req.body;
    const companyId = req.session.user.id;

    try {
        await db.query(
            'INSERT INTO job_requests (company_id, job_seeker_id, role, compensation, duration, job_type, location) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [companyId, jobSeekerId, role, compensation, duration, job_type, location]
        );
        res.redirect('/company/dashboard');
    } catch (error) {
        console.error('Error submitting job request:', error);
        res.status(500).send('Failed to submit job request.');
    }
});
module.exports = router;