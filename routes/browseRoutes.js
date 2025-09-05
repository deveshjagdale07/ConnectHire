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


// GET route to show the company job posting form
router.get('/company/post_job', isCompany, (req, res) => {
    res.render('post_job_form', { title: 'Post a New Job' });
});

// POST route to handle job post form submission
router.post('/company/post_job', isCompany, async (req, res) => {
    const { role, compensation, job_type, duration, location, description } = req.body;
    const company_id = req.session.user.id;
    try {
        await db.query(
            'INSERT INTO job_listings (company_id, role, compensation, job_type, duration, location, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [company_id, role, compensation, job_type, duration, location, description]
        );
        res.redirect('/company/dashboard');
    } catch (error) {
        console.error('Error posting job:', error);
        res.status(500).send('Failed to post job.');
    }
});

// GET route to view all of a company's job listings
router.get('/company/my_listings', isCompany, async (req, res) => {
    const company_id = req.session.user.id;
    try {
        const [listings] = await db.query('SELECT * FROM job_listings WHERE company_id = ?', [company_id]);
        res.render('my_job_listings', {
            title: 'My Job Listings',
            listings: listings
        });
    } catch (error) {
        console.error('Error fetching job listings:', error);
        res.status(500).send('Failed to fetch job listings.');
    }
});


// New GET route to view applicants for a specific job
router.get('/company/job_applicants/:jobId', isCompany, async (req, res) => {
    const jobId = req.params.jobId;
    const companyId = req.session.user.id;

    try {
        // Fetch the job listing details to display on the page
        const [jobListingRows] = await db.query('SELECT role FROM job_listings WHERE id = ? AND company_id = ?', [jobId, companyId]);
        const jobListing = jobListingRows[0];

        if (!jobListing) {
            return res.status(404).send('Job listing not found or you do not have permission to view it.');
        }

        // Fetch all applications for this job, along with job seeker profile details
        const [applicants] = await db.query(
            `SELECT 
                a.status, a.created_at, 
                jsp.user_id, jsp.profile_picture, jsp.name, jsp.role, jsp.skills
            FROM applications AS a
            JOIN job_seeker_profiles AS jsp ON a.job_seeker_id = jsp.user_id
            WHERE a.job_id = ?`,
            [jobId]
        );

        res.render('job_applicants', {
            title: `Applicants for ${jobListing.role}`,
            jobListing: jobListing,
            applicants: applicants
        });

    } catch (error) {
        console.error('Error fetching job applicants:', error);
        res.status(500).send('An error occurred while fetching job applicants.');
    }
});


module.exports = router;