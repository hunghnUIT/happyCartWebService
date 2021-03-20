const axios = require('axios');

const asyncHandler = require("../middlewares/asyncHandler");
const ErrorResponse = require('../utils/errorResponse');
const ItemTiki = require('../models/ItemTiki');
const ItemPriceTiki = require('../models/ItemPriceTiki');
const ItemShopee = require('../models/ItemShopee');
const ItemPriceShopee = require('../models/ItemPriceShopee');
const { HEADERS_SHOPEE, HEADERS_TIKI } = require('../settings');

/**
 * @description Get info item and it's price history
 * @route PUT /api/v1/items/:itemId
 * @access public
 */
exports.getItemInfo = asyncHandler(async (req, res, next)=>{
    const platform = req.query.platform;
    const id = Number(req.params.itemId);
    const include = req.query.include || "";
    const response = {};
    if(!platform || !id)
        return next(new ErrorResponse(`Invalid ${!id ? 'item id,' : '' } ${!platform ? 'platform' : '' }`, 400));
    
    let item; 
    let itemPrices = [];
    
    if(platform.toLowerCase() === 'tiki'){
        if(include.includes('item')){
            item = await ItemTiki.findOne({id: id}, '-_id -__v');
            response['item'] = item;
        }
        if(include.includes('price')){
            itemPrices = await ItemPriceTiki.find({itemId: id}, '-_id -__v');
            response['price'] = itemPrices;
        }
    }
    else if(platform.toLowerCase() === 'shopee'){
        if(include.includes('item')){
            item = await ItemShopee.findOne({id: id}, '-_id -__v');
            response['item'] = item;
        }
        if(include.includes('price')){
            itemPrices = await ItemPriceShopee.find({itemId: id}, '-_id -__v');
            response['price'] = itemPrices;
        }
    }

    response['success'] = true;

    res.status(200).json(response);
});


/**
 * @description Get info seller of that item
 * @route PUT /api/v1/items/seller/:sellerId
 * @access public
 */
exports.getSellerInfo = asyncHandler(async (req, res, next)=>{
    const id = Number(req.params.sellerId);
    const platform = req.query.platform;

    let response;
    let url;
    let config;

    if (platform === 'shopee'){
        url = `https://shopee.vn/api/v4/shop/get_shop_detail?shopid=${id}`;
        config = { headers: HEADERS_SHOPEE };
    }
    else if(platform === 'tiki'){
        url = `https://tiki.vn/api/shopping/v2/widgets/seller?seller_id=${id}`;
        config = { headers: HEADERS_TIKI };
    }

    try {
        response = (await axios.get(url, config))['data'];

        if(response['error'] || !response['data']){
            if(response['error']?.['code'] >= 400){ //tiki 404 error
                if(response['error']?.['code'] === 404)
                    return next(new ErrorResponse(`Shop id ${id} not found`, 404));
                
                return next(new ErrorResponse('Bad request', 400));
            }
            else if(response['error'] === 4){ // shopee 404 error 
                if(response['error_msg'] === 'shop not found'){
                    return next(new ErrorResponse(`Shop id ${id} not found`, 404));
                }
                return next(new ErrorResponse('Bad request', 400));
            }
            else if(response['error'] === 5 || response['error']?.['code'] >= 500){
                return next(new ErrorResponse(`${platform} server error`, 500));
            }
            else{
                return next(new ErrorResponse(`Internal server error`, 500));
            }
        }
    } catch (error) {
        return next(new ErrorResponse(error.message, 500));
    }

    return res.status(200).json({
        success: true,
        seller: collectSellerData(response['data'], platform),
    });
});

/**
 * 
 * @param {Object} data response from API
 * @param {String} platform e-commerce platform (enum: [tiki, shopee])
 */
const collectSellerData = (data, platform) => {
    let seller = {};

    if(platform === 'shopee'){
        seller = {
            id: data.shopid,
            lastActive: data.last_active_time,
            isVerified: data.is_shopee_verified,
            isOfficialShop: data.is_official_shop,
            name: data.name,
            rating: data.rating_star,
            ratingBad: data.rating_bad, // 1 star
            ratingNormal: data.rating_normal, // 2 and 3 star
            ratingGood: data.rating_good, // 4 and 5 star 
            totalRating: data.rating_bad + data.rating_normal + data.rating_good,
            created: data.ctime,
            follower: data.follower_count,
            totalItem: data.item_count,
            responseRate: data.response_rate, // rating of response chat and offer deal
            description: data.description,
            location: data.shop_location,
        }
    }
    else if(platform === 'tiki'){
        data = data['seller'];

        seller = {
            id: data.id,
            name: data.name,
            isOfficialShop: data.is_official,
            rating: data.avg_rating_point,
            totalRating: data.review_count,
            created: new Date().getTime() - data.days_since_joined * 24 * 60 * 60 * 1000,
            follower: data.total_follower,
        }
    }

    return seller;
};

/**
 * @description Get info reviews of that item
 * @route PUT /api/v1/items/review
 * @access public
 */
exports.getReviewInfo = asyncHandler(async (req, res, next)=>{
    
});