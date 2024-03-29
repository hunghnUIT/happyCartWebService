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
    // April 28th 2021: Realized phone number is no longer necessary => use email to auth instead.
    // phone: {
    //     type: String,
    //     required: [!isAuthByThirdParty, 'Please add an phone number'],
    //     unique: true,  sparse: true, // unique if not null
    //     match: [
    //         /((09|03|07|08|05)+([0-9]{8})\b)/g,
    //         'Please add a valid phone number'
    //     ]
    // },
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
        required: [!isAuthByThirdParty, 'Please add a password'],
        minlength: 6,
        select: false,
        match: [
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/,
            'Password must contain at least 8 characters, 1 number, 1 upper and 1 lowercase'
        ]
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: {
        type: Number,
        default: Date.now
    },
    isAuthByThirdParty: {
        type: Boolean,
        default: false,
    },
    provider: {
        type: String,
        required: isAuthByThirdParty, 
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    deviceToken: String,
    isOnline: Boolean,
},
{
    toJSON: { virtuals: true},
    toObject: { virtuals: true}
});

/**
 * If auth by third party (google, facebook, etc.), these field **won't** be required 
 * @returns Boolean
 */
function isAuthByThirdParty() {
    return this.isAuthByThirdParty;
}

UserSchema.virtual('TrackedItemsTiki', {
    ref: 'TrackedItemTiki',
    localField: '_id',
    foreignField: 'user',
    justOne: false
});

UserSchema.virtual('TrackedItemsShopee', {
    ref: 'TrackedItemShopee',
    localField: '_id',
    foreignField: 'user',
    justOne: false
});

// Sign JWT and return 
UserSchema.pre('save', async function (next) {
    if(this.isModified('password')){
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

// Sign JWT and return
UserSchema.methods.getAccessToken = function () {
    return jwt.sign({id: this._id} , process.env['JWT_SECRET'], {
        expiresIn: settings.JWT_EXPIRE
    })
}

UserSchema.methods.getAccessTokenExpiredTime = function () {
    const ttl = settings.JWT_EXPIRE;
    let num = '';
    let unit = '';
    for (const c of ttl) {
        if (Number.isInteger(Number(c)))
            num += c;
        else if (RegExp(/^\p{L}/,'u').test(c))
            unit += c;
    }
    return new Date().getTime() + Number(num) * settings.TIME_UNIT_TO_MS[unit];
}

// Sign JWT and return 
UserSchema.methods.getRefreshToken = function () {
    return jwt.sign({id: this._id} , process.env['JWT_SECRET_FOR_REFRESH'], {
        expiresIn: settings.JWT_EXPIRE_FOR_REFRESH
    })
}

// Check match password
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
}

// Generate and hash password token
UserSchema.methods.getResetPasswordToken = function () {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set expires
    this.resetPasswordExpire = Date.now() + 10*60*1000; // in ms, 10 mins

    return resetToken;
};

UserSchema.methods.getVerifyEmailToken = function () {
    // This is a different way from getResetPasswordToken and I considering which way should I use
    // Verify process use the same secret key with accessToken
    return jwt.sign({id: this._id} , process.env['JWT_SECRET'], {
        expiresIn: '1d'
    })
};

const myDB = mongoose.connection.useDb('USER');

module.exports = myDB.model('User', UserSchema, 'Users');