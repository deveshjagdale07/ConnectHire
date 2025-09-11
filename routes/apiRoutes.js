// routes/apiRoutes.js

const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET all job listings as JSON
router.get('/jobs', async (req, res) => {
    try {
        const [jobs] = await db.query('SELECT * FROM job_listings');
        res.json(jobs);
    } catch (error) {
        console.error('Error fetching jobs API:', error);
        res.status(500).json({ error: 'Failed to fetch job listings.' });
    }
});

// GET a single job listing by ID as JSON
router.get('/jobs/:id', async (req, res) => {
    const jobId = req.params.id;
    try {
        const [job] = await db.query('SELECT * FROM job_listings WHERE id = ?', [jobId]);
        if (job.length > 0) {
            res.json(job[0]);
        } else {
            res.status(404).json({ error: 'Job not found.' });
        }
    } catch (error) {
        console.error('Error fetching job API:', error);
        res.status(500).json({ error: 'Failed to fetch job.' });
    }
});

// GET all developer profiles as JSON
router.get('/developers', async (req, res) => {
    try {
        const [developers] = await db.query('SELECT user_id, name, role, skills FROM job_seeker_profiles');
        res.json(developers);
    } catch (error) {
        console.error('Error fetching developers API:', error);
        res.status(500).json({ error: 'Failed to fetch developers.' });
    }
});

// GET a single developer profile by ID as JSON
router.get('/developers/:id', async (req, res) => {
    const developerId = req.params.id;
    try {
        const [developer] = await db.query('SELECT user_id, name, role, skills FROM job_seeker_profiles WHERE user_id = ?', [developerId]);
        if (developer.length > 0) {
            res.json(developer[0]);
        } else {
            res.status(404).json({ error: 'Developer not found.' });
        }
    } catch (error) {
        console.error('Error fetching developer API:', error);
        res.status(500).json({ error: 'Failed to fetch developer.' });
    }
});

module.exports = router;