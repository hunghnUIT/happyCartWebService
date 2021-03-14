const mongoose = require('mongoose');

const ItemPriceSchema =  new mongoose.Schema({}, { strict: false });

const myDB = mongoose.connection.useDb('TIKI');

module.exports = myDB.model('ItemPriceTiki', ItemPriceSchema, 'ItemPriceTiki')