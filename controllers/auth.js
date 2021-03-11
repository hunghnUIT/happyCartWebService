const User = require('../models/User');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const jwt = require('jsonwebtoken');

/**
 * @description Register user
 * @route   POST /api/v1/auth/register
 * @access  public
 */
exports.register = asyncHandler(async (req, res, next)=>{
    const {name, phone, email, password} = req.body;

    const user = await User.create({
        name,
        phone,
        email,
        password,
    });

    sendTokenResponse(user, 200, res);
});

/**
 * @description login
 * @route   POST /api/v1/auth/login
 * @access  public
 */
exports.login = asyncHandler(async (req, res, next)=>{
    const {phone, password} = req.body;

    if(!phone || !password)
        return next(new ErrorResponse('Please provide both phone and password', 400));
    
    const user = await User.findOne({phone: phone}).select('+password');

    if(!user)
        return next(new ErrorResponse('Invalid credentials', 401));

    const isMatch = await user.matchPassword(password);
    if(!isMatch)
        return next(new ErrorResponse('Invalid credentials', 401));
    
    sendTokenResponse(user, 200, res);
});

/**
 * @description view my account
 * @route   GET /api/v1/auth/my-account
 * @access  private
 */
exports.myAccount = asyncHandler(async(req, res, next)=>{
    const user = await User.findById(req.user._id);
    return res.status(200).json({
        success: true,
        data: user,
    })
});

/**
 * @description refresh access token 
 * @route   POST /api/v1/auth/token
 * @access  private
 */
exports.refreshToken = asyncHandler(async(req, res, next)=>{
    let token;

    if(req.body.refreshToken)
        token = req.body.refreshToken;
    else if(req.cookies.refreshToken)
        token = req.cookies.refreshToken;
    
    if(!token)
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
 * @description return tokens and status
 * @param {Schema} user user logged in or registered
 * @param {Number} statusCode HTTP response code
 * @param {any} res for response purpose.
 */
const sendTokenResponse = (user, statusCode, res, refToken)=>{
    const accessToken = user.getAccessToken();
    const refreshToken = refToken || user.getRefreshToken();

    const options = {
        expired: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 60 * 60 * 1000), // 1h
        httpOnly: true,
    }

    if(process.env.NODE_ENV === 'production')
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
 * @description change password for user 
 * @route   GET /api/v1/auth/logout
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
 * @description logout user 
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
})