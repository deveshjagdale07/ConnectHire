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

// GET route to display all job listings for job seekers
router.get('/job_seeker/browse_jobs', isJobSeeker, async (req, res) => {
    const jobSeekerId = req.session.user.id;
    try {
        const [listings] = await db.query(
            `SELECT 
                jl.id, jl.role, jl.compensation, jl.job_type, jl.duration, jl.location, jl.description, jl.created_at, 
                cp.company_name, cp.company_logo,
                a.id AS application_id
            FROM job_listings AS jl
            JOIN company_profiles AS cp ON jl.company_id = cp.user_id
            LEFT JOIN applications AS a ON jl.id = a.job_id AND a.job_seeker_id = ?`,
            [jobSeekerId]
        );
        res.render('browse_job_listings', {
            title: 'Browse Job Listings',
            listings: listings
        });
    } catch (error) {
        console.error('Error fetching job listings:', error);
        res.status(500).send('An error occurred while fetching job listings.');
    }
});

// POST route to handle job applications
router.post('/job_seeker/apply_job/:id', isJobSeeker, async (req, res) => {
    const jobId = req.params.id;
    const jobSeekerId = req.session.user.id;

    try {
        await db.query(
            'INSERT INTO applications (job_seeker_id, job_id) VALUES (?, ?)',
            [jobSeekerId, jobId]
        );
        res.redirect('/job_seeker/browse_jobs'); // Corrected redirect
    } catch (error) {
        console.error('Error applying for job:', error);
        res.status(500).send('Failed to apply for the job.');
    }
});

// GET route to display all applications submitted by a job seeker
router.get('/job_seeker/my_applications', isJobSeeker, async (req, res) => {
    const jobSeekerId = req.session.user.id;
    try {
        const [applications] = await db.query(
            `SELECT 
                a.status, a.created_at,
                jl.role AS job_role, jl.location AS job_location, jl.compensation AS job_compensation,
                cp.company_name, cp.company_logo
            FROM applications AS a
            JOIN job_listings AS jl ON a.job_id = jl.id
            JOIN company_profiles AS cp ON jl.company_id = cp.user_id
            WHERE a.job_seeker_id = ?`,
            [jobSeekerId]
        );
        res.render('my_applications', {
            title: 'My Applications',
            applications: applications
        });
    } catch (error) {
        console.error('Error fetching job applications:', error);
        res.status(500).send('An error occurred while fetching your applications.');
    }
});

module.exports = router;