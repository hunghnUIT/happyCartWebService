const express = require('express');

const userRoute = require('./admin.user');

const router = express.Router();

const { statistic } = require('../controllers/admin');

router.use('/users', userRoute)

router.get('/statistic', statistic)

module.exports = router;