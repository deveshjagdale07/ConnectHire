// routes/dashboardRoutes.js

const express = require('express');
const router = express.Router();

// Middleware to check if the user is authenticated
function requireLogin(req, res, next) {
    if (req.session.user) {
        next(); // User is authenticated, proceed to the next middleware or route handler
    } else {
        res.redirect('/auth/login'); // Not authenticated, redirect to login page
    }
}
// Job Seeker Dashboard
router.get('/job_seeker/dashboard', requireLogin, (req, res) => {
    if (req.session.user.role === 'job_seeker') {
        res.render('job_seeker_dashboard', { 
            title: 'Job Seeker Dashboard',
            user: req.session.user // Pass the user object to the view
        });
    } else {
        res.status(403).send("Access Denied");
    }
});


// Company Dashboard
router.get('/company/dashboard', requireLogin, (req, res) => {
    if (req.session.user.role === 'company') {
        res.render('company_dashboard', { 
            title: 'Company Dashboard',
            user: req.session.user // Pass the user object to the view
        });
    } else {
        res.status(403).send("Access Denied");
    }
});
// Admin Dashboard
router.get('/admin/dashboard', requireLogin, (req, res) => {
    if (req.session.user.role === 'admin') {
        res.render('admin_dashboard', { title: 'Admin Dashboard' });
    } else {
        res.status(403).send("Access Denied");
    }
});

module.exports = router;