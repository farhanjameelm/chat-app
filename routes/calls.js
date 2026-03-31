const express = require('express');
const router = express.Router();
const {
    initiateCall,
    respondToCall,
    endCall,
    getCallHistory
} = require('../controllers/callController');

// Add session middleware to calls routes
router.use((req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
});

// Initiate a call
router.post('/initiate', initiateCall);

// Respond to a call (accept/reject)
router.post('/respond', respondToCall);

// End a call
router.post('/end', endCall);

// Get call history
router.get('/history', getCallHistory);

module.exports = router;
