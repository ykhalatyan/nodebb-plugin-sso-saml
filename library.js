(function(module) {
	"use strict";

	var user = module.parent.require('./user'),
		meta = module.parent.require('./meta'),
		db = module.parent.require('../src/database'),
		passport = module.parent.require('passport'),
		passportSAML = require('passport-saml').Strategy,
		fs = module.parent.require('fs'),
		path = module.parent.require('path'),
		nconf = module.parent.require('nconf'),
		async = module.parent.require('async'),
		winston = require('winston');

	var constants = Object.freeze({
		'name': "SAML",
		'admin': {
			'route': '/plugins/sso-saml',
			'icon': 'fa-university'
		}
	});

	var SAML = {};
	var samlObj;

	if (meta.config['sso:saml:idpentrypoint'] && meta.config['sso:saml:callbackpath']&& meta.config["sso:saml:metadata"] && meta.config["sso:saml:issuer"]) {
		
		samlObj = new passportSAML({
			    path: meta.config['sso:saml:callbackpath'],
			    entryPoint: meta.config['sso:saml:idpentrypoint'],
			    issuer: meta.config['sso:saml:issuer'],
			    callbackUrl: nconf.get('url') + meta.config['sso:saml:callbackpath'],
			    disableRequestedAuthnContext: true,
			    identifierFormat: null
		  	},
		  	function(profile, done) {
			console.log(profile);	
		    	var user = {
			        nameID: profile.nameID,
			        nameIDFormat: profile.nameIDFormat,
			        sn: profile['urn:oid:2.5.4.4'], // sn
				//sn: profile.sn,
			        cn: profile['urn:oid:2.5.4.42'], // givenname
				//cn: profile.cn,
			        //mail: profile.mail,
			        //eduPersonAffiliation: profile.eduPersonAffiliation,
			        email: profile.mail,
				//email: profile.email,
			        username: profile['urn:oid:1.3.6.1.4.1.5923.1.1.1.2'], // eduPersonNickname
				//username: profile.eduPersonNickname
			    };

			    SAML.login(user,function(err, user) {
					if (err) {
						return done(err);
					}
					done(null, user);
				});
		  	}
		);
	}
	else{
		console.log("No config info")
		console.log(meta.config);
	}


	SAML.init = function(params, callback) {

		function render(req, res, next) {
			res.render('admin/plugins/sso-saml', {});
		}

		params.router.get('/admin/plugins/sso-saml', params.middleware.admin.buildHeader, render);
		params.router.get('/api/admin/plugins/sso-saml', render);

		if (samlObj){

			if (meta.config["sso:saml:metadata"]) {
				params.router.get(meta.config["sso:saml:metadata"], function(req, res) {
					if (meta.config["sso:saml:servercrt"]){
					 	var cert = fs.readFileSync(meta.config["sso:saml:servercrt"], 'utf-8');
					  	res.header("Content-Type", "application/xml");
					  	res.send(samlObj.generateServiceProviderMetadata(cert))
					}
					else{
						res.send("No servercrt specified. Please enter it at nodebb admin panel.");
					}
				});
			}

			params.router.post(meta.config['sso:saml:callbackpath'],
				passport.authenticate('saml'),
				function(req, res, next){
					if (meta.config['sso:saml:loginsuccessredirecturl']){
						res.redirect(meta.config['sso:saml:loginsuccessredirecturl']);
					}
					else{
						res.redirect("/");
					}

				}

			);

			if (meta.config['sso:saml:logouturl']) {

				params.router.get(meta.config['sso:saml:logouturl'],function(req,res){
					if (req.user && parseInt(req.user.uid, 10) > 0) {
						winston.info('[Auth] Session ' + req.sessionID + ' logout (uid: ' + req.user.uid + ')');

						var ws = module.parent.require('./socket.io');
						ws.logoutUser(req.user.uid);

						req.logout();

						if (meta.config['sso:saml:logoutredirecturl']){
							res.redirect(meta.config['sso:saml:logoutredirecturl']);
						}
						else{
							res.redirect("/");
						}
					}


				});
			}

		}

		callback();
	};

	SAML.getStrategy = function(strategies, callback) {

		if (samlObj){
		
			passport.use(samlObj);

			strategies.push({
				name: 'saml',
				url: '/auth/saml',
				callbackURL: meta.config['sso:saml:callbackpath'],
				icon: constants.admin.icon,
				scope: ''
			});
		}

		callback(null, strategies);
	};

	SAML.login = function(userdata, callback) {

		SAML.getUidBySAMLId(userdata.username, function(err, uid) {
			if(err) {
				return callback(err);
			}

			if (uid !== null) {
				// Existing User
				callback(null, {
				 	uid: uid
				});
			}
			else {
				console.log(userdata);
				// New User
				user.create({
					username: userdata.username,
					email: userdata.email,
					fullname : userdata.first_name + " " + userdata.last_name
							
				}, function(err, uid) {
					if(err) {
						return callback(err);
					}
					user.setUserField(uid, 'samlid', userdata.username);
					db.setObjectField('samlid:uid', userdata.username, uid);

					callback(null, {
						uid: uid
					});
				});
			}
		});
	};

	SAML.getUidBySAMLId = function(samlid, callback) {
		db.getObjectField('samlid:uid', samlid, function(err, uid) {
			if (err) {
				return callback(err);
			}
			callback(null, uid);
		});
	};

	SAML.addMenuItem = function(custom_header, callback) {
		custom_header.authentication.push({
			"route": constants.admin.route,
			"icon": constants.admin.icon,
			"name": constants.name
		});

		callback(null, custom_header);
	};

	SAML.deleteUserData = function(uid, callback) {
		async.waterfall([
			async.apply(user.getUserField, uid, 'samlid'),
			function(idToDelete, next) {
				db.deleteObjectField('samlid:uid', idToDelete, next);
			}
		], function(err) {
			if (err) {
				winston.error('[sso-saml] Could not remove user data for uid ' + uid + '. Error: ' + err);
				return callback(err);
			}
			callback(null, uid);
		});
	};

	module.exports = SAML;
}(module));
