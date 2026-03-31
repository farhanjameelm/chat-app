const express = require('express');
const router = express.Router();
const {
    sendFriendRequest,
    getFriendRequests,
    respondToFriendRequest,
    getFriends,
    searchUsers
} = require('../controllers/friendController');

// Add session middleware to friends routes
router.use((req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
});

// Send friend request
router.post('/request', sendFriendRequest);

// Get pending friend requests
router.get('/requests', getFriendRequests);

// Respond to friend request (accept/reject)
router.post('/respond', respondToFriendRequest);

// Get user's friends
router.get('/', getFriends);

// Search users
router.get('/search', searchUsers);

module.exports = router;
