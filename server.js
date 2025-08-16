// server.js

const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const db = require('./db/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Basic home route to test the server
app.get('/', (req, res) => {
  res.render('index', { title: 'Welcome to ConnectHire' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});