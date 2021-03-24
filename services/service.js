const axios = require('axios');

const ItemTiki = require('../models/ItemTiki');
const ItemPriceTiki = require('../models/ItemPriceTiki');
const ItemShopee = require('../models/ItemShopee');
const ItemPriceShopee = require('../models/ItemPriceShopee');
const { HEADERS_SHOPEE, HEADERS_TIKI } = require('../settings');
const { crawlItemShopee, crawlItemTiki } = require('../helpers/helper');
const ErrorResponse = require('../utils/errorResponse');

/** 
 * @description Get data of item
 * @param {Number} itemId id of item
 * @param {Number} sellerId id of item
 * @param {String} platform platform of item
 * @param {Boolean} getPreviewImages get preview images or not
 * @returns Promise Model Item
 */
exports.getItem = async (itemId, sellerId, platform, getPreviewImages) => {
    let item;
    if(platform.toLowerCase() === 'tiki'){
        // if client don't want to preview images, try looking for item in DB first, there's no preview img in there.
        if(!getPreviewImages)
            item = await ItemTiki.findOne({id: itemId}, '-_id -__v -expired');

        // If item is not in DB or items on Tiki not having seller id or client want to preview images then crawl it.
        if(!item || !item['_doc']?.['sellerId'])
            item = await crawlItemTiki(itemId, getPreviewImages);
    }
    else if(platform.toLowerCase() === 'shopee'){
        if(!getPreviewImages)
            item = await ItemShopee.findOne({id: itemId}, '-_id -__v -expired');
        
        // If item is not in DB or client want to preview images then crawl it.
        if(!item){
            // Crawling Shopee item needs seller id too.
            if(!sellerId)
                throw new ErrorResponse('Seller id params is required along with Shopee items');

            item = await crawlItemShopee(itemId, sellerId, getPreviewImages);
        }
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
 */
exports.getSeller = async (id, platform) => {
    if(id === -1)
        return 'No seller selling this item'; //This item is no longer be sold (found this on tiki only).

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
    } catch (error) {
        // throw (new ErrorResponse(error.message, error.response?.status || error?.code || 500));
        console.log(error.message);
        return error.response.status === 404 ? `Not found seller id ${id}` : error.message;
    }

    if(response.error_msg === 'shop not found')
        return `Not found seller id ${id}`;
    else if(!response['data'])
        return null;
    
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
