const asyncHandler = require('./asyncHandler');

const redis = require('../config/redis').getConnection();


exports.cacheReview = asyncHandler(async (req, res, next) => {
    const {itemId} = req.params;
    const platform = req.query.platform || "";

    if(!platform ){
        return next(new ErrorResponse(`Platform is required`));
    }

    redis.hgetall(`review-${itemId}-${platform}`).then((reply, err)=>{
        if(err)
            console.log(err.message);
        else if(reply){
            const data = reply['data'];
            return res.status(200).json(JSON.parse(data));
        }
        else 
            next();
    }).catch(err=>{
        console.log(err.message);
    })
});