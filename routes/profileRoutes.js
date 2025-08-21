// routes/profileRoutes.js

const express = require('express');
const router = express.Router();
const db = require('../db/db');
const multer = require('multer');
const path = require('path');

// Middleware to check if the user is authenticated
function requireLogin(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/auth/login');
    }
}

// Multer Storage Configurations
// --------------------------------------------------

// Configure multer for developer profile pictures
const developerStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images/developer_pictures/'); // Destination folder
    },
    filename: function (req, file, cb) {
        // Create a unique file name
        cb(null, 'developer_' + Date.now() + path.extname(file.originalname));
    }
});
const uploadDeveloper = multer({ storage: developerStorage });

// Configure multer for company logos
const companyStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images/company_logos/'); // Destination folder
    },
    filename: function (req, file, cb) {
        // Create a unique file name
        cb(null, 'company_logo_' + Date.now() + path.extname(file.originalname));
    }
});
const uploadCompany = multer({ storage: companyStorage });

// Profile Routes
// --------------------------------------------------

// GET route to show the job seeker profile creation form
router.get('/job_seeker/create_profile', requireLogin, (req, res) => {
    if (req.session.user.role === 'job_seeker') {
        res.render('create_job_seeker_profile', { title: 'Create Profile' });
    } else {
        res.status(403).send("Access Denied");
    }
});

// POST route to handle job seeker profile form submission with file upload
router.post('/job_seeker/create_profile', requireLogin, uploadDeveloper.single('profile_picture'), async (req, res) => {
    const { name, role, skills, work_preferences, certifications, projects, experience, location, resume_url } = req.body;
    const profile_picture = req.file ? '/images/developer_pictures/' + req.file.filename : null; // Get file path
    const user_id = req.session.user.id;

    try {
        const [result] = await db.query(
            'INSERT INTO job_seeker_profiles (user_id, profile_picture, name, role, skills, work_preferences, certifications, projects, experience, location, resume_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [user_id, profile_picture, name, role, skills, work_preferences, certifications, projects, experience, location, resume_url]
        );
        console.log('Job seeker profile created:', result);
        res.redirect('/job_seeker/dashboard');
    } catch (error) {
        console.error('Error creating job seeker profile:', error);
        res.status(500).send('Profile creation failed.');
    }
});

// GET route to show the company profile creation form
router.get('/company/create_profile', requireLogin, (req, res) => {
    if (req.session.user.role === 'company') {
        res.render('create_company_profile', { title: 'Create Company Profile' });
    } else {
        res.status(403).send("Access Denied");
    }
});

// POST route to handle company profile form submission with file upload
router.post('/company/create_profile', requireLogin, uploadCompany.single('company_logo'), async (req, res) => {
    const { company_name, founding_details, about } = req.body;
    const company_logo = req.file ? '/images/company_logos/' + req.file.filename : null; // Get file path
    const user_id = req.session.user.id;

    try {
        const [result] = await db.query(
            'INSERT INTO company_profiles (user_id, company_logo, company_name, founding_details, about) VALUES (?, ?, ?, ?, ?)',
            [user_id, company_logo, company_name, founding_details, about]
        );
        console.log('Company profile created:', result);
        res.redirect('/company/dashboard');
    } catch (error) {
        console.error('Error creating company profile:', error);
        res.status(500).send('Profile creation failed.');
    }
});

module.exports = router;