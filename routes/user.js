const express = require('express');

const router = express.Router();

const { 
    myAccount, updateAccount, 
    changePassword, getTrackingItems, 
    trackingNewItem,
} = require('../controllers/user');
const { protect } = require('../middlewares/auth');

router.use(protect);

router
    .get('/my-account', myAccount)
    .put('/update-account', updateAccount)
    .put('/change-password', changePassword)
    .get('/tracking-items', getTrackingItems)
    .post('/tracking-items', trackingNewItem)

module.exports = router;