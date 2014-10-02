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
var url = require('url');
var jade = require('jade');
var async = require('async');
var debug = require('debug')('metalsmith-raml');
var marked = require('marked');
var raml2obj = require('raml2obj');
var relative = require('path').relative;
var highlight = require('highlight.js');
var normalize = require('path').normalize;


module.exports = function(opts) {

	opts = opts || {};
	opts.src = opts.src || 'src';
	opts.files = opts.files || {};
	opts.template = opts.template || 'template.jade';

	// we need a file-based dictionary, so convert the name-based one.
	var configuredFiles = {};
	_.each(opts.files || {}, function(value, key) {
		configuredFiles[normalize(value.src)] = { dest: value.dest, name: key };
	});

	if (opts.markdown) {
		marked.setOptions(opts.markdown);
	}

	return function(files, metalsmith, done) {

		var filepath;
		var srcFiles = {};

		// get raml files to render
		for (filepath in files) {
			if (files.hasOwnProperty(filepath)) {
				if (configuredFiles[filepath]) {
					srcFiles[filepath] = configuredFiles[filepath];
				}
			}
		}

		var metadata = metalsmith.metadata();

		// for each  api
		async.each(_.keys(srcFiles), function(file, next) {

			var path = relative(process.cwd(), metalsmith.join(opts.src, file));

			// process raml
			debug('Processing RAML file at %s...', path);
			raml2obj.parse(path, function(obj) {
				try {
					debug(require('util').inspect(obj));

					// render each resource
					_.each(obj.resources, function (resource) {
							var destFolder = srcFiles[file].dest.replace(/\\/g, '/');
							var dest = destFolder + '/' + resource.uniqueId.substr(1) + '.html';
							var html = jade.renderFile(opts.template, { resource: resource, hlp: helpers(_.extend(opts, { api: obj })) });

							files[dest] = { contents: new Buffer(html) };
					});
					metadata.api = obj;
					require('fs').writeFileSync('raml.json', JSON.stringify(obj, null, '\t'));
					next();

				} catch (e) {
					return next(e);
				}
			}, function(err) {
				console.error(err);
				next(err);
			});
		}, done);

	};
};

function helpers(opts) {
	return {
		markdown: function(md) {
			return marked(md);
		},

		highlight: function(code, isHttp) {
			if (!code) {
				return code;
			}
			if (isHttp) {
				var split = splitReq(code);
				return highlight.highlight('http', split.headers).value + '\r\n\r\n' + highlight.highlight('json', split.body).value;
			}
			return code ? highlight.highlightAuto(code).value : '';
		},

		short: function(text) {
			// create short description
			var dot = text.indexOf('.');
			return marked(text.substring(0, dot > 0 ? dot: text.length));
		},

		toCurl: function(req) {
			var line, words, method;
			var split = splitReq(req);
			var lines = split.headers.split(/\r\n/);
			var cmd = 'curl';
			var validHeaders = [ 'content-type', 'authorization' ];
			for (var i = 0; i < lines.length; i++) {
				line = lines[i];
				if (i === 0) {
					words = line.split(/\s/);
					method = words[0];
					if (method !== 'GET') {
						cmd += ' -X "' + method + '"';
					}
					cmd += ' ' + url.resolve(opts.api.baseUri, words[1]);
				} else {
					words = line.split(/:/);
					if (_.contains(validHeaders, words[0].toLowerCase())) {
						cmd += ' \\\n   -H "' + line.replace(/"/g, '\\"') + '"';
					}
				}
			}
			if (split.body) {
				try {
					cmd += ' \\\n   -d \'' + JSON.stringify(JSON.parse(split.body)).replace(/'/g, "\\'") + '\'';
				} catch (e) {
					cmd = 'Cannot parse JSON body: \n' + e;
				}
			}
			return highlight.highlight('bash', cmd).value;
		},

		authscopes: function(securedBy) {
			if (!securedBy || !securedBy.length || !securedBy[0].jwt || !securedBy[0].jwt.scopes || !securedBy[0].jwt.scopes.length) {
				return [ 'ANON' ];
			}
			return securedBy[0].jwt.scopes;
		},

		authscope: function(scope) {
			switch (scope ? scope.toUpperCase() : 'ANON') {
				case 'ROOT':
					return {
						classes: 'icon icon-crown',
						title: 'Root Access',
						description: 'You must be **root** in order to access this resource.'
					};
				case 'ADMIN':
					return {
						classes: 'icon icon-badge',
						title: 'Administrator Access',
						description: 'You must be an **administrator** in order to access this resource.'
					};
				case 'CONTRIB':
					return {
						classes: 'icon icon-diamond',
						title: 'Contributor Access',
						description: 'You must be a **contributor** in order to access this resource.'
					};
				case 'MEMBER':
					return {
						classes: 'icon icon-user',
						title: 'Registered User',
						description: 'You must be a **registrated user** in order to access this resource.'
					};
				default:
					return {
						classes: 'icon icon-globe',
						title: 'Anonymous Access',
						description: 'This is a public resource that doesn\'t need any authentication.'
					};
			}
		},

		requestByType: function(body) {
			if (!_.isObject(body)) {
				return {};
			}
			var byType = {};
			_.each(body, function(request, type) {

				// ignore requests without example
				if (!request.example) {
					return;
				}
				var t = splitType(type);
				byType[t.name] = {
					role: t.role,
					request: request
				};
			});
			return byType;
		},

		responseByType: function(responses) {
			if (!_.isObject(responses)) {
				return {};
			}
			var byType = {};
			_.each(responses, function(block, code) {
				if (block.body) {
					_.each(block.body, function(response, type) {

						// ignore responses without example
						if (!response.example) {
							return;
						}
						var t = splitType(type);
						if (!byType[t.name]) {
							byType[t.name] = [];
						}
						byType[t.name].push({
							code: code,
							role: t.role,
							response: response
						});

					});
				}
			});
			return byType;
		}
	};
}

/**
 * Extracts role and name from our "custom type".
 *
 * Example: type = "role/member-Search-for-User"
 *        result = { role: 'member', name: 'Search for User' }
 *
 * @param type Full content type from RAML
 * @returns {{role: string, name: string}}
 */
function splitType(type) {
	var name, t = type.split('/')[1].split('-');
	var role = t[0];
	if (t.length > 1) {
		t.splice(0, 1);
		name = t.join(' ');
	} else {
		name = 'default';
	}
	return { role: role, name: name };
}

function splitReq(req) {
	if (/\r\n\r\n/.test(req)) {
		var c = req.split(/\r\n\r\n/);
		return {
			headers: c[0],
			body: c[1]
		};
	} else {
		return {
			headers: req,
			body: ''
		};
	}
}