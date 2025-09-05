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

// Shared storage for profile pictures and resumes
const jobSeekerStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === 'profile_picture') {
            cb(null, 'public/images/developer_pictures/');
        } else if (file.fieldname === 'resume_file') {
            cb(null, 'public/resumes/');
        } else {
            cb(new Error('Invalid fieldname'));
        }
    },
    filename: function (req, file, cb) {
        if (file.fieldname === 'profile_picture') {
            cb(null, 'developer_' + Date.now() + path.extname(file.originalname));
        } else if (file.fieldname === 'resume_file') {
            cb(null, 'resume_' + req.session.user.id + '_' + Date.now() + path.extname(file.originalname));
        }
    }
});

const uploadJobSeekerFiles = multer({
    storage: jobSeekerStorage,
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'resume_file' && file.mimetype !== 'application/pdf') {
            cb(null, false);
            req.fileValidationError = 'Only PDF files are allowed for the resume.';
        } else {
            cb(null, true);
        }
    }
});

// Configure multer for company logos
const companyStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images/company_logos/');
    },
    filename: function (req, file, cb) {
        cb(null, 'company_logo_' + Date.now() + path.extname(file.originalname));
    }
});
const uploadCompany = multer({ storage: companyStorage });

// Configure multer for certificates
const certificateStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images/certificates/');
    },
    filename: function (req, file, cb) {
        cb(null, 'certificate_' + Date.now() + path.extname(file.originalname));
    }
});
const uploadCertificate = multer({ storage: certificateStorage });

// A simple function to calculate a profile completion percentage
function calculateCompletion(profile) {
    const fields = ['name', 'role', 'skills', 'work_preferences', 'projects', 'experience', 'location', 'resume_url'];
    let completedFields = 0;
    fields.forEach(field => {
        if (profile[field] && profile[field].length > 0) {
            completedFields++;
        }
    });
    return Math.round((completedFields / fields.length) * 100);
}

// Profile Routes
// --------------------------------------------------

// GET route to show the job seeker profile creation form or existing profile
router.get('/job_seeker/create_profile', requireLogin, async (req, res) => {
    if (req.session.user.role === 'job_seeker') {
        const userId = req.session.user.id;
        try {
            const [profileRows] = await db.query('SELECT * FROM job_seeker_profiles WHERE user_id = ?', [userId]);
            const profile = profileRows[0];
            const [certifications] = await db.query('SELECT * FROM certifications WHERE user_id = ?', [userId]);
            if (profile) {
                const profileCompletion = calculateCompletion(profile);
                res.render('update_job_seeker_profile', {
                    title: 'Update Profile',
                    profile: profile,
                    completion: profileCompletion,
                    certifications: certifications || []
                });
            } else {
                res.render('create_job_seeker_profile', { title: 'Create Profile' });
            }
        } catch (error) {
            console.error('Error fetching job seeker profile:', error);
            res.status(500).send('An error occurred.');
        }
    } else {
        res.status(403).send("Access Denied");
    }
});

// POST route to handle job seeker profile creation with file uploads
router.post('/job_seeker/create_profile', requireLogin, uploadJobSeekerFiles.fields([
    { name: 'profile_picture', maxCount: 1 },
    { name: 'resume_file', maxCount: 1 }
]), async (req, res) => {
    if (req.fileValidationError) {
        return res.status(400).send(req.fileValidationError);
    }
    const { name, role, skills, work_preferences, projects, experience, location } = req.body;
    const profile_picture = req.files && req.files['profile_picture'] ? '/images/developer_pictures/' + req.files['profile_picture'][0].filename : null;
    const resume_url = req.files && req.files['resume_file'] ? '/resumes/' + req.files['resume_file'][0].filename : null;
    const user_id = req.session.user.id;

    try {
        const [result] = await db.query(
            'INSERT INTO job_seeker_profiles (user_id, profile_picture, name, role, skills, work_preferences, projects, experience, location, resume_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [user_id, profile_picture, name, role, skills, work_preferences, projects, experience, location, resume_url]
        );
        console.log('Job seeker profile created:', result);
        res.redirect('/job_seeker/dashboard');
    } catch (error) {
        console.error('Error creating job seeker profile:', error);
        res.status(500).send('Profile creation failed.');
    }
});

// POST route to handle job seeker profile updates
router.post('/job_seeker/update_profile', requireLogin, uploadJobSeekerFiles.fields([
    { name: 'profile_picture', maxCount: 1 },
    { name: 'resume_file', maxCount: 1 }
]), async (req, res) => {
    const { name, role, skills, work_preferences, projects, experience, location } = req.body;
    const userId = req.session.user.id;
    let profile_picture = req.files && req.files['profile_picture'] ? '/images/developer_pictures/' + req.files['profile_picture'][0].filename : null;
    let resume_url = req.files && req.files['resume_file'] ? '/resumes/' + req.files['resume_file'][0].filename : null;

    try {
        if (!profile_picture) {
            const [rows] = await db.query('SELECT profile_picture FROM job_seeker_profiles WHERE user_id = ?', [userId]);
            if (rows.length > 0) {
                profile_picture = rows[0].profile_picture;
            }
        }
        if (!resume_url) {
            const [rows] = await db.query('SELECT resume_url FROM job_seeker_profiles WHERE user_id = ?', [userId]);
            if (rows.length > 0) {
                resume_url = rows[0].resume_url;
            }
        }

        const [result] = await db.query(
            'UPDATE job_seeker_profiles SET profile_picture = ?, name = ?, role = ?, skills = ?, work_preferences = ?, projects = ?, experience = ?, location = ?, resume_url = ? WHERE user_id = ?',
            [profile_picture, name, role, skills, work_preferences, projects, experience, location, resume_url, userId]
        );

        console.log('Job seeker profile updated:', result);
        res.redirect('/job_seeker/dashboard');
    } catch (error) {
        console.error('Error updating job seeker profile:', error);
        res.status(500).send('Profile update failed.');
    }
});

