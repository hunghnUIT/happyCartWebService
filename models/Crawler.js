const mongoose = require('mongoose');

const CrawlerSchema =  new mongoose.Schema({}, { strict: false });

const myDB = mongoose.connection.useDb('SERVER');

module.exports = myDB.model('Crawler', CrawlerSchema, 'Crawlers')