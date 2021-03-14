const asyncHandler = require("../middlewares/asyncHandler");
const ItemTiki = require('../models/ItemTiki');
const ItemPriceTiki = require('../models/ItemPriceTiki');
const ItemShopee = require('../models/ItemShopee');
const ItemPriceShopee = require('../models/ItemPriceShopee');

/**
 * @description Get info item and it's price history
 * @route PUT /api/v1/items/:itemId
 * @access public
 */
exports.getItemInfo = asyncHandler(async (req, res, next)=>{
    const id = Number(req.params.itemId);
    const platform = req.query.platform;
    let item; 
    let itemPrices = [];
    
    if(platform.toLowerCase() === 'tiki'){
        item = await ItemTiki.findOne({id: id}, '-_id -__v');
        itemPrices = await ItemPriceTiki.find({itemId: id}, '-_id -__v');
    }
    else if(platform.toLowerCase() === 'shopee'){
        item = await ItemShopee.findOne({id: id}, '-_id -__v');
        itemPrices = await ItemPriceShopee.find({itemId: id}, '-_id -__v');
    }
    res.status(200).json({
        success: true,
        item: item,
        price: itemPrices
    });
});


/**
 * @description Get info seller of that item
 * @route PUT /api/v1/items/seller/:sellerId
 * @access public
 */
exports.getSellerInfo = asyncHandler(async (req, res, next)=>{
    
});