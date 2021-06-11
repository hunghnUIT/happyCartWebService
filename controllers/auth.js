const User = require('../models/User');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const jwt = require('jsonwebtoken');
const sendMail = require('../utils/sendEmail')
const crypto = require('crypto');

/**
 * Register user
 * @route   POST /api/v1/auth/register
 * @access  public
 */
exports.register = asyncHandler(async (req, res, next) => {
    const { name, email, password } = req.body;

    const user = await User.findOne({email: email, isVerified: true, isAdmin: false});

    if (user) 
        return next(new ErrorResponse('User already exists', 422));
    
    User.findOne({ email: email }, async (err, user) => {
        if (err) {
            console.log(err);
            return next(new ErrorResponse(err.message), err.code || 500);
        }

        if (user) {
            user.name = name;
            user.password = password || ""; // Add default value for showing error for password

            await user.save().catch(err => next(new ErrorResponse(err.message)));
        }
        else 
            user = await User.create({ email, name, password }).catch(err => next(new ErrorResponse(err.message)));

        if (user) {
            const requestVerify = await requestVerifyEmail(req, email).catch(err => next(new ErrorResponse(err.message, err.code)));
            if (requestVerify)
                return res.status(200).json({
                    success: true,
                    message: 'Waiting for the verification of email'
                });
        }
        else 
            return next(new ErrorResponse('Can not create user'));
    });
});

/**
 * Send email to verify user's email
 * @param {Object} req information of request
 * @param {String} email to verify
 */
const requestVerifyEmail = async (req, email) => {
    const user = await User.findOne({ email: email });

    // Get reset token
    const verifyToken = user.getVerifyEmailToken();

    // Create verify url
    const verifyURL = `${req.protocol}://${req.get('host')}/api/v1/auth/register/verify/${verifyToken}`

    const message = `You are receiving this email because you (or someone else) has requested the verification of email. Click at the link below to verify the email if that person was you: \n\n ${verifyURL}`

    let success = false;
    try {
        await sendMail({
            email: user.email,
            subject: 'Email verification',
            message,
        });
        success = true;
    } catch (error) {
        console.log(error);
        throw new ErrorResponse('Email could not be sent', 500);
    }

    return success;
};

/**
 * Verify account
 * @route   GET /api/v1/auth/register/verify/:token
 * @access  public
 */
exports.verifyEmail = asyncHandler(async (req, res, next) => {
    const token = req.params.token || "";

    try {
        const decoded = jwt.verify(token, process.env['JWT_SECRET']);
        const user = await User.findById(decoded.id);

        // Not found token or token expires
        if (!user) {
            return res.status(401).send('Invalid or expired token');
        }

        user.isVerified = true;
        await user.save();

        res.setHeader('Content-type','text/html');
        // &#10004; Check mark in html
        return res.send(`
            <span style="width: 100%; text-align: center;">
                <h3>
                    <span style="color:green; font-size:2rem">&#127881;</span>
                        Congratulations
                    <span style="color:green; font-size:2rem">&#127881;</span>
                </h3>
                <h3>Your email address <a style="text-decoration: none;" href="mailto:${user.email}">${user.email}</a> has been verified.</h3>
            </span>`);
    } catch (error) {
        return res.status(401).send('Invalid or expired token');
    }    
});

/**
 * Login
 * @route   POST /api/v1/auth/login?asAdmin=true
 * @access  public
 */
exports.login = asyncHandler(async (req, res, next) => {
    const { email, password, deviceToken } = req.body;
    const loginAsAdmin = req.query.asAdmin === 'true' ? true : false;

    if (!email || !password)
        return next(new ErrorResponse('Please provide both email and password', 400));
    // if (!deviceToken)
    //     return next(new ErrorResponse('No deviceToken provided', 400));

    let user;
    if (!loginAsAdmin)
        user = await User.findOne({ email: email, isAdmin: false }).select('+password');
    else
        user = await User.findOne({ email: email, isAdmin: true }).select('+password');

    if (!user)
        return next(new ErrorResponse('Invalid credentials', 401));
    
    if (!user.isVerified)
        return next(new ErrorResponse('Please verify your email to continue', 422));

    const isMatch = await user.matchPassword(password);
    if (!isMatch)
        return next(new ErrorResponse('Invalid credentials', 401));

    // Set info for firebase
    user.isOnline = true;
    user.deviceToken = deviceToken;
    // No validate because password is in hash format, validating will raises error
    await user.save({ validateBeforeSave: false }).catch(err => next(new ErrorResponse(err.message)));

    sendTokenResponse(user, 200, res);
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
 * @param {String} refToken if provided, refreshToken won't be re-create again.
 * @param {String} include choose which field of **user** will be returned in json response too.
 */
const sendTokenResponse = (user, statusCode, res, refToken, include) => {
    const accessTokenExpiredAt = user.getAccessTokenExpiredTime();
    const accessToken = user.getAccessToken();
    const refreshToken = refToken || user.getRefreshToken();

    const including = include ? include.split(',') : [];

    const options = {
        expired: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 60 * 60 * 1000), // 1h
        httpOnly: true,
    }

    if (process.env.NODE_ENV === 'production')
        options.secure = true;

    let response = {
        success: true,
        accessToken: accessToken,
        refreshToken: refreshToken,
        accessTokenExpiredAt: accessTokenExpiredAt,
    }

    for (const info of including){
        response[info.trim()] = user[info.trim()];        
    }

    res.status(statusCode)
        .cookie('accessToken', accessToken, options)
        .cookie('refreshToken', refreshToken, options)
        .json(response)
}

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

    await User.findByIdAndUpdate(req.user.id, {
        deviceToken: null,
        isOnline: false,
    }).catch(err => next(new ErrorResponse(err.message)));

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
    const resetURL = `${req.protocol}://${req.get('host')}/auth/reset-password/${resetToken}`

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

        return next(new ErrorResponse('Email could not be sent'), 500)
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
        return next(new ErrorResponse("Invalid or expired token", 401))
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







// FIXME temporary code until I find another way to do this, DELETE AS SOON AS POSSIBLE.
/**
 * Reset password for get method
 * @route   GET /auth/reset-password/:token
 * @access  public
 */
exports.getUIResetPassword = async (req, res, next) => {
    const token = req.params.token || "";

    // Get hashed token
    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find the user having resetToken and it still available
    const user = await User.findOne({
        resetPasswordToken: resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    });

    // Not found token or token expires
    if (!user) {
        return res.status(401).send('Invalid or expired token');
    }

    return res.render('reset-password');
};

/**
 * Reset password for post method
 * @route   POST /auth/reset-password/:token
 * @access  public
 */
exports.postUIResetPassword = async (req, res, next) => {
    const token = req.params.token || "";

    // Get hashed token
    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find the user having resetToken and it still available
    const user = await User.findOne({
        resetPasswordToken: resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    });

    // Not found token or token expires
    if (!user) {
        return res.status(401).send('Invalid or expired token');
    }

    // Set the new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined // Remove both two field below from DB.
    user.resetPasswordExpire = undefined

    let errMsg = '';
    await user.save().catch(err => {
        errMsg = err.message;
    });

    if (errMsg)
        return res.status(400).send(`${errMsg}`);
    else
        return res.status(200).send('Success');
}