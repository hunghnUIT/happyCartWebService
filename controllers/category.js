const asyncHandler = require('../middlewares/asyncHandler');
const StandardCategory = require('../models/StandardCategory');

exports.getAllStandardCategories = asyncHandler(async (req, res,next) => {
    const cates = await StandardCategory.find().select('id name -_id');
    
    return res.status(200).json({
        success: true,
        standardCategories: cates,
    });
});