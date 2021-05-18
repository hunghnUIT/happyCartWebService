const express = require('express');

const router = express.Router();

const { 
    register, login, refreshToken, 
    logout, forgotPassword, resetPassword, verifyEmail,
} = require('../controllers/auth');
const { protect } = require('../middlewares/auth');
const facebookRoute = require('./fb');

router
    .post('/register', register)
    .get('/register/verify/:token', verifyEmail)
    .post('/login', login)
    .get('/logout', protect, logout)
    .post('/token', refreshToken)
    .post('/forgot-password', forgotPassword)
    .put('/reset-password/:token', resetPassword)

router.use('/facebook', facebookRoute)

module.exports = router;