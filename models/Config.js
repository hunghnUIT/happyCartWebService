const mongoose = require('mongoose');

const ConfigSchema =  new mongoose.Schema({
    name: {
        type: String,
        // unique: true,
        required: [true, 'Name of configuration is required.'],
        // Name will look like: timeBetweenCrawlingTime (split by underscore, all low case)
    },
    // Vietnamese title
    title: {
        type: String,
        required: [true, 'Title of configuration is required.'],
    },
    description: {
        type: String,
    },
    value: {
        type: String,
        required: [true, 'Value of configuration is required.'],
    },
    category: {
        type: String,
        // Update June 22nd, 2021: This is no longer necessary, even make admin fell inconvenient.
        // enum: ['Cấu hình API Crawler', 'Cấu hình HTML Crawler'],
        required: [true, 'Category of configuration is required.'],
    },
    subCategory: {
        type: String,
    },
    type: {
        type: String,
        enum: ['text', 'boolean', ], // Number will using type=text
        default: 'text',
    },
    affect: {
        type: [String],
        default: ['all_api_crawler']
    }
});

ConfigSchema.index({ name: 'text'});

const myDB = mongoose.connection.useDb('SERVER');

module.exports = myDB.model('Config', ConfigSchema, 'Configs')