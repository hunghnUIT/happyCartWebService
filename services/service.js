const axios = require('axios');

const ItemTiki = require('../models/ItemTiki');
const ItemPriceTiki = require('../models/ItemPriceTiki');
const ItemShopee = require('../models/ItemShopee');
const ItemPriceShopee = require('../models/ItemPriceShopee');
const { HEADERS_SHOPEE, HEADERS_TIKI, URL_API_REVIEW_SHOPEE, URL_API_REVIEW_TIKI, URL_FILE_SERVER_SHOPEE } = require('../settings');
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

/**
 * Making API calling to Tiki or Shopee to get reviews data
 * @param {Number} itemId item's id
 * @param {Number} sellerId seller's id
 * @param {String} platform e-commerce platform (enum: [tiki, shopee])
 * @param {Number} limit  limit review to receive.
 * @param {Number} page starts from ONE (01).
 * @param {String} filter choose what to show, format: "star:1", "star:5" or "has_media", "filter=star:1,has_media" is NOT allowed
 */
exports.getReview = async (itemId, sellerId, platform, limit, page, filter) => {
    let response;
    let url = "";
    let configFilter = {};

    // if(filter && (filter.length === 5 ||filter.length === 9)){
    if(filter){
        if(filter.includes("star:")){
            configFilter.star = Number(filter.replace('star:','')); //Get number of star to filter
        }
        else if(filter.includes('has_media')){
            configFilter.hasMedia = true;
        }
    }

    if(platform === 'shopee'){
        url =`${URL_API_REVIEW_SHOPEE}&limit=${limit}&offset=${(page-1)*limit}`;
        url = url.replace('{item_id}', itemId);
        url = url.replace('{seller_id}', sellerId);

        //Add type and filter
        // type: 0: all score of star reviews, 1-5: corresponding rating star score. Filter with star score, "filter" params is equal to 0.
        // filter: 0: star score, 1: review having comments., 3: review having media.
        if(configFilter.star)
            url += `&filter=0&type=${configFilter.star}`;
        else if (configFilter.hasMedia)
            url += `&filter=3&type=0`;
        
        config = { headers: HEADERS_SHOPEE };
    }
    else if(platform === 'tiki'){
        url = `${URL_API_REVIEW_TIKI}&limit=${limit}&page=${page}`;
        url = url.replace('{item_id}', itemId);
        if(sellerId)
            url += `&seller_id=${sellerId}`;

        if(configFilter.star)
            url += `&sort=stars|${configFilter.star}`;
        else if (configFilter.hasMedia)
            url += `&sort=has_image`;
        
        config = { headers: HEADERS_TIKI };
    }
    console.log(url);

    try {
        response = (await axios.get(url, config))['data'];
    } catch (error) {
        // throw (new ErrorResponse(error.message, error.response?.status || error?.code || 500));
        console.log(error.message);
        return error.response.status === 404 ? `Not found review of item id ${id}` : error.message;
    }
    
    const reviewData = collectReviewData(response, platform, limit, page, configFilter);
    reviewData.filter = configFilter;

    return reviewData;
}

/**
 * Collect necessary data corresponding to platform
 * @param {Object} data response from API
 * @param {String} platform e-commerce platform (enum: [tiki, shopee])
 * @param {Number} limit limit returned reviews
 * @param {Number} page page for pagination
 * @param {Object} filter filter reviews.
 */
const collectReviewData = (response, platform, limit, page, filter) => {
    let data = {};

    if(platform === 'shopee'){
        response = response['data'];

        // count how many review match the query
        const countMatchedReview = countMatchedReviewShopee(response['item_rating_summary'], filter);
        
        data = {
            ratingAverage: response['item_rating_summary']['rating_average'],
            totalReview: response['item_rating_summary']['rating_total'],
            totalReviewHaveMedia: response['item_rating_summary']['rcount_with_image'],
            rates: {
                1: response['item_rating_summary']['rating_count'][0],
                2: response['item_rating_summary']['rating_count'][1],
                3: response['item_rating_summary']['rating_count'][2],
                4: response['item_rating_summary']['rating_count'][3],
                5: response['item_rating_summary']['rating_count'][4],
            },
            reviews: response['ratings'].map(el => {
                return {
                    id: el.itemid,
                    content: el.comment,
                    rating: el.rating_star,
                    images: el.images ? el.images.map(el => URL_FILE_SERVER_SHOPEE + el) : [],
                    videos: el.videos,
                    createdAt: el.ctime,
                    user: {
                        name: el.author_username,
                    },
                }
            }),
            count: response['ratings'].length,
            pagination: {
                totalMatch: countMatchedReview,
                limit: limit,
                currentPage: page,
                lastPage: Math.ceil(countMatchedReview/limit),
            },
        }
    }
    else if(platform === 'tiki'){
        data = {
            ratingAverage: response['rating_average'],
            totalReview: response['reviews_count'],
            totalReviewHaveMedia: response['review_photo']['total'],
            rates: {
                1: response['stars']['1']['count'],
                2: response['stars']['2']['count'],
                3: response['stars']['3']['count'],
                4: response['stars']['4']['count'],
                5: response['stars']['5']['count'],
            },
            reviews: response['data'].map(el => {
                return {
                    id: el.id,
                    content: el.content,
                    rating: el.rating,
                    images: el.images,
                    createdAt: el.created_at,
                    user: {
                        name: el.created_by.name,
                        fullName: el.created_by.full_name,
                        // avatar: el.created_by.avatar_url,
                        // joined: el.created_by.created_time,
                    },
                }
            }),
            count: response['data'].length,
            pagination: {
                totalMatch: response['paging']['total'],
                limit: limit,
                currentPage: page,
                lastPage: response['paging']['last_page'],
            },
        }
    }

    return data;
};
/**
 * A function help to count how many review match the query on Shopee platform
 * @param {Object} reviewSummary summary data for calculation
 * @param {Object} filter filters applying
 * @returns Number of reviews matching filters
 */
const countMatchedReviewShopee = (reviewSummary, filter) => {
    let res = 0;

    if(Object.keys(filter).length){
        if(filter.star)
            res = reviewSummary['rating_count'][filter.star-1];
        else if(filter.hasMedia)
            res = reviewSummary['rcount_with_media'];
    }
    else { 
        res = reviewSummary['rating_total'];
    }

    return res
};