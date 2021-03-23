const mongoose = require('mongoose');

const TrackedItemSchema =  new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
    }
});

const myDB = mongoose.connection.useDb('User');

module.exports = myDB.model('TrackedItem', TrackedItemSchema, 'TrackedItems')