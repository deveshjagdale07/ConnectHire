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
router.get('/job_seeker/dashboard', requireLogin, async (req, res) => {
    if (req.session.user.role === 'job_seeker') {
        const userId = req.session.user.id;
        try {
            // Fetch user's profile details
            const [profileRows] = await db.query('SELECT name, profile_picture FROM job_seeker_profiles WHERE user_id = ?', [userId]);
            const profile = profileRows[0];

            // Fetch counts for dashboard stats
            const [pendingRequestsCountRows] = await db.query('SELECT COUNT(*) AS count FROM job_requests WHERE job_seeker_id = ? AND status = ?', [userId, 'pending']);
            const [pendingApplicationsCountRows] = await db.query('SELECT COUNT(*) AS count FROM applications WHERE job_seeker_id = ? AND status = ?', [userId, 'pending']);
            const [unreadNotificationsCountRows] = await db.query('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE', [userId]);

            res.render('job_seeker_dashboard', {
                title: 'Job Seeker Dashboard',
                user: req.session.user,
                // Handle the case where the profile might not exist yet
                profile: profile || { name: 'New User', profile_picture: '/images/default_avatar.png' },
                stats: {
                    pendingRequests: pendingRequestsCountRows[0].count,
                    pendingApplications: pendingApplicationsCountRows[0].count,
                    unreadNotifications: unreadNotificationsCountRows[0].count
                }
            });
        } catch (error) {
            console.error('Error fetching job seeker dashboard data:', error);
            res.status(500).send('An error occurred while fetching dashboard data.');
        }
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
        
        const [requestRows] = await db.query('SELECT company_id, role FROM job_requests WHERE id = ?', [requestId]);
        const companyId = requestRows[0].company_id;
        const role = requestRows[0].role;
        const [seekerRows] = await db.query('SELECT name FROM job_seeker_profiles WHERE user_id = ?', [userId]);
        const seekerName = seekerRows[0].name;
        await db.query('INSERT INTO notifications (user_id, message, related_url) VALUES (?, ?, ?)', [companyId, `${seekerName} has accepted your job request for the role of ${role}.`, `/company/sent_requests`]);

        res.redirect('/job_seeker/requests');
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
        
        const [requestRows] = await db.query('SELECT company_id, role FROM job_requests WHERE id = ?', [requestId]);
        const companyId = requestRows[0].company_id;
        const role = requestRows[0].role;
        const [seekerRows] = await db.query('SELECT name FROM job_seeker_profiles WHERE user_id = ?', [userId]);
        const seekerName = seekerRows[0].name;
        await db.query('INSERT INTO notifications (user_id, message, related_url) VALUES (?, ?, ?)', [companyId, `${seekerName} has rejected your job request for the role of ${role}.`, `/company/sent_requests`]);

        res.redirect('/job_seeker/requests');
    } catch (error) {
        console.error('Error rejecting job request:', error);
        res.status(500).send('Failed to reject job request.');
    }
});

// Company Dashboard
// Company Dashboard (Improved)
router.get('/company/dashboard', requireLogin, async (req, res) => {
    if (req.session.user.role === 'company') {
        const userId = req.session.user.id;
        try {
            // Fetch company profile details
            const [profileRows] = await db.query('SELECT company_name, company_logo FROM company_profiles WHERE user_id = ?', [userId]);
            const profile = profileRows[0];
            
            if (!profile) {
                res.render('company_dashboard', {
                    title: 'Company Dashboard',
                    user: req.session.user,
                    profile: { company_name: 'New Company', company_logo: '/images/default_company.png' },
                    stats: {
                        activeListings: 0,
                        pendingApplications: 0,
                        unreadNotifications: 0
                    }
                });
                return;
            }
            
            // Fetch counts for dashboard stats
            const [activeListingsCountRows] = await db.query('SELECT COUNT(*) AS count FROM job_listings WHERE company_id = ?', [userId]);
            const [pendingApplicationsCountRows] = await db.query(
                `SELECT COUNT(a.id) AS count
                FROM applications AS a
                JOIN job_listings AS jl ON a.job_id = jl.id
                WHERE jl.company_id = ? AND a.status = 'pending'`,
                [userId]
            );
            const [unreadNotificationsCountRows] = await db.query('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE', [userId]);

            res.render('company_dashboard', {
                title: 'Company Dashboard',
                user: req.session.user,
                profile: profile,
                stats: {
                    activeListings: activeListingsCountRows[0].count,
                    pendingApplications: pendingApplicationsCountRows[0].count,
                    unreadNotifications: unreadNotificationsCountRows[0].count
                }
            });
        } catch (error) {
            console.error('Error fetching company dashboard data:', error);
            res.status(500).send('An error occurred while fetching your dashboard data.');
        }
    } else {
        res.status(403).send("Access Denied");
    }
});

// Admin Dashboard
router.get('/admin/dashboard', requireLogin, async (req, res) => {
    if (req.session.user.role === 'admin') {
        try {
            const [allUsers] = await db.query('SELECT id, email, role, created_at FROM users');
            const [allJobRequests] = await db.query('SELECT * FROM job_requests');
            res.render('admin_dashboard', {
                title: 'Admin Dashboard',
                user: req.session.user,
                allUsers: allUsers,
                allJobRequests: allJobRequests
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