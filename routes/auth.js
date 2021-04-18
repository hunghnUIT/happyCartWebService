const express = require('express');

const router = express.Router();

const { register, login, myAccount, refreshToken, logout, changePassword, updateAccount } = require('../controllers/auth');
const { protect } = require('../middlewares/auth');
const facebookRoute = require('./fb');

router
    .post('/register', register)
    .post('/login', login)
    .get('/logout', logout)
    .get('/my-account', protect, myAccount)
    .post('/token', refreshToken)
    .put('/change-password', protect, changePassword)
    .put('/update-account', protect, updateAccount)

router.use('/facebook', facebookRoute)

module.exports = router;