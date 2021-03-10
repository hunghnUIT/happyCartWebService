const ErrorResponse = require('../utils/errorResponse');

const errorHandler = (err, req, res, next) => {
    let error = {...err};
    error.message = err.message;

    if(error.message === 'CastError'){
        const message = `Resource id ${err.id} not found`;
        error = new ErrorResponse(message, 404);
    }
    else if (error.name === 'ValidatorError'){
        const message = Object.values(err.errors).map(err => err.message);
        error = new ErrorResponse(message, 400);
    }
    // Mongoose duplicate key
    else if (error.code === 11000){
        const message = err.message;
        error = new ErrorResponse(message, 400);
    }
    res.status(error.code || 400 ).json({
        success: false,
        message: error.message,
    })
}

module.exports = errorHandler;