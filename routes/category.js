const express = require('express');
const { getAllStandardCategories } = require("../controllers/category");

const router = express.Router();

router
    .get('/standard-categories', getAllStandardCategories)

module.exports = router;