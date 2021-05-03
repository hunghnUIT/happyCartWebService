const express = require('express');

const userRoute = require('./admin.user');

const router = express.Router();

router.use('/users', userRoute)

module.exports = router;