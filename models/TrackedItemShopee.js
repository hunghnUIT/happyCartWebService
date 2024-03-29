const mongoose = require('mongoose');

const TrackedItemSchema =  new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
    },
    itemId: {
        type: Number,
        required: true,
    },
    oldPrice: {
        type: Number,
    },
    // User choose a number of price to receive notification when current price is less than this notifyWhenPriceLt
    notifyWhenPriceLt: {
        type: Number,
        required: [true, 'Please enter a valid price to get notifications'],
    },
    create: {
        type: Number,
        default: Date.now(),
    },
    update: {
        type: Number,
    },
},
{
    toJSON: { virtuals: true},
    toObject: { virtuals: true}
});

TrackedItemSchema.virtual('item', {
    ref: 'ItemShopee',
    localField: 'itemId',
    foreignField: 'id',
    justOne: true,
});

TrackedItemSchema.pre('save', function(next){
    this.update = new Date().getTime();
    next();
});

const myDB = mongoose.connection.useDb('USER');

module.exports = myDB.model('TrackedItemShopee', TrackedItemSchema, 'TrackedItemsShopee')