const User = require('../models/User');
const bcrypt = require('bcrypt');

const register = async (req, res) => {
    try {
        const { username } = req.body;

        if (!username || username.trim().length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters long' });
        }

        const existingUser = await User.findOne({ username: username.trim() });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        const user = new User({ username: username.trim() });
        await user.save();

        req.session.userId = user._id;
        req.session.username = user.username;

        res.status(201).json({
            message: 'User registered successfully',
            user: { id: user._id, username: user.username }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
};

const login = async (req, res) => {
    try {
        const { username } = req.body;

        if (!username || username.trim().length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters long' });
        }

        let user = await User.findOne({ username: username.trim() });
        if (!user) {
            user = new User({ username: username.trim() });
            await user.save();
        }

        req.session.userId = user._id;
        req.session.username = user.username;

        res.json({
            message: 'Login successful',
            user: { id: user._id, username: user.username }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};

const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ message: 'Logout successful' });
    });
};

const checkAuth = (req, res) => {
    if (req.session.userId) {
        res.json({
            authenticated: true,
            user: { id: req.session.userId, username: req.session.username }
        });
    } else {
        res.json({ authenticated: false });
    }
};

module.exports = { register, login, logout, checkAuth };
