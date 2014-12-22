/*
 * VPDB - Visual Pinball Database
 * Copyright (C) 2014 freezy <freezy@xbmc.org>
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
var async = require('async');
var logger = require('winston');
var mongoose = require('mongoose');
var objectPath = require('object-path');

var common = require('./common');
var error = require('../../modules/error')('model', 'pretty-id');

module.exports = exports = function(schema, options) {

	options = options || {};

	/* istanbul ignore if */
	if (!options.model) {
		throw new Error('Fileref plugin needs model. Please provide.');
	}

	options.ignore = options.ignore || [];
	if (_.isString(options.ignore)) {
		options.ignore = [ options.ignore ];
	}

	var paths = _.omit(common.traversePaths(schema), function(schemaType, path) {
		return _.contains(options.ignore, path);
	});

	/**
	 * Replaces API IDs with database IDs and returns a new instance of the
	 * configured model.
	 *
	 * @param obj Object, directly from API client
	 * @param callback Called with (`err`, `ModelInstance`)
	 */
	schema.statics.getInstance = function(obj, callback) {

		var Model = mongoose.model(options.model);
		var models = {};
		models[options.model] = Model;

		var singleRefs = _.mapValues(_.pick(paths, function(schemaType) {
			return schemaType.options && schemaType.options.ref;
		}), function(schemaType) {
			return schemaType.options.ref;
		});
		var arrayRefs = _.mapValues(_.pick(paths, function(schemaType) {
			return schemaType.caster && schemaType.caster.instance && schemaType.caster.options && schemaType.caster.options.ref;
		}), function(schemaType) {
			return schemaType.caster.options.ref;
		});

		var objPaths = common.explodePaths(obj, singleRefs, arrayRefs);

		var invalidations = [];
		async.eachSeries(_.keys(objPaths), function(objPath, next) {

			var refModelName = objPaths[objPath];
			var RefModel = models[refModelName] || mongoose.model(refModelName);
			models[refModelName] = RefModel;

			var prettyId = objectPath.get(obj, objPath);

			if (!prettyId) {
				return next();
			}
			RefModel.findOne({ id: prettyId }, function(err, refObj) {
				/* istanbul ignore if  */
				if (err) {
					logger.error('[model] Error finding referenced %s: %s', refModelName.toLowerCase(), err.message);
					return next(err);
				}
				if (!refObj) {
					logger.warn('[model] %s ID "%s" not found in database for field %s.', refModelName, prettyId, objPath);
					invalidations.push({ path: objPath, message: 'No such ' + refModelName.toLowerCase() + ' with ID "' + prettyId + '".', value: prettyId });
					objectPath.set(obj, objPath, '000000000000000000000000'); // to avoid class cast error to objectId
				} else {
					objectPath.set(obj, objPath, refObj._id);
				}
				next();
			});

		}, function(err) {
			/* istanbul ignore if  */
			if (err) {
				return callback(err);
			}

			var model = new Model(obj);

			// for invalid IDs, invalidate instantly so we can provide which value is wrong.
			_.each(invalidations, function(invalidation) {
				model.invalidate(invalidation.path, invalidation.message, invalidation.value);
			});

			callback(null, model);
		});
	};
};