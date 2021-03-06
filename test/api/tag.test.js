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

describe('The VPDB `tag` API', function() {

	describe('when posting a new tag', function() {

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
				.post('/api/v1/tags')
				.saveResponse({ path: 'tags/create'})
				.as('member')
				.send({})
				.end(function(err, res) {
					hlp.expectValidationError(err, res, 'name', 'must be provided');
					hlp.expectValidationError(err, res, 'description', 'must be provided');
					done();
				});
		});

		it('should fail if the tag name already exists', function(done) {
			request
				.post('/api/v1/tags')
				.as('member')
				.send({ name: 'titi', description: 'Generated during an API test.' })
				.end(function(err, res) {
					hlp.expectStatus(err, res, 201);
					hlp.doomTag('member', res.body.id);
					request
						.post('/api/v1/tags')
						.as('member')
						.send({ name: 'titi', description: 'Generated during an API test.' })
						.end(function(err, res) {
							hlp.expectValidationError(err, res, 'name', 'is already taken');
							done();
						});
				});
		});

		it('should succeed with valid data', function(done) {
			request
				.post('/api/v1/tags')
				.save({ path: 'tags/create'})
				.as('member')
				.send({ name: 'mytag', description: 'A tag, generated for testing purpose.' })
				.end(function(err, res) {
					hlp.expectStatus(err, res, 201);
					hlp.doomTag('member', res.body.id);
					done();
				});
		});
	});


	describe('when listing all tags', function() {

		it('should list the initially added tags', function(done) {
			request
				.get('/api/v1/tags')
				.save({ path: 'tags/list'})
				.end(function(err, res) {
					hlp.expectStatus(err, res, 200);
					expect(res.body).to.be.an('array');
					expect(res.body).to.not.be.empty();
					done();
				});
		});
	});


	describe('when deleting a tag', function() {

		before(function(done) {
			hlp.setupUsers(request, {
				member: { roles: [ 'member' ] },
				contributor: { roles: [ 'contributor' ] },
				moderator: { roles: [ 'moderator' ] }
			}, done);
		});

		after(function(done) {
			hlp.cleanup(request, done);
		});

		it('should succeed as member and owner', function(done) {
			request
				.post('/api/v1/tags')
				.as('member')
				.send({ name: 'delete-test-1', description: 'Generated during an API test.' })
				.end(function(err, res) {
					hlp.expectStatus(err, res, 201);
					request
						.del('/api/v1/tags/' + res.body.id)
						.as('member')
						.end(function(err, res) {
							hlp.expectStatus(err, res, 204);
							done();
						});
				});
		});

		it('should fail as member and not owner', function(done) {
			request
				.post('/api/v1/tags')
				.as('contributor')
				.send({ name: 'delete-test-2', description: 'Generated during an API test.' })
				.end(function(err, res) {
					hlp.expectStatus(err, res, 201);
					hlp.doomTag('moderator', res.body.id);
					request
						.del('/api/v1/tags/' + res.body.id)
						.saveResponse({ path: 'tags/del'})
						.as('member')
						.end(function(err, res) {
							hlp.expectStatus(err, res, 403);
							done();
						});
				});
		});

		it('should fail as contributor and not owner', function(done) {
			request
				.post('/api/v1/tags')
				.as('member')
				.send({ name: 'delete-test-3', description: 'Generated during an API test.' })
				.end(function(err, res) {
					hlp.expectStatus(err, res, 201);
					hlp.doomTag('moderator', res.body.id);
					request
						.del('/api/v1/tags/' + res.body.id)
						.as('contributor')
						.end(hlp.status(403, done));
				});

		});

		it('should succeed as moderator and not owner', function(done) {
			request
				.post('/api/v1/tags')
				.as('member')
				.send({ name: 'delete-test-4', description: 'Generated during an API test.' })
				.end(function(err, res) {
					hlp.expectStatus(err, res, 201);
					request
						.del('/api/v1/tags/' + res.body.id)
						.as('moderator')
						.end(hlp.status(204, done));
				});

		});

	});

});