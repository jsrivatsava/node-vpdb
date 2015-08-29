/*
 * VPDB - Visual Pinball Database
 * Copyright (C) 2015 freezy <freezy@xbmc.org>
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
var util = require('util');
var async = require('async');
var logger = require('winston');

var Star = require('mongoose').model('Star');
var LogEvent = require('mongoose').model('LogEvent');

var acl = require('../../acl');
var api = require('./api');
var error = require('../../modules/error')('api', 'eventlogs');
var config = require('../../modules/settings').current;


/**
 * Returns the current event stream.
 *
 * @param {Request} req
 * @param {Response} res
 */
exports.list = function(req, res) {

	var assert = api.assert(error, 'list', null, res);
	var query = [ { is_public: true }];

	async.waterfall([

		/**
		 * Sync filters
		 * @param next
		 */
		function(next) {

			// filter event
			if (req.query.events) {
				var events = req.query.events.split(',');
				var eventsIn = [];
				var eventsNin = [];
				_.each(events, function(event) {
					if (event[0] === '!') {
						eventsNin.push(event.substr(1));
					} else {
						eventsIn.push(event);
					}
				});
				if (eventsIn.length > 0) {
					query.push({ event: { $in: eventsNin }});
				}
				if (eventsNin.length > 0) {
					query.push({ event: { $nin: eventsNin }});
				}
			}

			next(null, query);
		},

		function(query, next) {

			if (!_.isUndefined(req.query.starred)) {
				if (!req.user) {
					api.fail(res, error('Must be logged when listing starred events.'), 401);
					return next(true);
				}

				Star.find({ _from: req.user._id }, function(err, stars) {
					/* istanbul ignore if  */
					if (err) {
						api.fail(res, error(err, 'Error searching stars for user <%s>.', req.user.email).log('list'), 500);
						return next(true);
					}
					var releaseIds = _.compact(_.pluck(_.pluck(stars, '_ref'), 'release'));
					var gameIds = _.compact(_.pluck(_.pluck(stars, '_ref'), 'game'));

					query.push({ $or: [
						{ '_ref.release': { $in: releaseIds } },
						{ '_ref.game': { $in: gameIds } }
					] });

					return next(null, query);
				});
			} else {
				next(null, query);
			}
		},

		/**
		 * Check for full details permission
		 * @param query
		 * @param next
		 */
		function(query, next) {

			if (req.user) {
				acl.isAllowed(req.user.id, 'users', 'full-details', assert(function(fullDetails) {
					next(null, query, fullDetails);

				}, 'Error checking for ACL "users/full-details"'));
			} else {
				next(null, query, false);
			}
		}

	], function(err, query, fullDetails) {

		if (err) {
			// has already been treated.
			return;
		}

		logger.info('Events query: %s', util.inspect(query, { depth: null }));

		// query
		var pagination = api.pagination(req, 10, 50);
		LogEvent.paginate(api.searchQuery(query), {
			page: pagination.page,
			limit: pagination.perPage,
			sortBy: { logged_at: -1 },
			populate: [ '_actor' ]

		}, function(err, logs, pageCount, count) {

			/* istanbul ignore if  */
			if (err) {
				return api.fail(res, error(err, 'Error retrieving logs').log('list'), 500);
			}

			// process results
			logs = _.map(logs, function(log) {
				return fullDetails ? log.toObj() : _.omit(log.toObj(), [ 'ip' ]);
			});
			api.success(res, logs, 200, api.paginationOpts(pagination, count));
		});
	});

};
