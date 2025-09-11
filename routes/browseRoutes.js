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

// GET route to display all job seeker profiles with search and filters
router.get('/company/browse_developers', isCompany, async (req, res) => {
    const { skills, role, location } = req.query; // Get query parameters

    let query = `
        SELECT 
            user_id, profile_picture, name, role, skills, work_preferences, location 
        FROM job_seeker_profiles
    `;

    const queryParams = [];
    const whereClauses = [];

    // Dynamically build the WHERE clause based on filters
    if (skills) {
        whereClauses.push(`FIND_IN_SET(?, skills)`);
        queryParams.push(skills.split(',')[0].trim());
    }
    if (role) {
        whereClauses.push(`role = ?`);
        queryParams.push(role);
    }
    if (location) {
        whereClauses.push(`location = ?`);
        queryParams.push(location);
    }

    if (whereClauses.length > 0) {
        query += ` WHERE ` + whereClauses.join(' AND ');
    }
    
    try {
        const [profiles] = await db.query(query, queryParams);
        res.render('browse_developers', {
            title: 'Browse Developers',
            profiles: profiles,
            // Pass the filter values back to the view to pre-fill the form
            filters: { skills, role, location }
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

        // Get company name for the notification
        const [companyRows] = await db.query('SELECT company_name FROM company_profiles WHERE user_id = ?', [companyId]);
        const companyName = companyRows[0].company_name;

        // Create a notification for the developer
        await db.query(
            'INSERT INTO notifications (user_id, message, related_url) VALUES (?, ?, ?)',
            [jobSeekerId, `${companyName} has sent you a new job request for the role of ${role}.`, `/job_seeker/requests`]
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


// GET route to view applicants for a specific job
router.get('/company/job_applicants/:jobId', isCompany, async (req, res) => {
    const jobId = req.params.jobId;
    const companyId = req.session.user.id;

    try {
        const [jobListingRows] = await db.query('SELECT role FROM job_listings WHERE id = ? AND company_id = ?', [jobId, companyId]);
        const jobListing = jobListingRows[0];
        if (!jobListing) {
            return res.status(404).send('Job listing not found or you do not have permission to view it.');
        }

        const [applicants] = await db.query(
            `SELECT 
                a.status, a.created_at, a.job_seeker_id as user_id,
                jsp.profile_picture, jsp.name, jsp.role, jsp.skills
            FROM applications AS a
            JOIN job_seeker_profiles AS jsp ON a.job_seeker_id = jsp.user_id
            WHERE a.job_id = ?`,
            [jobId]
        );
        
        // Corrected line: Passing jobId to the view
        res.render('job_applicants', {
            title: `Applicants for ${jobListing.role}`,
            jobListing: jobListing,
            applicants: applicants,
            jobId: jobId
        });

    } catch (error) {
        console.error('Error fetching job applicants:', error);
        res.status(500).send('An error occurred while fetching job applicants.');
    }
});


// New POST route to handle scheduling an interview with an applicant
router.post('/company/schedule_interview/:jobId/:applicantId', isCompany, async (req, res) => {
    const jobId = req.params.jobId;
    const applicantId = req.params.applicantId;
    const companyId = req.session.user.id;

    try {
        const [jobRows] = await db.query('SELECT id FROM job_listings WHERE id = ? AND company_id = ?', [jobId, companyId]);
        if (jobRows.length === 0) {
            return res.status(403).send('Permission denied.');
        }

        await db.query(
            'UPDATE applications SET status = ? WHERE job_id = ? AND job_seeker_id = ?',
            ['interview_scheduled', jobId, applicantId]
        );

        res.redirect(`/company/job_applicants/${jobId}`);
    } catch (error) {
        console.error('Error scheduling interview:', error);
        res.status(500).send('Failed to schedule interview.');
    }
});


module.exports = router;