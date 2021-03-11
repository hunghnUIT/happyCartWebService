const express = require('express');

const router = express.Router();

const { register, login, myAccount, refreshToken, logout, changePassword } = require('../controllers/auth');
const { protect } = require('../middlewares/auth');


router
    .post('/register', register)
    .post('/login', login)
    .get('/logout', logout)
    .get('/my-account', protect, myAccount)
    .post('/token', refreshToken)
    .put('/change-password', protect, changePassword)

module.exports = router;