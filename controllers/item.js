const asyncHandler = require("../middlewares/asyncHandler");
const ErrorResponse = require('../utils/errorResponse');
const { processUrl } = require('../helpers/helper');
const { getItem, getSeller, getPrices } = require('../services/service')

/**
 * @description Get info by processing item's url, not being declared in "include" won't be returned.
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
        if(!response.item.productUrl)
            response.item.productUrl = url;
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
 * @description Get info item and it's price history
 * @route PUT /api/v1/items/:itemId?platform=...&include=item,price
 * @access public
 */
exports.getItemInfo = asyncHandler(async (req, res, next)=>{
    const platform = req.query.platform;
    const id = Number(req.params.itemId);
    const include = req.query.include || "";
    const response = {};
    if(!platform || !id)
        return next(new ErrorResponse(`Invalid ${!id ? 'item id,' : '' } ${!platform ? 'platform' : '' }`, 400));
    
    if(include.includes('item')){
        response['item'] = await getItem(id, platform);
    }
    if(include.includes('price')){
        response['price'] = await getPrices(id, platform);
    }

    response['success'] = true;

    res.status(200).json(response);
});


/**
 * @description Get info seller of that item
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
 * @description Get info reviews of that item
 * @route PUT /api/v1/items/review
 * @access public
 */
exports.getReviewInfo = asyncHandler(async (req, res, next)=>{
    
});