const redis = require('../config/redis').getConnection();

const User = require('../models/User');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const TrackedItemTiki = require('../models/TrackedItemTiki');
const TrackedItemShopee = require('../models/TrackedItemShopee');
const ItemTiki = require('../models/ItemTiki');
const ItemShopee = require('../models/ItemShopee');
const { 
    REDIS_TRACKED_SHOPEE_ITEMS_HASH_NAME, 
    REDIS_TRACKED_TIKI_ITEMS_HASH_NAME,
    REDIS_REPRESENTATIVE_TRUE_VALUE,
} = require('../settings');

/**
 * Return tokens and status
 * @param {Schema} user user logged in or registered
 * @param {Number} statusCode HTTP response code
 * @param {any} res for response purpose.
 */
const sendTokenResponse = (user, statusCode, res, refToken) => {
    const accessToken = user.getAccessToken();
    const refreshToken = refToken || user.getRefreshToken();

    const options = {
        expired: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 60 * 60 * 1000), // 1h
        httpOnly: true,
    }

    if (process.env.NODE_ENV === 'production')
        options.secure = true;

    res.status(statusCode)
        .cookie('accessToken', accessToken, options)
        .cookie('refreshToken', refreshToken, options)
        .json({
            success: true,
            accessToken: accessToken,
            refreshToken: refreshToken,
        })
};

/**
 * View my account
 * @route   GET /api/v1/user/my-account?include=item
 * @access  private
 */
exports.myAccount = asyncHandler(async (req, res, next) => {
    // NOTE: Look like query user and populate tracked items is faster than query tracked items and user.
    const include = req.query.include || "";
    // const response = { success: true };
    let user;
    if (include.includes('item')) {
        // response.trackedItemsTiki = await TrackedItemTiki.find({user: req.user._id}).populate({path: 'item', model: ItemTiki});
        // response.trackedItemsShopee = await TrackedItemShopee.find({user: req.user._id}).populate({path: 'item', model: ItemShopee});
        user = await User.findById(req.user._id)
            .populate({
                path: 'TrackedItemsTiki',
                model: TrackedItemTiki,
                populate: {
                    path: 'item',
                    model: ItemTiki,
                }
            })
            .populate({
                path: 'TrackedItemsShopee',
                model: TrackedItemShopee,
                populate: {
                    path: 'item',
                    model: ItemShopee,
                }
            });
        // response.user = user
    }
    else
        user = await User.findById(req.user._id);

    return res.status(200).json({
        success: true,
        user: user,
    })
});

/**
 * Update detail account
 * @route   PUT /api/v1/user/update-account
 * @access  private
 */
exports.updateAccount = asyncHandler(async (req, res, next) => {
    // Only allow to edit fields bellow.
    const fieldsToUpdate = {
        name: req.body.name,
    }

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
        new: true,
        runValidators: true
    });
    return res.status(200).json({
        success: true,
        data: user
    });
});

/**
 * Change password for user 
 * @route   PUT /api/v1/user/change-password
 * @access  private
 */
exports.changePassword = asyncHandler(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    let user = await User.findById(req.user.id).select('+password');
    let checkPassword = await user.matchPassword(currentPassword.toString());

    if (!checkPassword) {
        return next(new ErrorResponse("Incorrect current password", 401))
    }

    /** NOTE: We have to use this way but findByIdAndUpdate, unless sendTokenResponse below will raise error
     * Description error:
     * - findByIdAndUpdate return some kind of object, but it's not able to call the 
     * getSignedJwtToken function which is inside UserSchema. Maybe the object return is 
     * just the document so it can't call the function.
     * - findById return also some kind of object but it able to call the function.
     */
    user.password = newPassword;
    user = await user.save();

    sendTokenResponse(user, 200, res);
});

/**
 * Get tracking items by user 
 * @route   GET /api/v1/user/tracking-items?platform='tiki'||'shopee'||'all'
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
});

/**
 * Tracking a new item  
 * @route   POST /api/v1/user/tracking-items
 * @access  private/protected
 */
exports.trackingNewItem = asyncHandler(async (req, res, next) => {
    const platform = req.body.platform;
    req.body.user = req.user.id;
    req.body.update = new Date();

    let trackedItem;
    if (platform === 'tiki') {
        trackedItem = await TrackedItemTiki.findOneAndUpdate({
            itemId: req.body.itemId,
            user: req.body.user,
        }, req.body, {
            upsert: true,
            new: true,
        });
        await redis.hset(REDIS_TRACKED_TIKI_ITEMS_HASH_NAME, req.body.itemId, REDIS_REPRESENTATIVE_TRUE_VALUE).catch((err)=> console.error(err));
    }
    else if (platform === 'shopee') {
        trackedItem = await TrackedItemShopee.findOneAndUpdate({
            itemId: req.body.itemId,
            user: req.body.user,
        }, req.body, {
            upsert: true,
            new: true,
        });
        await redis.hset(REDIS_TRACKED_SHOPEE_ITEMS_HASH_NAME, req.body.itemId, REDIS_REPRESENTATIVE_TRUE_VALUE).catch((err)=> console.error(err));
    }

    return res.status(200).json({
        success: true,
        data: trackedItem
    });
});

/**
 * Un-track an item  
 * @route   DELETE /api/v1/user/tracking-items/:itemId
 * @access  private/protected
 */
exports.unTrackingItem = asyncHandler(async (req, res, next) => {
    const itemId = req.params.itemId || "";
    const platform = req.query.platform;
    const user = req.user.id;

    if (!itemId || !platform || !user)
        return next(new ErrorResponse('Bad request.'))

    let trackedItem;
    if (platform === 'tiki') {
        trackedItem = await TrackedItemTiki.findOne({
            itemId: itemId,
            user: user,
        });
        await redis.hdel(REDIS_TRACKED_TIKI_ITEMS_HASH_NAME, `${itemId}`).catch((err)=> console.error(err));
    }
    else if (platform === 'shopee') {
        trackedItem = await TrackedItemShopee.findOne({
            itemId: itemId,
            user: user,
        });
        await redis.hdel(REDIS_TRACKED_SHOPEE_ITEMS_HASH_NAME, `${itemId}`).catch((err)=> console.error(err));
    }

    if (trackedItem) {
        await trackedItem.remove().catch(err => next(new ErrorResponse(err.message)));
    }
    else {
        return next(new ErrorResponse('Item not being tracked.', 404));
    }

    return res.status(200).json({
        success: true,
        data: {}
    });
});