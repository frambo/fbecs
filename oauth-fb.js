/**
 * Oauth based authentication module based on "passport" and "passport-facebook" oauth library
 * @module 
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var config = require('./oauth.js');
var passport = require('passport');
var fs = require('fs');
var path = require('path');
var FacebookStrategy = require('passport-facebook').Strategy;

// connect to the database
mongoose.connect('mongodb://localhost:27017/fbecsdb');

// create a user model
var User = mongoose.model('User', new Schema({
	oauthID: String,
	name: String,
	role: String
}), 'usercollection');

// config
passport.use(new FacebookStrategy({
		clientID: config.facebook.clientID,
		clientSecret: config.facebook.clientSecret,
		callbackURL: config.facebook.callbackURL
	},
	function(accessToken, refreshToken, profile, done) {
		User.findOne({
			oauthID: profile.id
			//test invalid user - oauthID: '12345'
		}, function(err, user) {
			if (err) {
				console.log(err);
				return done(err);
			} else {
				if (!err && user != null) {
					console.log("User found!");

					// save token to file
					var fname = path.join(__dirname, 'oauth-fb.json');
					fs.writeFile(fname, JSON.stringify({
						"id": profile.id,
						"accessToken": accessToken
					}, null, 4), function(err) {
						if (err) {
							console.log(err);
						}
					});

					process.nextTick(function() {
						return done(null, user);
					});

				} else {
					console.log("User NOT found!");
					return done(null, false, {
						message: 'Unknown user!!'
					});
				}
			}
		});
	}));

// serialize and deserialize
passport.serializeUser(function(user, done) {
	done(null, user.oauthID);
});

passport.deserializeUser(function(id, done) {
	User.findOne({
		oauthID: id
	}, function(err, user) {
		done(err, user);
	});
});


module.exports = passport