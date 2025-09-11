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

// GET route to display all job listings for job seekers with search and filters
router.get('/job_seeker/browse_jobs', isJobSeeker, async (req, res) => {
    const jobSeekerId = req.session.user.id;
    const { role, job_type, location } = req.query;

    let query = `
        SELECT 
            jl.id, jl.role, jl.compensation, jl.job_type, jl.duration, jl.location, jl.description, jl.created_at, 
            cp.company_name, cp.company_logo,
            a.id AS application_id
        FROM job_listings AS jl
        JOIN company_profiles AS cp ON jl.company_id = cp.user_id
        LEFT JOIN applications AS a ON jl.id = a.job_id AND a.job_seeker_id = ?
    `;

    const queryParams = [jobSeekerId];
    const whereClauses = [];

    if (role) {
        whereClauses.push(`jl.role LIKE ?`);
        queryParams.push(`%${role}%`);
    }
    if (job_type) {
        whereClauses.push(`jl.job_type = ?`);
        queryParams.push(job_type);
    }
    if (location) {
        whereClauses.push(`jl.location = ?`);
        queryParams.push(location);
    }

    if (whereClauses.length > 0) {
        query += ` WHERE ` + whereClauses.join(' AND ');
    }
    
    try {
        const [listings] = await db.query(query, queryParams);
        res.render('browse_job_listings', {
            title: 'Browse Job Listings',
            listings: listings,
            filters: { role, job_type, location }
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
        
        const [jobRows] = await db.query('SELECT company_id FROM job_listings WHERE id = ?', [jobId]);
        const companyId = jobRows[0].company_id;
        
        const [applicantRows] = await db.query('SELECT name FROM job_seeker_profiles WHERE user_id = ?', [jobSeekerId]);
        const applicantName = applicantRows[0].name;

        await db.query(
            'INSERT INTO notifications (user_id, message, related_url) VALUES (?, ?, ?)',
            [companyId, `${applicantName} has applied to your job listing.`, `/company/job_applicants/${jobId}`]
        );

        res.redirect('/job_seeker/browse_jobs');
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