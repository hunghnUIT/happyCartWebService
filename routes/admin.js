const express = require('express');

const userRoute = require('./admin.user');
const configRoute = require('./admin.config');
const crawlerRoute = require('./admin.crawler');

const router = express.Router();

const { statistic } = require('../controllers/admin');

const { protect, authorize } = require('../middlewares/auth');

router.use(protect);
router.use(authorize('admin'));

router.use('/users', userRoute)
router.use('/configs', configRoute)
router.use('/crawlers', crawlerRoute)

router.get('/statistics', statistic)

module.exports = router;