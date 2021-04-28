const User = require('../models/User');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const jwt = require('jsonwebtoken');
const TrackedItemTiki = require('../models/TrackedItemTiki');
const TrackedItemShopee = require('../models/TrackedItemShopee');
const ItemTiki = require('../models/ItemTiki');
const ItemShopee = require('../models/ItemShopee');
const sendMail = require('../utils/sendEmail')
const crypto = require('crypto');

/**
 * Register user
 * @route   POST /api/v1/auth/register
 * @access  public
 */
exports.register = asyncHandler(async (req, res, next) => {
    const { name, email, password } = req.body;

    const user = await User.create({
        name,
        email,
        password,
    });

    sendTokenResponse(user, 200, res);
});

/**
 * Login
 * @route   POST /api/v1/auth/login
 * @access  public
 */
exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password)
        return next(new ErrorResponse('Please provide both email and password', 400));

    const user = await User.findOne({ email: email }).select('+password');

    if (!user)
        return next(new ErrorResponse('Invalid credentials', 401));

    const isMatch = await user.matchPassword(password);
    if (!isMatch)
        return next(new ErrorResponse('Invalid credentials', 401));

    sendTokenResponse(user, 200, res);
});

/**
 * View my account
 * @route   GET /api/v1/auth/my-account?include=item
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
 * Refresh access token 
 * @route   POST /api/v1/auth/token
 * @access  private
 */
exports.refreshToken = asyncHandler(async (req, res, next) => {
    let token;

    if (req.body.refreshToken)
        token = req.body.refreshToken;
    else if (req.cookies.refreshToken)
        token = req.cookies.refreshToken;

    if (!token)
        return next(new ErrorResponse("No refresh token provided.", 400));

    try {
        const decoded = jwt.verify(token, process.env['JWT_SECRET_FOR_REFRESH']);
        const user = await User.findById(decoded.id);

        sendTokenResponse(user, 200, res, token);
    } catch (error) {
        return next(new ErrorResponse("Invalid refresh token", 401));
    }
});

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
}

/**
 * Change password for user 
 * @route   PUT /api/v1/auth/change-password
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
 * Update detail account
 * @route   PUT /api/v1/auth/update-account
 * @access  private
 */
exports.updateAccount = asyncHandler(async (req, res, next) => {
    // Only allow to edit fields bellow.
    const fieldsToUpdate = {
        name: req.body.name,
        email: req.body.email
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
 * Logout user 
 * @route   GET /api/v1/auth/logout
 * @access  private
 */
exports.logout = asyncHandler(async (req, res, next) => {
    const options = {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    };

    res
        .cookie('accessToken', 'none', options)
        .cookie('refreshToken', 'none', options);

    return res.status(200).json({
        success: true,
        data: {}
    });
});

exports.failAuthFacebook = asyncHandler(async (req, res, next) => {
    return next(new ErrorResponse(`Login failed, please try again.`))
});

exports.successAuthFacebook = asyncHandler(async (req, res, next) => {
    res.status(200).json({
        success: true,
        user: req.user,
        info: req.info,
    });
});

/**
 * Forgot password
 * @route   POST /api/v1/auth/forgot-password
 * @access  public
 */
exports.forgotPassword = asyncHandler(async (req, res, next) => {
    const email = req.body.email || "";
    if (!email)
        return next(new ErrorResponse('Email is required.'));

    const user = await User.findOne({ email: email });

    if (!user) {
        return next(new ErrorResponse("No user with that email found.", 404));
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    user.save({ validateBeforeSave: false });

    // Create reset url
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/auth/reset-password/${resetToken}`

    const message = `You are receiving this email because you (or someone else) has requested the reset of password. Please make a PUT request to: \n\n ${resetURL}`

    try {
        await sendMail({
            email: user.email,
            subject: 'Password reset token',
            message,
        });

    } catch (error) {
        console.log(error);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save({ validateBeforeSave: false })

        return next(ErrorResponse('Email could not be sent'), 500)
    }

    res.status(200).json({
        success: true,
        data: 'Email sent',
    });
});

/**
 * Reset password
 * @route   PUT /api/v1/auth/reset-password/:token
 * @access  public
 */
exports.resetPassword = asyncHandler(async (req, res, next) => {
    const token = req.params.token || "";

    // Get hashed token
    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find the user having resetToken and it still available
    let user = await User.findOne({
        resetPasswordToken: resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    });

    // Not found token or token expires
    if (!user) {
        return next(new ErrorResponse("Invalid token", 400))
    }

    // Set the new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined // Remove both two field below from DB.
    user.resetPasswordExpire = undefined

    await user.save();

    // Log user in after that.
    sendTokenResponse(user, 200, res);
    return;
});