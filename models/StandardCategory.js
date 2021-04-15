const mongoose = require('mongoose');

const StandardCategorySchema =  new mongoose.Schema({}, { strict: false });

const myDB = mongoose.connection.useDb('SERVER');

module.exports = myDB.model('StandardCategory', StandardCategorySchema, 'StandardCategories')