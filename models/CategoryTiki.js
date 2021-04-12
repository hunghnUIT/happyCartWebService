const mongoose = require('mongoose');

const CategorySchema =  new mongoose.Schema({}, { strict: false });

const myDB = mongoose.connection.useDb('TIKI');

module.exports = myDB.model('CategoryTiki', CategorySchema, 'CategoriesTiki')