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

module.exports = router;