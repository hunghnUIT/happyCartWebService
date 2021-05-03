const asyncHandler = require('../middlewares/asyncHandler');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

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