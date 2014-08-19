"use strict"; /* global Showdown, videojs */

/* Directives */
var directives = angular.module('vpdb.directives', []);

directives.directive('auth', function($rootScope, $location, AuthService) {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			var auth = JSON.parse(attrs.auth);
			if (auth.redirect) {
				$location.url(auth.redirect);
			}
			if (auth.jwt) {
				AuthService.tokenReceived(auth.jwt);
			}
		}
	};
});

directives.directive('authHeader', function($rootScope, $location, AuthService) {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			AuthService.setAuthHeader(attrs.authHeader);
		}
	};
});

directives.directive('onEnter', function() {
	return {
		link: function(scope, element, attrs) {
			element.bind("keypress", function (event) {
				if (event.which === 13) {
					scope.$apply(function () {
						scope.$eval(attrs.onEnter);
					});
					event.preventDefault();
				}
			});
		}
	};
});


directives.directive('ratingbox', function($parse) {
	return {
		restrict: 'C',
		scope: true,
		controller: function($scope, $element, $attrs) {

			$scope.$watch($parse($attrs.ratingAvg), function(val) {
				$scope.ratingAvg = Math.round(val);
			});
			if ($attrs.ratingVotes) {
				var votes = $parse($attrs.ratingVotes);
				$scope.$watch('ratingUser', function(newVal, oldVal) {
					if (!oldVal) {
						votes.assign($scope, votes($scope) + 1);
					}
				});
			}

			$scope.states = [
				{ stateOn: 'fa fa-star star-left star-on', stateOff: 'fa fa-star star-left star-off' },
				{ stateOn: 'fa fa-star star-right star-on', stateOff: 'fa fa-star star-right star-off' },
				{ stateOn: 'fa fa-star star-left star-on', stateOff: 'fa fa-star star-left star-off' },
				{ stateOn: 'fa fa-star star-right star-on', stateOff: 'fa fa-star star-right star-off' },
				{ stateOn: 'fa fa-star star-left star-on', stateOff: 'fa fa-star star-left star-off' },
				{ stateOn: 'fa fa-star star-right star-on', stateOff: 'fa fa-star star-right star-off' },
				{ stateOn: 'fa fa-star star-left star-on', stateOff: 'fa fa-star star-left star-off' },
				{ stateOn: 'fa fa-star star-right star-on', stateOff: 'fa fa-star star-right star-off' },
				{ stateOn: 'fa fa-star star-left star-on', stateOff: 'fa fa-star star-left star-off' },
				{ stateOn: 'fa fa-star star-right star-on', stateOff: 'fa fa-star star-right star-off' }
			];
		}
	};
});

directives.directive('flipbox', function($timeout) {
	return {
		restrict: 'C',
		scope: true,
		controller: function($scope, $element) {

			$scope.active = false;

			$element.click(function() {
				if ($scope.active) {
					return;
				}
				$scope.active = true;
				$element.addClass('active');
				$scope.$apply();

				$timeout(function() {
					$scope.active = false;
					$element.removeClass('active');
					$element.toggleClass('reverse');
				}, 650, true);
			});
		}
	};
});

directives.directive('stars', function() {
	return {
		replace: true,
		restrict: 'C',
		scope: true,
		link: {
			post: function(scope, element, attrs) {
				var star0 = '<i class="fa fa-star-o"></i>';
				var star1 = '<i class="fa fa-star-half-o"></i>';
				var star2 = '<i class="fa fa-star"></i>';
				var stars = '';
				var rating = attrs.value / 2;
				for (var i = 0; i < 5; i++) {
					if (rating < 0.25) {
						stars += star0;
					} else if (rating < 0.75) {
						stars += star1;
					} else {
						stars += star2;
					}
					rating -= 1.0;
				}
				element.html(stars);
			}
		}
	};
});

directives.directive('markdown', function($sanitize, $compile) {
	var converter = new Showdown.converter();
	return {
		restrict: 'AE',
		link: function(scope, element, attrs) {
			var linkUsers = function(html) {
				return html.replace(/@([^\s]+)/g, '<user>$1</user>');
			};
			if (attrs.markdown) {
				scope.$watch(attrs.markdown, function(newVal) {
					var html = newVal ? $sanitize(converter.makeHtml(newVal)) : '';
					element.html(linkUsers(html));
					$compile(element.contents())(scope);
				});
			} else {
				var mdText = element.text().replace(/^\s*[\n\r]+/g, '');
				var firstIdent = mdText.match(/^\s+/);
				mdText = ('\n' + mdText).replace(new RegExp('[\\n\\r]' + firstIdent, 'g'), '\n');
				var html = $sanitize(converter.makeHtml(mdText));
				element.html(linkUsers(html));
				$compile(element.contents())(scope);
			}
		}
	};
});

directives.directive('user', function($compile, $modal) {
	return {
		restrict: 'E',
		link: function(scope, element) {
			element.click(function() {
				$modal.open({
					templateUrl: 'partials/modals/userDetails',
					controller: 'UserDetailCtrl',
					resolve: {
						username: function() {
							return element.html();
						}
					}
				});

			});
		}
	};
});

