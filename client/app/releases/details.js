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

"use strict"; /* global _, angular */

angular.module('vpdb.releases.details', []).controller('ReleaseDetailsController', function(
	$scope, $rootScope, $uibModal, $timeout, $stateParams,
	ApiHelper, ReleaseCommentResource, AuthService, ReleaseService, Flavors,
	ReleaseRatingResource, ReleaseResource, GameResource)
{

	$scope.theme('dark');
	$scope.setMenu('Release Details');

	$scope.gameId = $stateParams.id;
	$scope.releaseId = $stateParams.releaseId;
	$scope.flavors = Flavors;

	// GAME
	$scope.game = GameResource.get({ id: $scope.gameId });

	// RELEASE
	ReleaseResource.get({ release: $scope.releaseId }, function(release) {

		$scope.release = release;
		$scope.pageLoading = false;
		$scope.setTitle(release.game.title + ' · ' + $scope.release.name);

		// sort versions
		$scope.releaseVersions = _.sortByOrder(release.versions, 'released_at', false);
		$scope.latestVersion = $scope.releaseVersions[0];

		// get latest shots
		$scope.shots = _.sortByOrder(_.compact(_.map($scope.latestVersion.files, function(file) {
			if (!file.media || !file.media.playfield_image) {
				return null;
			}
			return {
				type: file.media.playfield_image.file_type,
				url: file.media.playfield_image.variations['medium'].url,
				full: file.media.playfield_image.variations.full.url
			};
		})), 'type', true);

		// fetch comments
		$scope.comments = ReleaseCommentResource.query({ releaseId: release.id });

		$scope.flavorGrid = ReleaseService.flavorGrid(release);

		// setup lightbox
		$timeout(function() {
			$('.carousel-inner').each(function() {
				$(this).magnificPopup({
					delegate: '.image',
					type: 'image',
					removalDelay: 300,
					mainClass: 'mfp-fade',
					gallery: {
						enabled: true,
						preload: [0,2],
						navigateByImgClick: true,
						arrowMarkup: '',
						tPrev: '',
						tNext: '',
						tCounter: ''
					}
				});
			});
		});
	});

	// setup comments
	$scope.newComment = '';
	$scope.addComment = function(releaseId) {
		ReleaseCommentResource.save({ releaseId: $scope.releaseId }, { message: $scope.newComment }, function(comment) {
			$scope.comments.unshift(comment);
			$scope.newComment = '';
		}, ApiHelper.handleErrors($scope));
	};

	// ratings
	if (AuthService.hasPermission('releases/rate')) {
		ReleaseRatingResource.get({ releaseId: $scope.releaseId }).$promise.then(function(rating) {
			$scope.releaseRating = rating.value;
		});
	}

	/**
	 * Opens the game download dialog
	 *
	 * @param game Game
	 */
	$scope.download = function(game) {

		if (AuthService.isAuthenticated) {
			$uibModal.open({
				templateUrl: '/releases/modal-download.html',
				controller: 'DownloadGameCtrl',
				size: 'lg',
				resolve: {
					params: function() {
						return {
							game: game,
							release: $scope.release,
							latestVersion: $scope.latestVersion
						};
					}
				}
			});

		} else {
			$rootScope.login({
				headMessage: 'In order to download this release, you need to be logged. You can register for free just below.'
			});
		}
	};

	/**
	 * Rates a release
	 * @param rating Rating
	 */
	$scope.rateRelease = function(rating) {
		var done = function(result) {
			$scope.release.rating = result.release;
		};
		if ($scope.releaseRating) {
			ReleaseRatingResource.update({ releaseId: $scope.release.id }, { value: rating }, done);
			$rootScope.showNotification('Successfully updated rating.');

		} else {
			ReleaseRatingResource.save({ releaseId: $scope.release.id }, { value: rating }, done);
			$rootScope.showNotification('Successfully rated release!');
		}
	};

}).controller('DownloadGameCtrl', function($scope, $uibModalInstance, $timeout, Flavors, RomResource, DownloadService, params) {

	$scope.game = params.game;
	$scope.release = params.release;
	$scope.latestVersion = params.latestVersion;
	$scope.flavors = Flavors;
	$scope.includeGameMedia = false;

	$scope.gameMedia = $scope.game.alternate_media;
	$scope.roms = RomResource.query({ id: $scope.game.id });

	$scope.downloadFiles = {};
	$scope.downloadRequest = {
		files: [],
		media: {
			playfield_image: true,
			playfield_video: false
		},
		backglass: null,
		game_media: [],
		roms: []
	};

	$scope.download = function() {
		DownloadService.downloadRelease($scope.release.id, $scope.downloadRequest, function() {
			$uibModalInstance.close(true);
		});
	};

	$scope.toggleFile = function(file) {
		if ($scope.downloadFiles[file.file.id]) {
			delete $scope.downloadFiles[file.file.id];
		} else {
			$scope.downloadFiles[file.file.id] = file;
		}
		$scope.downloadRequest.files = _.values(_.pluck(_.pluck($scope.downloadFiles, 'file'), 'id'));
	};

	$scope.selectBackglass = function(backglass) {
		if (backglass.id === $scope.downloadRequest.backglass) {
			$scope.downloadRequest.backglass = null;
		} else {
			$scope.downloadRequest.backglass = backglass.id;
		}
	};

	$scope.toggleRom = function(rom) {
		if (!_.contains($scope.downloadRequest.roms, rom.id)) {
			$scope.downloadRequest.roms.push(rom.id);
		} else {
			$scope.downloadRequest.roms.splice($scope.downloadRequest.roms.indexOf(rom.id), 1);
		}
	};

	$scope.$watch('includeGameMedia',  function() {
		$scope.downloadRequest.game_media = [];
		if ($scope.includeGameMedia) {
			var addedCategories = [];
			_.each($scope.gameMedia, function(media) {
				if (!_.contains(addedCategories, media.category)) {
					$scope.downloadRequest.game_media.push(media.id);
				}
				addedCategories.push(media.category)
			});
		}
	});

	if (!_.isEmpty($scope.gameMedia)) {
		$scope.includeGameMedia = true;
	}


	// todo refactor (make it more useful)
	$scope.tableFile = function(file) {
		return file.file.mime_type && /^application\/x-visual-pinball-table/i.test(file.file.mime_type);
	};

	var tableFiles = _.filter($scope.latestVersion.files, $scope.tableFile);
	if (tableFiles.length == 1) {
		$scope.toggleFile(tableFiles[0]);
	}

});


/**
 * Takes a sorted list of versions and removes files that have a newer
 * flavor. Also removes empty versions.
 * @param versions
 * @param opts
 */
function stripFiles(versions) {
	var i, j;
	var flavorValues, flavorKey, flavorKeys = {};

	for (i = 0; i < versions.length; i++) {
		for (j = 0; j < versions[i].files.length; j++) {

			// if non-table file, skip
			if (!versions[i].files[j].flavor) {
				continue;
			}

			flavorValues = [];
			for (var key in flavor.values) {
				//noinspection JSUnfilteredForInLoop
				flavorValues.push(versions[i].files[j].flavor[key]);
			}
			flavorKey = flavorValues.join(':');

			// strip if already available
			if (flavorKeys[flavorKey]) {
				versions[i].files[j] = null;
			}
			flavorKeys[flavorKey] = true;
		}

		versions[i].files = _.compact(versions[i].files);

		// remove version if no more files
		if (versions[i].files.length === 0) {
			versions[i] = null;
		}
	}
	return _.compact(versions);
}