const ItemTiki = require('../models/ItemTiki');
const redis = require('../config/redis').getConnection();

/**
 * Update field sellerId in ItemTiki.
 * @note This function is used for Tiki platform only by now.
 * @param {Number} itemId Id of item about to crawl
 * @param {Number} sellerId Id seller of item about to crawl
 */
exports.updateSellerId = async (itemId, sellerId) => {
    await ItemTiki.findOneAndUpdate({ id: itemId }, { sellerId: sellerId }, { upsert: false }, (err, doc) => {
        if (err) {
            console.log(err.message);
        }
        else {
            process.env.NODE_ENV === 'development' && console.log(`Update seller to item ${itemId}`);
        }
    });
};

/**
 * Add an item to list for crawler to crawl later
 * @param {Number} itemId id of item
 * @param {Number} sellerId seller selling item
 * @param {String} platform platform of item
 */
exports.addItemToCrawlingList = async (itemId, sellerId, platform) => {
    const value = {
        itemId: itemId,
        sellerId: sellerId,
    };
    await redis.hset(`listItemToCrawl-${platform}`, `${itemId}`, JSON.stringify(value)).catch(error => console.error(error));
};