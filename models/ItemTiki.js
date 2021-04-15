const mongoose = require('mongoose');

const ItemSchema =  new mongoose.Schema({}, { strict: false });
ItemSchema.index({ name: 'text'});

const myDB = mongoose.connection.useDb('TIKI');

module.exports = myDB.model('ItemTiki', ItemSchema, 'ItemsTiki')