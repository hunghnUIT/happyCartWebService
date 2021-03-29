const express = require('express');

const router = express.Router();

const { getInfoByItemUrl, getItemInfo, getSellerInfo, getTrackingItems, trackingNewItem } = require('../controllers/item');
const { protect } = require('../middlewares/auth');

router
    .get('/tracking-items', protect, getTrackingItems)
    .post('/tracking-items', protect, trackingNewItem)
    .get('/info', getInfoByItemUrl)
    .get('/:itemId', getItemInfo)
    .get('/seller/:sellerId', getSellerInfo)


module.exports = router;