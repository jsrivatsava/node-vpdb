/*
 * VPDB - Visual Pinball Database
 * Copyright (C) 2016 freezy <freezy@xbmc.org>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

"use strict";

var _ = require('lodash');
var logger = require('winston');

var error = require('../../modules/error')('api', 'token');
var acl = require('../../acl');
var api = require('./api');
var Token = require('mongoose').model('Token');

exports.create = function(req, res) {

	// tokenType == "jwt" means the token comes from a "fresh" login (not a
	// refresh token) from either user/password or oauth2.
	if (req.tokenType === 'jwt') {

		// in this case, the user is allowed to create login tokens without
		// additionally supplying the password.
		if (req.body.type !== 'login' && !req.body.password) {
			return api.fail(res, error('You cannot create other tokens but login tokens without supplying a password, ' +
				'even when logged with a "short term" token.').warn('create-token'), 401);
		}

	} else {

		// if the token type is not "jwt" (but "jwt-refreshed" or "access-token"),
		// the user must provide a password.
		if (!req.body.password) {
			return api.fail(res, error('When logged with a "long term" token (either from a X-Token-Refresh header or ' +
				'from an access token), you must provide your password.').warn('create-token'), 401);
		}
	}

	// in any case, if a password is supplied, check it.
	if (req.body.password && !req.user.authenticate(req.body.password)) {
		return api.fail(res, error('Wrong password.').warn('create-token'), 401);
	}

	var newToken = new Token(_.extend(req.body, {
		label: req.body.label || req.headers['user-agent'],
		is_active: true,
		created_at: new Date(),
		expires_at: new Date(new Date().getTime() + 31536000000),
		_created_by: req.user._id
	}));

	newToken.validate(function(err) {
		if (err) {
			return api.fail(res, error('Validations failed. See below for details.').errors(err.errors).warn('create'), 422);
		}
		newToken.save(function(err) {
			/* istanbul ignore if  */
			if (err) {
				return api.fail(res, error(err, 'Error saving token "%s"', newToken.label).log('create'), 500);
			}
			logger.info('[api|token:create] Token "%s" successfully created.', newToken.label);
			return api.success(res, newToken.toSimple(true), 201);
		});
	});
};

exports.list = function(req, res) {

	var query = { _created_by: req.user._id };
	var allowedTypes = [ 'access', 'login'];

	// filter by type?
	if (req.query.type && _.includes(allowedTypes, req.query.type)) {
		query.type = req.query.type;
	}

	Token.find(query, function(err, tokens) {
		/* istanbul ignore if  */
		if (err) {
			return api.fail(res, error(err, 'Error listing tokens').log('list'), 500);
		}

		// reduce
		tokens = _.map(tokens, function(token) {
			return token.toSimple();
		});
		api.success(res, tokens);
	});
};

exports.update = function(req, res) {

	var assert = api.assert(error, 'update', req.params.id, res);
	var updateableFields = [ 'label', 'is_active', 'expires_at' ]; // TODO enable expires_at only in debug, not in prod

	Token.findOne({ id: req.params.id, _created_by: req.user._id }, assert(function(token) {
		if (!token) {
			return api.fail(res, error('No such token'), 404);
		}

		_.extend(token, _.pick(req.body, updateableFields));

		token.validate(function(err) {
			if (err) {
				return api.fail(res, error('Validations failed. See below for details.').errors(err.errors).warn('update'), 422);
			}
			token.save(assert(function() {

				logger.info('[api|token:update] Token "%s" successfully updated.', token.label);
				return api.success(res, token.toSimple(), 200);

			}, 'Error updating token "%s"'));
		});
	}, 'Error finding token "%s"'));
};

exports.del = function(req, res) {

	var assert = api.assert(error, 'delete', req.params.id, res);

	Token.findOne({ id: req.params.id, _created_by: req.user._id }, assert(function(token) {
		if (!token) {
			return api.fail(res, error('No such token'), 404);
		}
		token.remove(assert(function() {
			res.status(204).end();

		}, 'Error deleting token "%s"'));

	}, 'Error finding token "%s"'));
};
