const ItemTiki = require('../models/ItemTiki');

/**
 * @note This function is used for Tiki platform only by now.
 * @description Update field sellerId in ItemTiki.
 * @param {Number} itemId Id of item about to crawl
 * @param {Number} sellerId Id seller of item about to crawl
 */
exports.updateSellerId = async (itemId, sellerId) => {
    await ItemTiki.findOneAndUpdate({id: itemId}, {sellerId: sellerId}, { upsert: false }, (err, doc)=>{
        if(err){
            console.log(err.message);
        }
        else{
            process.env.NODE_ENV === 'development' && console.log(`Update seller to item ${itemId}`);
        }
    });
};