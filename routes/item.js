const express = require('express');

const router = express.Router();

const { getItemInfo, getSellerInfo } = require('../controllers/item');

router
    .get('/:itemId', getItemInfo)
    .get('/seller/:sellerId', getSellerInfo)


module.exports = router;