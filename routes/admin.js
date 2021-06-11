const express = require('express');

const userRoute = require('./admin.user');

const router = express.Router();

const { statistic } = require('../controllers/admin');

const { protect, authorize } = require('../middlewares/auth');

router.use(protect);
router.use(authorize('admin'));

router.use('/users', userRoute)

router.get('/statistics', statistic)

module.exports = router;