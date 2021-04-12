const mongoose = require('mongoose');

const CategorySchema =  new mongoose.Schema({}, { strict: false });

const myDB = mongoose.connection.useDb('SHOPEE');

module.exports = myDB.model('CategoryShopee', CategorySchema, 'CategoriesShopee')