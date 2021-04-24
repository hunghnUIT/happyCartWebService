const asyncHandler = require("../middlewares/asyncHandler");
const ErrorResponse = require('../utils/errorResponse');
const { processUrl } = require('../helpers/helper');
const { getItem, getSeller, getPrices, getReview, searchItemOnline } = require('../services/service');
const ItemTiki = require("../models/ItemTiki");
const ItemShopee = require("../models/ItemShopee");
const TrackedItemTiki = require("../models/TrackedItemTiki");
const TrackedItemShopee = require("../models/TrackedItemShopee");
const StandardCategory = require("../models/StandardCategory");

/**
 * Get info by processing item's url, what not being declared in "include" won't be returned.
 * @route PUT /api/v1/items/info?url=https://....&include=item,price,seller
 * @access public
 */
exports.getInfoByItemUrl = asyncHandler(async (req, res, next) => {
    const url = req.query.url;
    const include = req.query.include || "";
    let item;
    let prices = [];
    let seller;
    const response = {};

    let dataFromUrl = processUrl(url);

    if (include.includes('item')) {
        item = await getItem(dataFromUrl['itemId'], dataFromUrl['sellerId'], dataFromUrl['platform'], include.includes('image'));
        response['item'] = item['_doc'] || item; // _doc is where the data actually is in case it queried from DB.
    }
    if (include.includes('price')) {
        prices = await getPrices(dataFromUrl['itemId'], dataFromUrl['sellerId'], dataFromUrl['platform']);
        response['prices'] = prices;
    }
    if (include.includes('seller')) {
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
exports.getItemInfo = asyncHandler(async (req, res, next) => {
    const platform = req.query.platform;
    const id = Number(req.params.itemId);
    const sellerId = req.query.seller;
    const include = req.query.include || "";
    const response = {};
    if (!platform || !id)
        return next(new ErrorResponse(`Invalid ${!id ? 'item id,' : ''} ${!platform ? 'platform' : ''}`, 400));

    if (include.includes('item')) {
        response['item'] = await getItem(id, sellerId, platform, include.includes('image'));
    }
    if (include.includes('price')) {
        response['price'] = await getPrices(id, sellerId, platform);
    }

    response['success'] = true;

    res.status(200).json(response);
});


/**
 * Get info seller of that item
 * @route PUT /api/v1/items/seller/:sellerId?platform=...
 * @access public
 */
exports.getSellerInfo = asyncHandler(async (req, res, next) => {
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
exports.getReviewInfo = asyncHandler(async (req, res, next) => {
    const itemId = req.params.itemId;
    const sellerId = req.query.seller || "";
    const platform = (req.query.platform || "").toLowerCase();
    const limit = Math.min(Math.max(req.query.limit || 15, 5), 50); // Limit min: 5, max 50, default 15
    const page = Math.max(req.query.page || 1, 1); //min = 1;
    const filter = req.query.filter || "";

    if (!platform) {
        return next(new ErrorResponse(`Platform is required`));
    }

    // Seller Id is required, most of time it doesn't need to be exactly match with item id, sometimes incorrect seller id will response rating data = null.
    if (platform === 'shopee' && !sellerId)
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

    if (platform === 'tiki' || platform === 'all')
        response.trackingItemsTiki = await TrackedItemTiki.find({ user: req.user._id }).select('-__v').populate({ path: 'item', model: ItemTiki, select: '-_id -expired -__v' });
    if (platform === 'shopee' || platform === 'all')
        response.trackingItemsShopee = await TrackedItemShopee.find({ user: req.user._id }).select('-__v').populate({ path: 'item', model: ItemShopee, select: '-_id -expired -__v' });

    return res.status(200).json(response);

})

/**
 * Tracking a new item  
 * @route   POST /api/v1/items/tracking-items/:itemId
 * @access  private/protected
 */
exports.trackingNewItem = asyncHandler(async (req, res, next) => {
    const platform = req.body.platform;
    req.body.user = req.user;

    let trackedItem;
    if (platform === 'tiki')
        trackedItem = await TrackedItemTiki.create(req.body);
    else if (platform === 'shopee')
        trackedItem = await TrackedItemShopee.create(req.body);

    return res.status(200).json({
        success: true,
        data: trackedItem
    });
})

/**
 * Show products that most decreased in price.
 * @route   GET /api/v1/items/most-decreasing-item?platform=...&category=...&page=1
 * @access  public
 */
exports.mostDecreasingItem = asyncHandler(async (req, res, next) => {
    const platform = req.query.platform || 'all';
    const limit = Math.min(Math.max(req.query.limit || 20, 10), 50); // Limit min: 5, max 50, default 20
    const actuallyLimit = platform === 'all' ? limit / 2 : limit;
    const page = Math.max(req.query.page || 1, 1); //min = 1;
    const categoryName = req.query.category || "";

    let standardCategories;

    let filterCategoriesShopee = { lastPriceChange: { '$lt': 0 } };
    let filterCategoriesTiki = { lastPriceChange: { '$lt': 0 } };

    // Pagination
    const skip = (page - 1) * actuallyLimit;
    let total = 0;
    let countMatchShopee = 0;
    let countMatchTiki = 0;
    let lackingNumberShopee = actuallyLimit;
    let lackingNumberTiki = actuallyLimit;
    let numberItemTikiFilledIn = 0;
    let numberItemShopeeFilledIn = 0;

    if (categoryName && categoryName.toLowerCase() !== 'tất cả') {
        standardCategories = await StandardCategory.findOne(({ name: { $regex: `.*${categoryName}.*`, $options: 'i' } }));
        const shopeeIds = (standardCategories._doc.shopee_equi_cate_id).split("|").map(el => Number(el));
        const tikiIds = (standardCategories._doc.tiki_equi_cate_id).split("|").map(el => Number(el));
        filterCategoriesShopee.categoryId = { '$in': shopeeIds };
        filterCategoriesTiki.categoryId = { '$in': tikiIds };
    }
    else {
        standardCategories = await StandardCategory.find().select('-shopee_equi_cate_id -tiki_equi_cate_id -_id').sort({ name: 1 });
    }

    let items = [];

    // Get count for later so it need to be done first
    if (platform === 'tiki' || platform === 'all') {
        countMatchTiki = await ItemTiki.countDocuments(filterCategoriesTiki);
        numberItemShopeeFilledIn = skip - countMatchTiki;
        numberItemShopeeFilledIn = numberItemShopeeFilledIn < 0 ? 0 : numberItemShopeeFilledIn; // 
        total += countMatchTiki;
    }
    if (platform === 'shopee' || platform === 'all') {
        countMatchShopee = await ItemShopee.countDocuments(filterCategoriesShopee);
        numberItemTikiFilledIn = skip - countMatchShopee;
        numberItemTikiFilledIn = numberItemTikiFilledIn < 0 ? 0 : numberItemTikiFilledIn; // 
        total += countMatchShopee;
    }

    if ((platform === 'shopee' || platform === 'all') && skip < countMatchShopee) {
        // If there are still items 
        const itemsShopee = await ItemShopee.find(filterCategoriesShopee).sort({ lastPriceChange: 1 }).limit(actuallyLimit).skip(skip + numberItemShopeeFilledIn); // lastPriceChange < 0 means price is reduced.
        lackingNumberShopee = actuallyLimit - itemsShopee.length;
        items = items.concat(itemsShopee);
    }
    if ((platform === 'tiki' || platform === 'all') && skip < countMatchTiki) {
        // If there are still items 
        const itemsTiki = await ItemTiki.find(filterCategoriesTiki).sort({ lastPriceChange: 1 }).limit(actuallyLimit).skip(skip + numberItemTikiFilledIn);
        lackingNumberTiki = actuallyLimit - itemsTiki.length;
        items = items.concat(itemsTiki);
    }

    // If Shopee not enough item but still there are of Tiki
    if (lackingNumberShopee && skip < countMatchTiki) {
        items = items.concat(await ItemTiki.find(filterCategoriesTiki).sort({ lastPriceChange: 1 }).limit(lackingNumberShopee).skip(skip + actuallyLimit + numberItemTikiFilledIn));
    }
    // If Tiki not enough item but still there are of Shopee
    if (lackingNumberTiki && skip < countMatchShopee) {
        items = items.concat(await ItemShopee.find(filterCategoriesShopee).sort({ lastPriceChange: 1 }).limit(lackingNumberTiki).skip(skip + actuallyLimit + numberItemShopeeFilledIn));
    }

    if (platform === 'all')
        items.sort((item1, item2) => item1._doc.lastPriceChange - item2._doc.lastPriceChange);

    const response = {
        success: true,
        data: items,
        pagination: {
            totalMatchShopee: countMatchShopee,
            totalMatchTiki: countMatchTiki,
            totalMatch: total,
            limit: limit,
            currentPage: page,
            lastPage: Math.ceil(total / limit),
        }
    }

    if (standardCategories.length)
        response.categories = standardCategories;

    return res.status(200).json(response);
});

/**
 * Search items matching user's query string in DB first, if no item match then search online
 * @route   GET /api/v1/items/search?q=.....&platform='tiki'||'shopee'||'all'
 * @access  public
 */
exports.searchItemInDb = asyncHandler(async (req, res, next) => {
    const q = req.query.q || '';
    const platform = req.query.platform || 'all';
    const limit = platform === 'all' ? 15 : 30;
    const categoryName = req.query.category || "";

    // Query
    const regexShopee = {
        name: { $regex: `.*${q}.*`, $options: 'i' },
    };
    const regexTiki = {
        name: { $regex: `.*${q}.*`, $options: 'i' },
    };
    const matchQueryShopee = {
        $text: { $search: q },
    }
    const matchQueryTiki = {
        $text: { $search: `\"${q}\"` },
    }

    let standardCategories;
    if (categoryName && categoryName.toLowerCase() !== 'tất cả') {
        standardCategories = await StandardCategory.findOne(({ name: { $regex: `.*${categoryName}.*`, $options: 'i' } }));

        const shopeeIds = (standardCategories._doc.shopee_equi_cate_id).split("|").map(el => Number(el));
        regexShopee.categoryId = { '$in': shopeeIds };
        matchQueryShopee.categoryId = { '$in': shopeeIds };

        const tikiIds = (standardCategories._doc.tiki_equi_cate_id).split("|").map(el => Number(el));
        regexTiki.categoryId = { '$in': tikiIds };
        matchQueryTiki.categoryId = { '$in': tikiIds };
    }
    else {
        standardCategories = await StandardCategory.find().select('-shopee_equi_cate_id -tiki_equi_cate_id -_id').sort({ name: 1 });
    }

    let items = [];

    if (platform === 'shopee' || platform === 'all') {
        let itemsShopee = [];

        // Regex first, try to find with given phrases
        itemsShopee = await ItemShopee.find(regexShopee).select('-expired').limit(limit).sort({ currentPrice: -1 });

        // If found nothing, try again with other technic. Should I try this technic or just search online?
        if (!itemsShopee.length)
            itemsShopee = await ItemShopee.aggregate([
                {
                    $match: matchQueryShopee
                }, {
                    $project: {
                        _id: 0,
                        id: 1, name: 1, categoryId: 1, rating: 1, thumbnailUrl: 1,
                        totalReview: 1, productUrl: 1, currentPrice: 1, platform: 1, lastPriceChange: 1,
                        score: {
                            $add: [
                                { $meta: "textScore" },
                                {
                                    $cond: [
                                        { $eq: ["name", q] },
                                        10,
                                        0
                                    ]
                                }
                            ]
                        }
                    }
                },
                { $sort: { "score": -1 } }
            ]).limit(limit);

        // Still not found => search online
        if (!itemsShopee.length)
            itemsShopee = await searchItemOnline(q, 'shopee', limit);

        items = items.concat(itemsShopee);
    }

    if (platform === 'tiki' || platform === 'all') {
        let itemsTiki = [];

        // Regex first, try to find with given phrases <== This way is not good for Tiki platform as well as Shopee
        // itemsTiki = await ItemTiki.find(regexTiki).select('-expired').limit(limit).sort({currentPrice: 1});

        // If found nothing, try again with other technic. Should I try this technic or just search online?
        if (!itemsTiki.length)
            itemsTiki = await ItemTiki.aggregate([
                {
                    $match: matchQueryTiki
                }, {
                    $project: {
                        _id: 0,
                        id: 1, name: 1, categoryId: 1, rating: 1, thumbnailUrl: 1,
                        totalReview: 1, productUrl: 1, currentPrice: 1, platform: 1, lastPriceChange: 1,
                        score: {
                            $add: [
                                { $meta: "textScore" },
                                {
                                    $cond: [
                                        { $eq: ["name", q] },
                                        10,
                                        0
                                    ]
                                }
                            ]
                        }
                    }
                },
                { $sort: { "score": -1 } }
            ]).limit(limit);

        // Still not found => search online
        if (!itemsTiki.length)
            itemsTiki = await searchItemOnline(q, 'tiki', limit);

        items = items.concat(itemsTiki);
    }

    if (platform === 'all')
        items.sort((item1, item2) => item1._doc?.currentPrice ? item1._doc?.currentPrice : item1.currentPrice - item2._doc?.currentPrice ? item2._doc.currentPrice : item2.currentPrice); // Ascending price

    return res.status(200).json({
        success: true,
        items: items,
        categories: standardCategories.length ? standardCategories : undefined, // Not show this falsy.
    });
});