directives.directive('makeLoaded', function($parse) {
	return {
		scope: true,
		restrict: 'A',
		link: function (scope, element, attrs) {
			scope.$on('imageLoaded', function(event) {
				event.stopPropagation();
				element.addClass(attrs.makeLoaded);
			});
			scope.$on('imageUnloaded', function(event) {
				event.stopPropagation();
				element.removeClass(attrs.makeLoaded);
			});
		}
	};
});

directives.directive('imgBg', function($parse) {
	return {
		scope: true,
		restrict: 'A',
		link: function(scope, element, attrs) {

			scope.img = { url: false, loading: false };
			var setImg = function(value) {

				// check for empty
				if (value === false) {
					scope.img = { url: false, loading: false };
					element.css('background-image', 'none');
					//element.removeClass('loaded');
					scope.$emit('imageUnloaded');

				} else {
					scope.img = { url: value, loading: true };
					element.css('background-image', "url('" + value + "')");
					element.waitForImages({
						each: function() {
							var that = $(this);
							that.addClass('loaded');
							scope.$emit('imageLoaded');
							scope.img.loading = false;
							scope.$apply();
						},
						waitForAll: true
					});
				}
			};

			// check for constant
			if (attrs.imgBg.substr(0, 1) === '/') {
				setImg(attrs.imgBg);

			// otherwise, watch scope for expression.
			} else {
				var value = $parse(attrs.imgBg);
				scope.$watch(value, function() {
					var v = value(scope);
					if (v || v === false) {
						setImg(v);
					}
				});
			}
		}
	};
});

directives.directive('imgSrc', function() {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			attrs.$observe('imgSrc', function(value) {
				element.attr('src', value);
				element.waitForImages(function() {
					$(this).addClass('loaded');
				}, function() {
					console.error('wait has failed.');
				});
			});
		}
	};
});

directives.directive('markdownInfo', function($parse) {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			var icon = '<i class="icon icon-markdown"></i>&nbsp;&nbsp;';
			element.html(icon + attrs.markdownInfo.replace(/markdown/gi, '<a href="http://daringfireball.net/projects/markdown/syntax" target="_blank">Markdown</a>'));
		}
	};
});

directives.directive('filterDecade', function() {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			element.click(function() {
				element.toggleClass('active');
				scope.$emit('dataToggleDecade', parseInt(attrs.filterDecade), element.hasClass('active'));
			});
		}
	};
});

directives.directive('filterRole', function() {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			element.click(function() {
				element.toggleClass('active');
				scope.$emit('dataToggleRole', attrs.filterRole, element.hasClass('active'));
			});
		}
	};
});

directives.directive('filterManufacturer', function() {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			element.click(function() {
				element.toggleClass('active');
				scope.$emit('dataToggleManufacturer', attrs.filterManufacturer, element.hasClass('active'));
			});
		}
	};
});

directives.directive('download', function($parse) {
	return {
		restrict: 'A',
		transclude: true,
		scope: true,
		template: '<i class="{{ downloadsPinned ? (dlPinned ? \'icon icon-pin-on\' : \'icon icon-pin-off\') : \'fa fa-download\' }} space-right"></i><span ng-transclude></span> ',
		link: function(scope, element, attrs) {
			var dl = $parse(attrs.download)(scope);
			scope.dlPinned = scope.pinnedDownloads[dl.id] ? true : false;
			element.click(function() {
				scope.download(dl, $parse(attrs.downloadInfo)(scope));
				scope.$apply();
			});
			scope.$on('downloadUnpinned', function(event, download) {
				if (download.id === dl.id) {
					scope.dlPinned = false;
				}
			});
			scope.$on('downloadPinned', function(event, download) {
				if (download.id === dl.id) {
					scope.dlPinned = true;
				}
			});
		}
	};
});

directives.directive('sort', function() {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			element.click(function() {
				if (element.hasClass('selected')) {
					element.toggleClass('asc');
					element.toggleClass('desc');
				} else {
					element.siblings().removeClass('selected');
					element.addClass('selected');
					element.addClass('asc');
					if (attrs.d === 'asc') {
						element.addClass('asc');
						element.removeClass('desc');
					} else {
						element.removeClass('asc');
						element.addClass('desc');
					}
				}
				scope.$emit('dataChangeSort', attrs.sort, element.hasClass('asc') ? 'asc' : 'desc');
			});
		}
	};
});

directives.directive('videojs', function($parse) {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {

			attrs.type = attrs.type || "video/mp4";
			var src =  $parse(attrs.src);

			var setup = {
				techOrder: ['html5', 'flash'],
				controls: true,
				preload: 'metadata',
				autoplay: false,
				loop: true
			};

			var videoid = 107;
			attrs.id = "videojs" + videoid;
			element.attr('id', attrs.id);

			var player = null;
			attrs.$observe('src', function(value) {
				if (value && !player) {
					console.log('src changed to %s', value);
					player = videojs(attrs.id, setup, function() {
						this.src({type: attrs.type, src: value });
					});
				}
			});

			scope.$on('$destroy', function() {
				if (player) {
					player.dispose();
				}
			});


//			//element.attr('poster', "http://10.1.21.36:8080/Testube/media/" + videoid + ".jpg");
//
		}
	};
});