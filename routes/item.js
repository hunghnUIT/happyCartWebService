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
const { getUserIfLoggedIn, } = require('../middlewares/auth');

router
    .get('/most-decreasing-item', mostDecreasingItem)
    .get('/search', searchItemInDb)
    .get('/info', getUserIfLoggedIn, getInfoByItemUrl)
    .get('/:itemId', getUserIfLoggedIn, getItemInfo)
    .get('/seller/:sellerId', getSellerInfo)
    .get('/review/:itemId', getReviewInfo)


module.exports = router;