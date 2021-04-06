const mongoose = require('mongoose');

const ItemSchema =  new mongoose.Schema({}, { strict: false });
ItemSchema.index({ name: 'text'});

const myDB = mongoose.connection.useDb('SHOPEE');

module.exports = myDB.model('ItemShopee', ItemSchema, 'ItemsShopee')