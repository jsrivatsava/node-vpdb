"use strict"; /* global _, angular*/

angular.module('vpdb.profile.stats', [])

	.controller('ProfileStatsCtrl', function($scope, $rootScope, AuthService, ApiHelper, ProfileResource) {

		$scope.logins = ProfileResource.logs({ event: 'authenticate', per_page: 10 });

	});