const jwt = require('jsonwebtoken');
const asyncHandler = require('./asyncHandler');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

exports.protect = asyncHandler(async (req, res, next)=>{
    let token;

    if(req.headers.authorization && req.headers.authorization.statsWith("Bearer"))
        token = req.headers.authorization.replace("Bearer ", "");
    else if(req.cookies.accessToken)
        token = req.cookies.accessToken;
    
    if(!token)
        return next(new ErrorResponse("Not authorize to access this route", 401));

    try {
        const decoded = jwt.verify(token, process.env['JWT_SECRET']);
        req.user = await User.findById(decoded.id);
        next(); //IMPORTANT
    } catch (error) {
        return next(new ErrorResponse("Not authorize to access this route", 401));
    }
})

exports.authorize = (...roles )=>{
    return (req, res, next)=>{
        if(!req.user)
            return next(new ErrorResponse("Login required.", 401));
        if(roles.includes('admin') && req.user.isAdmin !== true)
            return next(new ErrorResponse(`User doesn't have authorization to access this route`, 403));
        next();
    };
};