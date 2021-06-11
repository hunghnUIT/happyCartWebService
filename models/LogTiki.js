const mongoose = require('mongoose');

const LogSchema =  new mongoose.Schema({}, { strict: false });

const myDB = mongoose.connection.useDb('TIKI');

module.exports = myDB.model('LogTiki', LogSchema, 'LogsTiki')