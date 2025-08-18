// server.js

const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
// --------------------------------------------------

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }));
// Parse JSON bodies (as sent by API clients)
app.use(express.json());

// Session store configuration to use MySQL
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 3306, // Default MySQL port, you can change it if yours is different
  clearExpired: true,
  checkExpirationInterval: 900000,
  expiration: 86400000, // 24 hours
  createDatabaseTable: true,
  table: 'sessions', // Must match the table you created
});

// Configure and use express-session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your_super_secret_key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

// EJS View Engine setup
// --------------------------------------------------

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Route definitions
// --------------------------------------------------

// Import route files
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Basic home route
app.get('/', (req, res) => {
  res.render('index', { title: 'Welcome to ConnectHire' });
});

// Use imported routes
app.use('/auth', authRoutes);
app.use('/', dashboardRoutes);

// Start the server
// --------------------------------------------------

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});