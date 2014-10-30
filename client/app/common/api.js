"use strict"; /* global common, parseUri, _ */

common
	.factory('AuthResource', function($resource, ConfigService) {
		return $resource(ConfigService.apiUri('/authenticate/:strategy'), {}, {
			authenticate: { method: 'POST' },
			authenticateCallback: { method: 'GET' }
		});
	})

	.factory('FileResource', function($resource, ConfigService) {
		return $resource(ConfigService.apiUri('/files/:id'), {}, {
		});
	})

	.factory('GameResource', function($resource, ConfigService) {
		return $resource(ConfigService.apiUri('/games/:id'), {}, {
			head: { method: 'HEAD' }
		});
	})

	.factory('IpdbResource', function($resource, ConfigService) {
		return $resource(ConfigService.apiUri('/ipdb/:id'), {}, {
		});
	})

	.factory('PingResource', function($resource, ConfigService) {
		return $resource(ConfigService.apiUri('/ping'), {}, {});
	})

	.factory('ProfileResource', function($resource, ConfigService) {
		return $resource(ConfigService.apiUri('/user'), {}, {});
	})

	.factory('RolesResource', function($resource, ConfigService) {
		return $resource(ConfigService.apiUri('/roles/:role'), {}, {
		});
	})

	.factory('TagResource', function($resource, ConfigService) {
		return $resource(ConfigService.apiUri('/tags/:id'), {}, {
		});
	})

	.factory('UserResource', function($resource, ConfigService) {
		return $resource(ConfigService.apiUri('/users/:userid'), {}, {
			update: { method: 'PUT' },
			register: { method: 'POST' },
			login: { method: 'POST', params: { userid : 'login'} },
			logout: { method: 'POST', params: { userid : 'logout'} }
		});
	})

	.factory('VPBuildResource', function($resource, ConfigService) {
		return $resource(ConfigService.apiUri('/vpbuilds/:id'), {}, {
		});
	})

	.factory('ApiHelper', function($modal) {
		return {

			handlePagination: function(scope) {
				return function(items, headers) {
					scope.pagination = {};
					if (headers('x-list-count')) {
						scope.pagination.count = parseInt(headers('x-list-count'));
						scope.pagination.page = parseInt(headers('x-list-page'));
						scope.pagination.size = parseInt(headers('x-list-size'));
					}

					if (headers('link')) {
						var links = {};
						_.map(headers('link').split(','), function(link) {
							var m = link.match(/<([^>]+)>\s*;\s*rel="([^"]+)"/);
							links[m[2]] = {
								url: m[1],
								query: parseUri(m[1]).queryKey
							};
						});
						scope.pagination.links = links;
					}
				};
			},

			handleErrors: function(scope) {
				return function(response) {
					scope.message = null;
					scope.errors = {};
					scope.error = null;
					if (response.data.errors) {
						_.each(response.data.errors, function(err) {
							scope.errors[err.field] = err.message;
						});
					}
					if (response.data.error) {
						scope.error = response.data.error;
					}
				};
			},

			handleErrorsInDialog: function(scope, title, callback) {
				return function(response) {
					scope.setLoading(false);
					$modal.open({
						templateUrl: 'common/modal-error.html',
						controller: 'ErrorModalCtrl',
						resolve: {
							errorTitle: function() { return title; },
							errorMessage: function() { return response.data.error; }
						}
					});
					if (callback) {
						callback(response);
					}
				};
			}
		};
	});