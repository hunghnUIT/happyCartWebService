const mongoose = require('mongoose');

const ItemSchema =  new mongoose.Schema({}, { strict: false });

const myDB = mongoose.connection.useDb('SHOPEE');

module.exports = myDB.model('ItemShopee', ItemSchema, 'ItemsShopee')