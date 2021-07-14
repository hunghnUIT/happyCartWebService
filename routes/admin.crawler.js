const express = require('express');

const router = express.Router();

const { getCrawlers, getCrawlersStatus, getCrawlerStatusByName, restartCrawlerByName } = require('../controllers/admin');


router.get('/', getCrawlers)

router.get('/status', getCrawlersStatus)
router.get('/status/:crawlerName', getCrawlerStatusByName)

router.post('/restart', restartCrawlerByName)

module.exports = router;