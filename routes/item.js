const express = require('express');

const router = express.Router();

const { 
    getInfoByItemUrl, 
    getItemInfo, 
    getSellerInfo, 
    getReviewInfo, 
    mostDecreasingItem, 
    searchItemInDb
} = require('../controllers/item');

router
    .get('/most-decreasing-item', mostDecreasingItem)
    .get('/search', searchItemInDb)
    .get('/info', getInfoByItemUrl)
    .get('/:itemId', getItemInfo)
    .get('/seller/:sellerId', getSellerInfo)
    .get('/review/:itemId', getReviewInfo)


module.exports = router;