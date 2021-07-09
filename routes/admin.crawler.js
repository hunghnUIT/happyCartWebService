const express = require('express');

const router = express.Router();

const { getCrawlers, getCrawlersStatus, getCrawlerStatusByName, } = require('../controllers/admin');


router.get('/', getCrawlers)

router.get('/status', getCrawlersStatus)
router.get('/status/:crawlerName', getCrawlerStatusByName)

module.exports = router;