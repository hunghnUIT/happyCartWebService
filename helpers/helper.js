const axios = require('axios');
const { URL_API_ITEM_SHOPEE, URL_API_ITEM_TIKI } = require('../settings');
const { HEADERS_SHOPEE, HEADERS_TIKI, URL_FILE_SERVER_SHOPEE } = require('../settings');

/** 
 * round a float number to human readable
 * @returns number in float or int format.
 */
exports.roundFloatNumber = function (value, decimals) {
    return Number(value.toFixed(decimals));
}

/** 
 * Extract information from url
 * @returns Object containing "platform", "itemId", "sellerId".
 */
exports.processUrl = (url) => {
    url = url.toLowerCase(); // for sure than sorry.
    let result = {};
    
    if(url.includes('shopee'))
        result['platform'] = 'shopee';
    else if(url.includes('tiki'))
        result['platform'] = 'tiki';

    if(result['platform'] === 'shopee'){
        // E.g: https://shopee.vn/product/283338743/9918567180?smtt=0.174867900-1616510545.9 // Shop id first, then item id
        if(url.includes('shopee.vn/product/')){
            if(url.indexOf('?') > -1)
                url = url.slice(0, url.indexOf('?'));
            let splittedUrlBySlash = url.split('/');
    
            result['itemId'] = Number(splittedUrlBySlash[splittedUrlBySlash.length - 1]);
            result['sellerId'] = Number(splittedUrlBySlash[splittedUrlBySlash.length - 2]);
        }
        // E.g: https://shopee.vn/bach-tuoc-cam-xuc-2-mat-cam-xuc-do-choi-bach-tuoc-co-the-dao-nguoc-tam-trang-bach-tuoc-sang-trong-i.283338743.9918567180 //id shop first, then id item
        else{
            let splittedUrlByDot = url.split('.');
    
            result['itemId'] = Number(splittedUrlByDot[splittedUrlByDot.length - 1]);
            result['sellerId'] = Number(splittedUrlByDot[splittedUrlByDot.length - 2]);
        }
    }
    else if(result['platform'] === 'tiki'){
        // E.g: https://tiki.vn/dien-thoai-iphone-12-pro-max-128gb-hang-chinh-hang-p70771651.html?src=ss-organic
        url = url.slice(0, url.indexOf('.html')); // Remove tail after ".html"
        let splittedUrlByDash = url.split('-');

        result['itemId'] = Number((splittedUrlByDash[splittedUrlByDash.length - 1]).replace('p', ''));
        // result['sellerId'] = null;
    }

    return result;
}


/**
 * Crawl Tiki item using the same way with crawler.
 * @param {Number} itemId Id of item about to crawl
 * @param {Boolean} getPreviewImages get preview images or not
 */
exports.crawlItemTiki = async (itemId, getPreviewImages) => {
    let endpoint = URL_API_ITEM_TIKI; 
    endpoint = endpoint.replace('{item_id}', itemId);
    
    const response = (await axios.get(endpoint, { headers: HEADERS_TIKI }))['data'];
    let result = {}
    if(response){
        result = {
            id: response['id'],
            name: response['name'],
            categoryId: response['categories']?.['id'] ? response['categories']['id'] : "unknown",
            sellerId: response['current_seller']?.['id'] ? response['current_seller']['id'] : -1,
            rating: response['rating_average'],
            stock: response['stock_item']?.['qty'] ? response['stock_item']['qty']: 0,
            productUrl: `https://tiki.vn/${response['url_path']}`,
            thumbnailUrl: response['thumbnail_url'],
            totalReview: response['review_count'],
            currentPrice: parseInt(response['price']),
            platform: 'tiki',
        }
        if(getPreviewImages)
            result['previewImages'] = response['images'];
    }
    else
        return `Not found item id ${itemId}`;
    
    return result;
};

/**
 * Crawl Shopee item using the same way with crawler.
 * @param {Number} itemId Id of item about to crawl
 * @param {Number} sellerId Id seller of item about to crawl
 * @param {Boolean} getPreviewImages get preview images or not
 */
exports.crawlItemShopee = async (itemId, sellerId, getPreviewImages) => {
    let endpoint = URL_API_ITEM_SHOPEE;
    endpoint = endpoint.replace('{item_id}', itemId);
    endpoint = endpoint.replace('{seller_id}', sellerId);
    
    const response = (await axios.get(endpoint, { headers: HEADERS_SHOPEE }))['data'];
    const item = response['item'];
    let result = {};
    if(item){
        result = {
            id: item['itemid'],
            name: item['name'],
            sellerId: item['shopid'],
            categoryId: item['categories'][0]['catid'],
            rating: item['item_rating']['rating_star'],
            productUrl: `https://shopee.vn/product/${item['shopid']}/${item['itemid']}`,
            thumbnailUrl: `https://cf.shopee.vn/file/${item['image']}`,
            totalReview: item['cmt_count'],
            currentPrice: parseInt(item['price_min']) / 100000,
            platform: 'shopee',
        };
        if(getPreviewImages)
            result['previewImages'] = item['images'].map((el)=> URL_FILE_SERVER_SHOPEE + el);
    }
    else
        return `Not found item id ${itemId} belong to shop ${sellerId}`;
    
    return result;
};

/**
 * Check if this date is today
 * @param {Date} date checking date
 */
exports.isToday = (date) => {
    return (new Date().toDateString() == new Date(date).toDateString());
};