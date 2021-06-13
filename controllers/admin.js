const { initTimingValue } = require('../helpers/helper');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

const LogShopee = require('../models/LogShopee');
const LogTiki = require('../models/LogTiki');
const TrackedItemShopee = require('../models/TrackedItemShopee');
const TrackedItemTiki = require('../models/TrackedItemTiki');
const ItemShopee = require('../models/ItemShopee');
const ItemTiki = require('../models/ItemTiki');
const User = require('../models/User');
const CategoryTiki = require('../models/CategoryTiki');
const CategoryShopee = require('../models/CategoryShopee');


const { COMPLETE_CRAWLING_MESSAGE, REPRESENTATIVE_CRAWLER_ID, ALTERNATIVE_CRAWLER_ID } = require('../settings');

/**
 * @description Get a user by id
 * @route GET /api/v1/admin/users/:userId
 * @access private/admin
 * @returns Object represent for User Schema.
 */
exports.getUser = asyncHandler(async function(req, res, next){
    const user = await User.findById(req.params.userId);
    return res.status(200).json({
        success: true,
        user: user,
    })
});

/**
 * @description Get all users
 * @route GET /api/v1/admin/users/
 * @access private/admin
 * @returns {Array} represent for list of users.
 */
exports.getUsers = asyncHandler(async (req, res, next) => {
    const users = await User.find();
    return res.status(200).json({
        success: true,
        count: users.length,
        data: users
    });
});

/**
 * @description Create a new user
 * @route POST /api/v1/admin/users/
 * @access private/admin
 */
exports.createUser = asyncHandler(async (req, res, next) => {
    if(req.body.isAdmin === 'true'){
        if(req.body.secretToken !== process.env['SECRET_TOKEN'])
            return next(new ErrorResponse("Invalid credentials for creating admin account.", 401))
    }
    const user = await User.create(req.body);
    return res.status(201).json({
        success: true,
        data: user,
        // accessToken: user.getAccessToken(),
        // refreshToken: user.getRefreshToken(),
    });
});

/**
 * @description Update a user
 * @route PUT /api/v1/admin/users/:userId
 * @access private/admin
 */
exports.updateUser = asyncHandler(async (req, res, next) => {
    const user = await User.findByIdAndUpdate(req.params.userId, req.body, {
        new: true,
        runValidators: true
    });
    return res.status(200).json({
        success: true,
        data: user
    });
});

/**
 * @description delete a user
 * @route DELETE /api/users/:userId
 * @access private/admin
 */
exports.deleteUser = asyncHandler(async (req, res, next) => {
    await User.findByIdAndDelete(req.params.userId);
    return res.status(200).json({
        success: true,
        data: {}
    });
});

