const express = require('express');

const router = express.Router();

const { getUser, getUsers, createUser, updateUser, deleteUser } = require('../controllers/admin');

const { protect, authorize } = require('../middlewares/auth');

router.use(protect);
router.use(authorize('admin'));

router
    .route('/')
    .get(getUsers)
    .post(createUser)

router
    .route('/:userId')
    .get(getUser)
    .put(updateUser)
    .delete(deleteUser)

module.exports = router;