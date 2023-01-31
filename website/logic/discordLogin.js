const express = require('express');
const session = require('express-session');
const router = express.Router();
const passport = require('passport');
const { Strategy } = require('passport-discord');

const settings = require('../../settings.json').discord;

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new Strategy({
    clientID: settings.clientId,
    clientSecret: settings.clientSecret,
    callbackURL: settings.callbackUrl,
    scope: ['identify', 'guilds', 'guilds.members.read']
}, async (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

const ourSession = session({
    secret: settings.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 1
    }
});

router.use(ourSession);

router.use(passport.initialize());
router.use(passport.session());

router.get('/auth/oauth2', passport.authenticate('discord'), (req, res) => res.send(200));
router.get('/auth/oauth2/redirect', passport.authenticate('discord'), (req, res) => res.redirect(307, '/'));
router.get('/logout', (req, res) => {
    req.logout();
    res.redirect(307, '/');
});

// check if the user is an admin
router.use((req, res, next) => {
    if (req.user) {
        // check if user is admin
        if (settings.admin !== null && settings.admin.length) {
            if (settings.admin.indexOf(req.user.id) > -1) {
                if (req.session)
                    req.session.admin = true;
            }
        }
    }

    next();
});

module.exports = {
    router,
    session: ourSession
};