const axios = require('axios');

const ItemTiki = require('../models/ItemTiki');
const ItemPriceTiki = require('../models/ItemPriceTiki');
const ItemShopee = require('../models/ItemShopee');
const ItemPriceShopee = require('../models/ItemPriceShopee');
const { HEADERS_SHOPEE, HEADERS_TIKI } = require('../settings');
const ErrorResponse = require('../utils/errorResponse');

/** 
 * @description Get data of item
 * @param {Number} id id of item
 * @param {String} platform platform of item
 * @returns Promise Model Item
 */
exports.getItem = async (id, platform) => {
    let item;
    if(platform.toLowerCase() === 'tiki'){
        item = await ItemTiki.findOne({id: id}, '-_id -__v');
    }
    else if(platform.toLowerCase() === 'shopee'){
        item = await ItemShopee.findOne({id: id}, '-_id -__v');
    }
    return item;
};

/** 
 * @description Get data of seller
 * @param {Number} id id of seller
 * @param {String} platform platform of item that price belong to
 * @returns Promise Model ItemPrice
 */
exports.getPrices = async (itemId, platform) => {
    let itemPrices = [];
    if(platform.toLowerCase() === 'tiki'){
        itemPrices = await ItemPriceTiki.find({itemId: itemId}, '-_id -__v');
    }
    else if(platform.toLowerCase() === 'shopee'){
        itemPrices = await ItemPriceShopee.find({itemId: itemId}, '-_id -__v');
    }
    return itemPrices;
};

/** 
 * @description Get data of seller
 * @param {Number} id id of seller
 * @param {String} platform platform of seller
 * @returns Promise Object seller
 * @note NOT FOUND SELLER WILL THROW ERROR. Should I?
 */
exports.getSeller = async (id, platform) => {
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
                    throw (new ErrorResponse(`Shop id ${id} not found`, 404));
                
                throw (new ErrorResponse('Bad request', 400));
            }
            else if(response['error'] === 4){ // shopee 404 error 
                if(response['error_msg'] === 'shop not found'){
                    throw (new ErrorResponse(`Shop id ${id} not found`, 404));
                }
                throw (new ErrorResponse('Bad request', 400));
            }
            else if(response['error'] === 5 || response['error']?.['code'] >= 500){
                throw (new ErrorResponse(`${platform} server error`, 500));
            }
            else{
                throw (new ErrorResponse(`Internal server error`, 500));
            }
        }
    } catch (error) {
        throw (new ErrorResponse(error.message, error.response?.status || error?.code || 500));
    }
    
    return collectSellerData(response['data'], platform);
};

/**
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