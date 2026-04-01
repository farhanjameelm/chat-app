require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

// Redis session store for production
const RedisStore = require('connect-redis')(session);
const redis = require('redis');

const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const friendRoutes = require('./routes/friends');
const callRoutes = require('./routes/calls');
const socketHandler = require('./controllers/socketController');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Environment variables with fallbacks
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://abeer070225_db_user:abeer070225_db_user@cluster0.qvwfhvr.mongodb.net/';
const sessionSecret = process.env.SESSION_SECRET || 'your-secret-key-here';

// Session middleware with Redis for production
const sessionConfig = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
};

// Use Redis for production, memory store for development
if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
    const redisClient = redis.createClient({
        url: process.env.REDIS_URL,
        legacyMode: true
    });
    
    sessionConfig.store = new RedisStore({ client: redisClient });
    console.log('🔴 Using Redis session store for production');
} else {
    console.log('🟡 Using memory session store for development');
}

app.use(session(sessionConfig));

// Database connection
console.log('Connecting to MongoDB...');

mongoose.connect(mongoUri)
    .then(() => {
        console.log('Connected to MongoDB successfully');
        console.log('MongoDB URI:', mongoUri.includes('localhost') ? 'Local MongoDB' : 'Remote MongoDB');
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        console.error('MongoDB URI being used:', mongoUri);
        process.exit(1); // Exit if MongoDB connection fails
    });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/calls', callRoutes);

// Serve main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO connection
socketHandler(io);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
