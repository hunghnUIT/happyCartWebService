const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');
const ObjectId = require('mongoose').Types.ObjectId;

const initLoginFacebook = () => {
    // Passport session setup. 
    passport.serializeUser(function (user, done) {
        done(null, user);
    });

    passport.deserializeUser(function (obj, done) {
        done(null, obj);
    });

    passport.use(new FacebookStrategy({
        clientID: process.env.facebookAppId,
        clientSecret: process.env.facebookSecret,
        callbackURL: process.env.callbackUrl,
        profileFields: ['id', 'displayName', 'email', 'first_name', 'last_name', 'middle_name']
    },
        function (accessToken, refreshToken, profile, done) {
            process.nextTick(function () {
                const profileId = `${'0'.repeat(24 - (profile.id).length)}${profile.id}`;
                User.findById(profileId, function (err, user) {
                    if (err)
                        return done(err);
                    if (user) {
                        return done(null, user); // user found, return that user, allow user to login
                    }
                    else {
                        // create new User
                        const newUser = new User();
                        newUser._id = ObjectId(profileId);
                        newUser.name = profile.displayName;
                        newUser.email = profile.emails[0].value; // fb can return many emails, just grab the first of theme.
                        newUser.isAuthByThirdParty = true;
                        newUser.provider = profile.provider;

                        // Save to DB
                        newUser.save(function (err) {
                            if (err)
                                throw err;
                            // success, return user
                            return done(null, newUser);
                        });
                    }
                })
            });
        }
    ));
};

module.exports = initLoginFacebook;