exports.statistic = asyncHandler(async (req, res, next) => {
    const type = req.query.type || '';

    if (!type)
        return next(new ErrorResponse('Not enough params'))

    let response = {
        success: true,
    }

    switch (type) {
        case 'user': {
            // Count users
            response.data = {
                total: await User.countDocuments()
            };
            break;
        }
        case 'tracked-item': {
            // How many item is being tracked by users
            const countTiki = await TrackedItemTiki.countDocuments();
            const countShopee = await TrackedItemShopee.countDocuments(); 
            response.data = {
                total: countTiki + countShopee,
                tiki: countTiki,
                shopee: countShopee,
            };
            break;
        }
        case 'crawler': {
            // How many crawler is in this crawling session
            response.data = {};

            const platform = req.query.platform || 'all';

            const timingValue = initTimingValue();
            const query = { update: { $gt: timingValue.startTime } };

            let countShopee = 0;
            let countTiki = 0;

            if (platform.includes('shopee') || platform === 'all') {
                countShopee = (await LogShopee.distinct('crawler', query)).length;
                response.data.shopee = countShopee;
            }
            if (platform.includes('tiki') || platform === 'all') {
                countTiki = (await LogTiki.distinct('crawler', query)).length;
                response.data.tiki = countTiki;
            }

            response.data.total = countShopee + countTiki
            break;
        }
        case 'crawling-progress': {
            // Percent of crawling processes
            response.data = {};

            const platform = req.query.platform || 'all';
            const timingValue = initTimingValue();
            const query = { expired: { $lt: timingValue.expiredTime } };

            response.data.expiredTime = timingValue.expiredTime;

            if (platform.includes('shopee') || platform === 'all') {
                const totalShopee = await ItemShopee.countDocuments();
                const countExpiredShopee = await ItemShopee.countDocuments(query);

                let executionTimeInMs;
                if (countExpiredShopee === 0) {
                    const latestLog = await LogShopee.findOne({ 
                        "data.message": COMPLETE_CRAWLING_MESSAGE,
                        crawler: `shopee${REPRESENTATIVE_CRAWLER_ID}`
                    }).sort({update: -1});
                    executionTimeInMs = latestLog?._doc.data?.executionTimeInMs || -1;
                }

                response.data.shopee = {
                    total: totalShopee,
                    expired: countExpiredShopee, 
                    updated: totalShopee - countExpiredShopee,
                    executionTimeInMs,
                }
            }

            if (platform.includes('tiki') || platform === 'all') {
                const totalTiki = await ItemTiki.countDocuments();
                const countExpiredTiki = await ItemTiki.countDocuments(query);

                let executionTimeInMs;
                if (countExpiredTiki === 0) {
                    const latestLog = await LogTiki.findOne({ 
                        "data.message": COMPLETE_CRAWLING_MESSAGE,
                        crawler: `tiki${REPRESENTATIVE_CRAWLER_ID}`
                    }).sort({update: -1});
                    executionTimeInMs = latestLog?._doc.data?.executionTimeInMs || -1;
                }

                response.data.tiki = {
                    total: totalTiki,
                    expired: countExpiredTiki,
                    updated: totalTiki - countExpiredTiki,
                    executionTimeInMs,
                }
            }
            break;
        }
        case 'item': {
            // How many item 
            response.data = {};

            const platform = req.query.platform || 'all';

            let countShopee = 0;
            let countTiki = 0;

            if (platform.includes('shopee') || platform === 'all') {
                countShopee = await ItemShopee.countDocuments(); 
                response.data.shopee = countShopee;
            }
            if (platform.includes('tiki') || platform === 'all') {
                countTiki = await ItemTiki.countDocuments();
                response.data.tiki = countTiki;
            }
            response.data.total = countTiki + countShopee;
            break;
        }
        case 'category': {
            // How many category 
            response.data = {};

            const platform = req.query.platform || 'all';

            let countShopee = 0;
            let countTiki = 0;

            if (platform.includes('shopee') || platform === 'all') {
                countShopee = await CategoryShopee.countDocuments(); 
                response.data.shopee = countShopee;
            }
            if (platform.includes('tiki') || platform === 'all') {
                countTiki = await CategoryTiki.countDocuments();
                response.data.tiki = countTiki;
            }
            response.data.total = countTiki + countShopee;
            break;
        }
        case 'crawling-time': {
            // How many category 
            response.data = {};

            const platform = req.query.platform || 'all';
            const start = Number(req.query.start) || 0;
            const end = Number(req.query.end) || new Date().getTime();

            const query = { 
                update: { $gte: start, $lte: end },
                "data.message": COMPLETE_CRAWLING_MESSAGE,
            };

            if (platform.includes('shopee') || platform === 'all') {
                const logs = await LogShopee.find({...query, crawler: `shopee${REPRESENTATIVE_CRAWLER_ID}`}).sort({update: -1});
                const result = logs.map(log => {
                    return {
                        update: log._doc.update,
                        executionTimeInMs: log._doc.data.executionTimeInMs,
                    }
                })
                response.data.shopee = result;
            }
            if (platform.includes('tiki') || platform === 'all') {
                const logs = await LogTiki.find({...query, crawler: `tiki${REPRESENTATIVE_CRAWLER_ID}`}).sort({update: -1});
                let result = logs.map(log => {
                    return {
                        update: log._doc.update,
                        executionTimeInMs: log._doc.data.executionTimeInMs,
                    }
                })

                // This is also a dumb way to do solve problem. Can do anything else because sometimes crawler tiki is down causing lacking data.
                // So I will fake a few data from tikiCrawler01. 
                const dataShopeeLength = response.data?.shopee?.length || 0;
                if (dataShopeeLength && result.length < dataShopeeLength) {
                    const addition = await LogTiki.find({...query, crawler: `tiki${ALTERNATIVE_CRAWLER_ID}`}).limit(dataShopeeLength - result.length).sort({update: -1});
                    result = result.concat(addition.map(log => {
                        return {
                            update: log._doc.update,
                            executionTimeInMs: log._doc.data.executionTimeInMs,
                        }
                    }))
                }

                response.data.tiki = result;
            }
            break;
        }
        default:
            return next(new ErrorResponse('Invalid type of statistic'))
    }

    return res.status(200).json(response);
});