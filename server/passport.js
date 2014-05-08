var util = require('util');
var logger = require('winston');
var mongoose = require('mongoose');
var LocalStrategy = require('passport-local').Strategy;
var GitHubStrategy = require('passport-github').Strategy;

var User = mongoose.model('User');

/**
 * Defines the authentication strategies and user serialization.
 *
 * @param passport Passport module
 * @param config Passport configuration from settings
 */
module.exports = function(passport, config) {

	// serialize sessions
	passport.serializeUser(function(user, done) {
		done(null, user.id);
	});

	passport.deserializeUser(function(id, done) {
		User.findOne({ _id: id }, function(err, user) {
			done(err, user);
		})
	});

	// use local strategy
	passport.use(new LocalStrategy({
			usernameField: 'email',
			passwordField: 'password'
		},
		function(email, password, done) {
			User.findOne({ email: email }, function(err, user) {
				if (err) {
					return done(err);
				}
				if (!user) {
					return done(null, false, { message: 'Unknown user' });
				}
				if (!user.authenticate(password)) {
					return done(null, false, { message: 'Invalid password' });
				}
				return done(null, user);
			});
		}
	));

	// use github strategy
	if (config.vpdb.passport.github.enabled) {
		passport.use(new GitHubStrategy({
				clientID: config.vpdb.passport.github.clientID,
				clientSecret: config.vpdb.passport.github.clientSecret,
				callbackURL: config.vpdb.passport.github.callbackURL
			},
			function (accessToken, refreshToken, profile, done) {
				User.findOne({ 'github.id': profile.id }, function (err, user) {
					if (!user) {
						logger.info('[passport|github] Saving new user %s', profile.emails[0].value);
						user = new User({
							name: profile.displayName, email: profile.emails[0].value, username: profile.username, provider: 'github', github: profile._json
						});
						user.save(function (err) {
							if (err) {
								logger.error('[passport|github] Error saving user: %s', err);
							}
							return done(err, user);
						});
					} else {
						logger.info('[passport|github] Returning user %s', profile.emails[0].value);
						return done(err, user);
					}
				});
			}
		));
	}

	_.each(config.vpdb.passport.ipboard, function(ipbConfig) {
		if (ipbConfig.enabled) {
			var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
			passport.use(ipbConfig.id, new OAuth2Strategy({
					authorizationURL: ipbConfig.baseURL + '?app=oauth2server&module=main&section=authorize',
					tokenURL: ipbConfig.baseURL + '?app=oauth2server&module=main&section=token', // http://50.7.38.235/forums/index.php
					clientID: ipbConfig.clientID, // 'ESk86muBx2ts3Y549XH48y7wZUUnzBtf'
					clientSecret: ipbConfig.clientSecret, //'SurferSelect!2.',
					callbackURL: 'http://localhost:3000/auth/' +  ipbConfig.baseURL + '/callback'
				},
				function (accessToken, refreshToken, profile, done) {
					logger.info('Got profile from IP.Board: ', util.inspect(profile));
					done();
				}
			));
		}
	});

};
