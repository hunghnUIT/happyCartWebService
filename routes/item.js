const express = require('express');

const router = express.Router();

const { getInfoByItemUrl, getItemInfo, getSellerInfo } = require('../controllers/item');

router
    .get('/info', getInfoByItemUrl)
    .get('/:itemId', getItemInfo)
    .get('/seller/:sellerId', getSellerInfo)


module.exports = router;