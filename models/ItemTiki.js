const mongoose = require('mongoose');

// const ItemSchema = new mongoose.Schema({
//     id: {
//         type: Number,
//         unique: true,
//         required: [true, 'Item ID is required.']
//     },
//     name: {
//         type: String,
//         required: [true, 'Item name is required.'],
//         trim: true
//     },
//     sellerId:{
//         type: Number,
//         required: [true, 'Seller ID is required.'],
//     },
//     categoryId: {
//         type: Number,
//         required: [true, 'Category ID is required.'],
//     },
//     thumbnailUrl:{
//         type: String,
//         trim: true
//     },
//     productUrl: {
//         type: String,
//         required: [true, 'URL path is required.'],
//         trim: true
//     },
//     stock:{
//         type: Number,
//     },
//     rating:{
//         type: Number,
//         required: [true, 'Rating average is required.'],
//     },
//     totalReview:{
//         type: Number,
//         required: [true, 'Review count is required.'],
//     },
//     expired:{
//         type: Number,
//         required: [true, 'Expired is required.'],
//     }
// });

const ItemSchema =  new mongoose.Schema({}, { strict: false });
ItemSchema.index({ name: 'text'});

const myDB = mongoose.connection.useDb('TIKI');

module.exports = myDB.model('ItemTiki', ItemSchema, 'ItemsTiki')