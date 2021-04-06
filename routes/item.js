const express = require('express');

const router = express.Router();

const { getInfoByItemUrl, getItemInfo, getSellerInfo, getTrackingItems, trackingNewItem, getReviewInfo, mostDecreasingItem } = require('../controllers/item');
const { protect } = require('../middlewares/auth');

router
    .get('/tracking-items', protect, getTrackingItems)
    .post('/tracking-items', protect, trackingNewItem)
    .get('/most-decreasing-item', mostDecreasingItem)
    .get('/info', getInfoByItemUrl)
    .get('/:itemId', getItemInfo)
    .get('/seller/:sellerId', getSellerInfo)
    .get('/review/:itemId', getReviewInfo)


module.exports = router;