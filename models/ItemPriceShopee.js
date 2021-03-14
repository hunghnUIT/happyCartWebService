const mongoose = require('mongoose');

const ItemPriceSchema =  new mongoose.Schema({}, { strict: false });

const myDB = mongoose.connection.useDb('SHOPEE');

module.exports = myDB.model('ItemPriceShopee', ItemPriceSchema, 'ItemPriceShopee')