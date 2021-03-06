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

var fs = require('fs');
var path = require('path');
var logger = require('winston');

function Gitinfo() {
	var filepath = path.resolve(__dirname, '../../gitinfo.json');

	/* istanbul ignore next */
	if (!fs.existsSync(filepath)) {
		return logger.warn('Cannot read gitinfo.json at from "%s", returning empty gitinfo.', filepath);
	}
	this.info = JSON.parse(fs.readFileSync(filepath));
}

var gitinfo = new Gitinfo();
exports.info = gitinfo.info;