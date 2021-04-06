const JWT_EXPIRE = '1h';
const JWT_EXPIRE_FOR_REFRESH = '90d';
const HEADERS_SHOPEE = {
    'Connection': 'keep-alive',
    'if-none-match-': '55b03-14bc0d8585b6a1c6ef3f05c0c3078db0', 
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.75 Safari/537.36',
    // 'User-Agent': 'Mozilla/5.0 (Compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Referer':' https://shopee.vn/',
    'Accept-Encoding':' gzip, deflate, br',
    'Accept-Language':' en-US,en;q=0.9',
}
const HEADERS_TIKI = {
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36',
    // 'User-Agent': 'Mozilla/5.0 (Compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Accept': '*/*',
    'Sec-Fetch-Site':' cross-site',
    'Sec-Fetch-Mode':' cors',
    'Sec-Fetch-Dest':' empty',
    'Referer':' https://tiki.vn/',
    'Accept-Encoding':' gzip, deflate, br',
    'Accept-Language':' en-US,en;q=0.9',
}

const URL_API_ITEM_SHOPEE = 'https://shopee.vn/api/v2/item/get?itemid={item_id}&shopid={seller_id}&fbclid=-';
const URL_API_ITEM_TIKI = 'https://tiki.vn/api/v2/products/{item_id}';

const URL_FILE_SERVER_SHOPEE = 'https://cf.shopee.vn/file/';

const URL_API_REVIEW_SHOPEE = 'https://shopee.vn/api/v2/item/get_ratings?flag=1&itemid={item_id}&shopid={seller_id}'; //type, filter, offset, limit will be add later, flag params still is a mystery
const URL_API_REVIEW_TIKI = 'https://tiki.vn/api/v2/reviews?product_id={item_id}';

const EXPIRED_TIME_REDIS = 300; // 300s = 5 mins

const URL_API_SEARCH_ITEM_SHOPEE = 'https://shopee.vn/api/v4/search/search_items?keyword={q}'; // Default limit = 10
const URL_API_SEARCH_ITEM_TIKI = 'https://tiki.vn/api/v2/products?q={q}'; // Default limit = 10

module.exports = {
    JWT_EXPIRE,
    JWT_EXPIRE_FOR_REFRESH,
    HEADERS_SHOPEE,
    HEADERS_TIKI,
    URL_API_ITEM_SHOPEE,
    URL_API_ITEM_TIKI,
    URL_FILE_SERVER_SHOPEE,
    URL_API_REVIEW_SHOPEE,
    URL_API_REVIEW_TIKI,
    EXPIRED_TIME_REDIS,
    URL_API_SEARCH_ITEM_SHOPEE,
    URL_API_SEARCH_ITEM_TIKI,
}