// POST route to add a new certificate
router.post('/job_seeker/add_certificate', requireLogin, uploadCertificate.single('certificate_file'), async (req, res) => {
    const { certificate_name } = req.body;
    const file_url = req.file ? '/images/certificates/' + req.file.filename : null;
    const user_id = req.session.user.id;

    if (!certificate_name || !file_url) {
        return res.status(400).send('Certificate name and file are required.');
    }

    try {
        await db.query(
            'INSERT INTO certifications (user_id, name, file_url) VALUES (?, ?, ?)',
            [user_id, certificate_name, file_url]
        );
        res.redirect('/job_seeker/create_profile');
    } catch (error) {
        console.error('Error adding certificate:', error);
        res.status(500).send('Failed to add certificate.');
    }
});

// POST route to delete a certificate
router.post('/job_seeker/delete_certificate/:id', requireLogin, async (req, res) => {
    const certificateId = req.params.id;
    try {
        await db.query('DELETE FROM certifications WHERE id = ? AND user_id = ?', [certificateId, req.session.user.id]);
        res.redirect('/job_seeker/create_profile');
    } catch (error) {
        console.error('Error deleting certificate:', error);
        res.status(500).send('Failed to delete certificate.');
    }
});

// GET route to show a job seeker's profile
router.get('/job_seeker/profile/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const [userRows] = await db.query('SELECT email FROM users WHERE id = ?', [userId]);
        const user = userRows[0];
        const [profileRows] = await db.query('SELECT * FROM job_seeker_profiles WHERE user_id = ?', [userId]);
        const profile = profileRows[0];
        const [certifications] = await db.query('SELECT * FROM certifications WHERE user_id = ?', [userId]);

        if (profile) {
            res.render('job_seeker_profile', {
                title: 'Job Seeker Profile',
                user: user,
                profile: profile,
                certifications: certifications || []
            });
        } else {
            res.status(404).send("Profile not found.");
        }
    } catch (error) {
        console.error('Error fetching job seeker profile:', error);
        res.status(500).send('An error occurred.');
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
    const company_logo = req.file ? '/images/company_logos/' + req.file.filename : null;
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

// GET route to show a company's profile
router.get('/company/profile/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const [profileRows] = await db.query('SELECT * FROM company_profiles WHERE user_id = ?', [userId]);
        const profile = profileRows[0];
        if (profile) {
            res.render('company_profile', {
                title: 'Company Profile',
                profile: profile
            });
        } else {
            res.status(404).send("Profile not found.");
        }
    } catch (error) {
        console.error('Error fetching company profile:', error);
        res.status(500).send('An error occurred.');
    }
});

// POST route to handle company profile updates
router.post('/company/update_profile', requireLogin, uploadCompany.single('company_logo'), async (req, res) => {
    const { company_name, founding_details, about } = req.body;
    const userId = req.session.user.id;
    let company_logo = req.file ? '/images/company_logos/' + req.file.filename : null;
    try {
        if (!company_logo) {
            const [rows] = await db.query('SELECT company_logo FROM company_profiles WHERE user_id = ?', [userId]);
            if (rows.length > 0) {
                company_logo = rows[0].company_logo;
            }
        }
        const [result] = await db.query(
            'UPDATE company_profiles SET company_logo = ?, company_name = ?, founding_details = ?, about = ? WHERE user_id = ?',
            [company_logo, company_name, founding_details, about, userId]
        );
        console.log('Company profile updated:', result);
        res.redirect('/company/dashboard');
    } catch (error) {
        console.error('Error updating company profile:', error);
        res.status(500).send('Profile update failed.');
    }
});
// GET route to fetch full profile data for a pop-up
router.get('/job_seeker/api/profile/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const [profileRows] = await db.query('SELECT * FROM job_seeker_profiles WHERE user_id = ?', [userId]);
        const profile = profileRows[0];
        const [certifications] = await db.query('SELECT * FROM certifications WHERE user_id = ?', [userId]);

        if (profile) {
            // Send JSON data instead of rendering a view
            res.json({
                profile: profile,
                certifications: certifications || []
            });
        } else {
            res.status(404).json({ error: "Profile not found." });
        }
    } catch (error) {
        console.error('Error fetching API profile:', error);
        res.status(500).json({ error: 'An error occurred.' });
    }
});
module.exports = router;