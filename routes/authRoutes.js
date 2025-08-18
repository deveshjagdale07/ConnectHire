// routes/authRoutes.js

const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db/db');
const router = express.Router();

// GET request for the registration form
router.get('/register', (req, res) => {
  res.render('register', { title: 'Register' });
});

// POST request to handle registration form submission
router.post('/register', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    // Hash the password before saving to the database
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    const [result] = await db.query(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
      [email, hashedPassword, role]
    );

    console.log('User registered successfully:', result);
    // Corrected the redirection URL to the proper path
    res.redirect('/auth/login'); 

  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).send('Registration failed. Please try again.');
  }
});

// GET request for the login form
router.get('/login', (req, res) => {
    res.render('login', { title: 'Login' });
});

// POST request to handle login form submission
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find the user by email
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = rows[0];

        if (user) {
            // Compare the submitted password with the stored hashed password
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (passwordMatch) {
                // Password is correct, create a session
                req.session.user = {
                    id: user.id,
                    email: user.email,
                    role: user.role
                };

                // Redirect based on user role
                switch (user.role) {
                    case 'job_seeker':
                        res.redirect('/job_seeker/dashboard');
                        break;
                    case 'company':
                        res.redirect('/company/dashboard');
                        break;
                    case 'admin':
                        res.redirect('/admin/dashboard');
                        break;
                    default:
                        res.redirect('/'); // Default redirect
                        break;
                }
            } else {
                res.status(401).send('Invalid email or password.');
            }
        } else {
            res.status(401).send('Invalid email or password.');
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Login failed. Please try again.');
    }
});

module.exports = router;