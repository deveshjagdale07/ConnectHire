// routes/dashboardRoutes.js

const express = require('express');
const router = express.Router();
const db = require('../db/db');

// Middleware to check if the user is authenticated
function requireLogin(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/auth/login');
    }
}

// Job Seeker Dashboard
router.get('/job_seeker/dashboard', requireLogin, (req, res) => {
    if (req.session.user.role === 'job_seeker') {
        res.render('job_seeker_dashboard', {
            title: 'Job Seeker Dashboard',
            user: req.session.user
        });
    } else {
        res.status(403).send("Access Denied");
    }
});

// POST route to accept a job request
router.post('/job_seeker/accept_request/:id', requireLogin, async (req, res) => {
    const requestId = req.params.id;
    const userId = req.session.user.id;

    try {
        await db.query('UPDATE job_requests SET status = ? WHERE id = ? AND job_seeker_id = ?', ['accepted', requestId, userId]);
        res.redirect('/job_seeker/dashboard');
    } catch (error) {
        console.error('Error accepting job request:', error);
        res.status(500).send('Failed to accept job request.');
    }
});

// POST route to reject a job request
router.post('/job_seeker/reject_request/:id', requireLogin, async (req, res) => {
    const requestId = req.params.id;
    const userId = req.session.user.id;

    try {
        await db.query('UPDATE job_requests SET status = ? WHERE id = ? AND job_seeker_id = ?', ['rejected', requestId, userId]);
        res.redirect('/job_seeker/dashboard');
    } catch (error) {
        console.error('Error rejecting job request:', error);
        res.status(500).send('Failed to reject job request.');
    }
});

// Company Dashboard
router.get('/company/dashboard', requireLogin, (req, res) => {
    if (req.session.user.role === 'company') {
        res.render('company_dashboard', { 
            title: 'Company Dashboard',
            user: req.session.user
        });
    } else {
        res.status(403).send("Access Denied");
    }
});

// Admin Dashboard
// Admin Dashboard
router.get('/admin/dashboard', requireLogin, async (req, res) => {
    if (req.session.user.role === 'admin') {
        try {
            // Fetch all users and all job requests
            const [allUsers] = await db.query('SELECT id, email, role, created_at FROM users');
            const [allJobRequests] = await db.query('SELECT * FROM job_requests');

            // Pass the fetched data to the EJS view
            res.render('admin_dashboard', {
                title: 'Admin Dashboard',
                user: req.session.user,
                allUsers: allUsers,          // <-- This variable must be passed
                allJobRequests: allJobRequests // <-- This variable must be passed
            });
        } catch (error) {
            console.error('Error fetching admin dashboard data:', error);
            res.status(500).send('An error occurred while fetching dashboard data.');
        }
    } else {
        res.status(403).send("Access Denied");
    }
});

// POST route to delete a user
router.post('/admin/delete_user/:id', requireLogin, async (req, res) => {
    if (req.session.user.role === 'admin') {
        const userId = req.params.id;
        try {
            await db.query('DELETE FROM users WHERE id = ?', [userId]);
            res.redirect('/admin/dashboard');
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).send('Failed to delete user.');
        }
    } else {
        res.status(403).send("Access Denied");
    }
});

// POST route to delete a job request
router.post('/admin/delete_request/:id', requireLogin, async (req, res) => {
    if (req.session.user.role === 'admin') {
        const requestId = req.params.id;
        try {
            await db.query('DELETE FROM job_requests WHERE id = ?', [requestId]);
            res.redirect('/admin/dashboard');
        } catch (error) {
            console.error('Error deleting job request:', error);
            res.status(500).send('Failed to delete job request.');
        }
    } else {
        res.status(403).send("Access Denied");
    }
});

module.exports = router;