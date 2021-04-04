const asyncHandler = require("../middlewares/asyncHandler");
const ErrorResponse = require('../utils/errorResponse');
const { processUrl } = require('../helpers/helper');
const { getItem, getSeller, getPrices, getReview } = require('../services/service');
const ItemTiki = require("../models/ItemTiki");
const ItemShopee = require("../models/ItemShopee");
const TrackedItemTiki = require("../models/TrackedItemTiki");
const TrackedItemShopee = require("../models/TrackedItemShopee");

/**
 * Get info by processing item's url, what not being declared in "include" won't be returned.
 * @route PUT /api/v1/items/info?url=https://....&include=item,price,seller
 * @access public
 */
exports.getInfoByItemUrl = asyncHandler(async (req, res, next)=>{
    const url = req.query.url;
    const include = req.query.include || "";
    let item;
    let prices = [];
    let seller;
    const response = {};

    let dataFromUrl = processUrl(url);

    if(include.includes('item')){
        item = await getItem(dataFromUrl['itemId'], dataFromUrl['sellerId'], dataFromUrl['platform'], include.includes('image'));
        response['item'] = item['_doc'] || item; // _doc is where the data actually is in case it queried from DB.
        
    }
    if(include.includes('price')){
        prices = await getPrices(dataFromUrl['itemId'], dataFromUrl['platform']);
        response['prices'] = prices;
    }
    if(include.includes('seller')){
        seller = await getSeller(dataFromUrl['sellerId'] || response.item['sellerId'], dataFromUrl['platform']);
        response['seller'] = seller;
    }
    
    response['success'] = true;

    return res.status(200).json(response)
});

/**
 * Get info item and it's price history
 * @route PUT /api/v1/items/:itemId?platform=...&include=item,price&seller=...
 * @note seller params is required when crawling Shopee item (item does not exist in DB).
 * @access public
 */
exports.getItemInfo = asyncHandler(async (req, res, next)=>{
    const platform = req.query.platform;
    const id = Number(req.params.itemId);
    const sellerId = req.query.seller;
    const include = req.query.include || "";
    const response = {};
    if(!platform || !id)
        return next(new ErrorResponse(`Invalid ${!id ? 'item id,' : '' } ${!platform ? 'platform' : '' }`, 400));
    
    if(include.includes('item')){
        response['item'] = await getItem(id, sellerId, platform, include.includes('image'));
    }
    if(include.includes('price')){
        response['price'] = await getPrices(id, platform);
    }

    response['success'] = true;

    res.status(200).json(response);
});


/**
 * Get info seller of that item
 * @route PUT /api/v1/items/seller/:sellerId?platform=...
 * @access public
 */
exports.getSellerInfo = asyncHandler(async (req, res, next)=>{
    const id = Number(req.params.sellerId);
    const platform = req.query.platform;

    return res.status(200).json({
        success: true,
        seller: await getSeller(id, platform),
    });
});

/**
 * Get reviews of that item
 * @route PUT /api/v1/items/review/:itemId?platform=...&limit=15&seller=...&filter=...
 * @access public
 */
exports.getReviewInfo = asyncHandler(async (req, res, next)=>{
    const itemId = req.params.itemId;
    const sellerId = req.query.seller || "";
    const platform = (req.query.platform || "").toLowerCase();
    const limit =  Math.min(Math.max(req.query.limit || 15, 5), 50); // Limit min: 5, max 50, default 15
    const page = Math.max(req.query.page || 1, 1); //min = 1;
    const filter = req.query.filter || "";

    if(!platform ){
        return next(new ErrorResponse(`Platform is required`));
    }

    // Seller Id is required, most of time it doesn't need to be exactly match with item id, sometimes incorrect seller id will response rating data = null.
    if(platform === 'shopee' && !sellerId)
        return next(new ErrorResponse(`Seller id is required`));

    let reviews = await getReview(itemId, sellerId, platform, limit, page, filter);
    
    return res.status(200).json(reviews);
});

/**
 * Get tracking items by user 
 * @route   GET /api/v1/items/tracking-items?platform='tiki'||'shopee'||'all'
 * @access  private/protected
 */
exports.getTrackingItems = asyncHandler(async (req, res, next) => {
    const platform = req.query.platform || "all";
    const response = { success: true };

    if(platform === 'tiki' || platform === 'all')
        response.trackingItemsTiki = await TrackedItemTiki.find({user: req.user._id}).select('-__v').populate({path: 'item', model: ItemTiki, select: '-_id -expired -__v'});
    if(platform === 'shopee' || platform === 'all')
        response.trackingItemsShopee = await TrackedItemShopee.find({user: req.user._id}).select('-__v').populate({path: 'item', model: ItemShopee, select: '-_id -expired -__v'});

    return res.status(200).json(response);

})

/**
 * Tracking a new item  
 * @route   POST /api/v1/auth/tracking-items/:itemId
 * @access  private/protected
 */
exports.trackingNewItem = asyncHandler(async (req, res, next) => {
    const platform = req.body.platform;
    req.body.user = req.user;

    let trackedItem;
    if(platform === 'tiki')
        trackedItem = await TrackedItemTiki.create(req.body);
    else if(platform === 'shopee')
        trackedItem = await TrackedItemShopee.create(req.body);
    
    return res.status(200).json({
        success: true,
        data: trackedItem
    });
})