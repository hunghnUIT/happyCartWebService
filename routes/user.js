const express = require('express');

const router = express.Router();

const { 
    myAccount, updateAccount, 
    changePassword, getTrackingItems, 
    trackingNewItem, unTrackingItem
} = require('../controllers/user');
const { protect } = require('../middlewares/auth');

router.use(protect);

router
    .get('/my-account', myAccount)
    .put('/update-account', updateAccount)
    .put('/change-password', changePassword)
    .get('/tracking-items', getTrackingItems)
    .post('/tracking-items', trackingNewItem)
    .delete('/tracking-items/:itemId', unTrackingItem)

module.exports = router;