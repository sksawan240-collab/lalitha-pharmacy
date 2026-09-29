const express = require('express');
const cors = require('cors');
const app = express();

// Allow requests from your frontend domain
app.use(cors({
  origin: ['https://lalitha-pharmacy-1.onrender.com', 'http://localhost:5173'], // Add your frontend URL(s)
  credentials: true, // Important: allows cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // Cache preflight requests for 24 hours
}));

// ... rest of your server setup
