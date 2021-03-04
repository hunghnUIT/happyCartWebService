const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const settings = require('../settings');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    phone: {
        type: String,
        // required: [true, 'Please add an phone number'],
        unique: true,
        match: [
            /((09|03|07|08|05)+([0-9]{8})\b)/g,
            'Please add a valid phone number'
        ]
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Sign JWT and return 
UserSchema.pre('save', async function (next) {
    if(this.isModified('password')){
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    
});

// Sign JWT and return
UserSchema.methods.getAccessToken = function () {
    return jwt.sign({id: this._id} , process.env['JWT_SECRET'], {
        expiresIn: settings.JWT_EXPIRE
    })
}

// Sign JWT and return 
UserSchema.methods.getRefreshToken = function () {
    return jwt.sign({id: this._id} , process.env['JWT_SECRET_FOR_REFRESH'], {
        expiresIn: settings.JWT_EXPIRE
    })
}

// Check match password
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(this.password, enteredPassword);
}

// Generate and hash password token
UserSchema.methods.getResetPasswordToken = function () {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set expires
    this.resetPasswordExpire = Date.now() + 10*60*1000; // in ms

    return resetToken;
};

module.exports = mongoose.model('User', UserSchema);