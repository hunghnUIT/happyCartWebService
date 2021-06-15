const express = require('express');

const router = express.Router();

const { getConfig, getConfigs, createConfig, updateConfig, deleteConfig } = require('../controllers/admin');


router
    .route('/')
    .get(getConfigs)
    .post(createConfig)

router
    .route('/:configId')
    .get(getConfig)
    .put(updateConfig)
    .delete(deleteConfig)

module.exports = router;