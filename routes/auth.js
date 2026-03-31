const express = require('express');
const router = express.Router();
const { register, login, logout, checkAuth } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/check', checkAuth);

module.exports = router;
