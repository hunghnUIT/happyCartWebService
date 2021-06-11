const mongoose = require('mongoose');

const LogSchema =  new mongoose.Schema({}, { strict: false });

const myDB = mongoose.connection.useDb('SHOPEE');

module.exports = myDB.model('LogShopee', LogSchema, 'LogsShopee')