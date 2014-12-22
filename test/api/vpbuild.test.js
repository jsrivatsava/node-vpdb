"use strict"; /* global describe, before, after, it */

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var async = require('async');
var request = require('superagent');
var expect = require('expect.js');

var superagentTest = require('../modules/superagent-test');
var hlp = require('../modules/helper');

superagentTest(request);

describe('The VPDB `VPBuild` API', function() {

	describe('when posting a new VPBuild', function() {

		before(function(done) {
			hlp.setupUsers(request, {
				member: { roles: [ 'member' ] }
			}, done);
		});

		after(function(done) {
			hlp.cleanup(request, done);
		});

		it('should fail validations for empty data', function(done) {
			request
				.post('/api/v1/vpbuilds')
				.saveResponse({ path: 'vpbuilds/create'})
				.as('member')
				.send({})
				.end(function(err, res) {
					hlp.expectValidationError(err, res, 'label', 'must be provided');
					hlp.expectValidationError(err, res, 'type', 'must be provided');
					done();
				});
		});

		it('should fail validations for invalid data', function(done) {
			request
				.post('/api/v1/vpbuilds')
				.saveResponse({ path: 'vpbuilds/create'})
				.as('member')
				.send({ label: '1', type: 'non-existent', is_range: null, built_at: 'no-date' })
				.end(function(err, res) {
					hlp.expectValidationError(err, res, 'label', 'must contain at least');
					hlp.expectValidationError(err, res, 'type', 'invalid type');
					hlp.expectValidationError(err, res, 'is_range', 'you need to provide');
					done();
				});
		});

		it('should fail if the VPBuild label already exists', function(done) {
			request
				.post('/api/v1/vpbuilds')
				.as('member')
				.send({ label: 'v1.0.0-dupetest', type: 'release' })
				.end(function(err, res) {
					hlp.expectStatus(err, res, 201);
					hlp.doomVPBuild('member', res.body.id);
					request
						.post('/api/v1/vpbuilds')
						.as('member')
						.send({ label: 'v1.0.0-dupetest', type: 'release' })
						.end(function(err, res) {
							hlp.expectValidationError(err, res, 'label', 'is already taken');
							done();
						});
				});
		});

		it('should succeed with minimal data', function(done) {
			request
				.post('/api/v1/vpbuilds')
				.as('member')
				.send({ label: 'v1.0.0', type: 'release' })
				.end(function(err, res) {
					hlp.expectStatus(err, res, 201);
					hlp.doomVPBuild('member', res.body.id);
					done();
				});
		});

		it('should succeed with full data', function(done) {
			request
				.post('/api/v1/vpbuilds')
				.save({ path: 'vpbuilds/create'})
				.as('member')
				.send({
					label: 'v1.0.1',
					type: 'release',
					description: 'The very first release.',
					download_url: 'http://download_url/',
					support_url: 'http://support_url/',
					built_at: '2000-01-01 12:21',
					is_range: false
				})
				.end(function(err, res) {
					hlp.expectStatus(err, res, 201);
					hlp.doomVPBuild('member', res.body.id);
					done();
				});
		});
	});

	describe('when listing all VPBuilds', function() {

		it('should list the initially added builds', function(done) {
			request
				.get('/api/v1/vpbuilds')
				.save({ path: 'vpbuilds/list'})
				.end(function(err, res) {
					hlp.expectStatus(err, res, 200);
					expect(res.body).to.be.an('array');
					expect(res.body).to.not.be.empty();
					done();
				});
		});
	});

	describe('when deleting a vpbuild', function() {

		before(function(done) {
			hlp.setupUsers(request, {
				member: { roles: [ 'member' ] },
				contributor: { roles: [ 'contributor' ] }
			}, done);
		});

		after(function(done) {
			hlp.cleanup(request, done);
		});

		it('should succeed as member and owner', function(done) {
			request
				.post('/api/v1/vpbuilds')
				.as('member')
				.send({ label: 'delete-test-1', type: 'release' })
				.end(function(err, res) {
					hlp.expectStatus(err, res, 201);
					request
						.del('/api/v1/vpbuilds/' + res.body.id)
						.as('member')
						.end(function(err, res) {
							hlp.expectStatus(err, res, 204);
							done();
						});
				});
		});

		it('should fail as member and not owner', function(done) {
			request
				.post('/api/v1/vpbuilds')
				.as('contributor')
				.send({ label: 'delete-test-2', type: 'release' })
				.end(function(err, res) {
					hlp.expectStatus(err, res, 201);
					hlp.doomVPBuild('contributor', res.body.id);
					request
						.del('/api/v1/vpbuilds/' + res.body.id)
						.saveResponse({ path: 'vpbuilds/del'})
						.as('member')
						.end(function(err, res) {
							hlp.expectStatus(err, res, 403);
							done();
						});
				});
		});

		it('should succeed as contributor and not owner', function(done) {
			request
				.post('/api/v1/vpbuilds')
				.as('member')
				.send({ label: 'delete-test-3', type: 'release' })
				.end(function(err, res) {
					hlp.expectStatus(err, res, 201);
					request
						.del('/api/v1/vpbuilds/' + res.body.id)
						.as('contributor')
						.end(function(err, res) {
							hlp.expectStatus(err, res, 204);
							done();
						});
				});

		});

	});

});