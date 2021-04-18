const express = require('express');
const passport = require('passport');
const router = express.Router();

const { failAuthFacebook, successAuthFacebook } = require('../controllers/auth');

router.use(passport.initialize());
router.use(passport.session());

router
    .get('/login', passport.authenticate('facebook', { scope: ['email'] }))
    .get('/callback', passport.authenticate('facebook', {
        failureRedirect: '/api/v1/auth/facebook/fail',
        successRedirect: '/api/v1/auth/facebook/success',
    }))
    .get('/fail', failAuthFacebook)
    .get('/success', successAuthFacebook)

module.exports = router;