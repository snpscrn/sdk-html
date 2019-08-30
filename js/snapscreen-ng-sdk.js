/**
 * @file snapscreen-ng-sdk.js
 * @brief  an Angular module which wraps snapscreen-sdk for angular.
 * @copyright 2016 Snapscreen. All rights reserved.
 */
angular.module('snapscreen-sdk', [])
    .provider('snapscreenKit', ['$injector', function SnapscreenKitProvider($injector) {
        var apiErr = angular.$$minErr('snapscreen-sdk');
        var snapscreenKit = SnapscreenKit;

        var refreshTokenCallback = function () {
            throw apiErr('nrtc', 'Refresh token callback is not configured');
        };

        this.setRefreshTokenCallback = function (callback) {
            refreshTokenCallback = callback;
        };

        function refreshTokenCallbackWrapper(tokenRefreshed) {
            $injector
                .invoke(refreshTokenCallback)
                .then(tokenRefreshed);
        }

        snapscreenKit.accessTokenHolder.refreshTokenCallback(refreshTokenCallbackWrapper);

        this.$get = ['$q', function snapscreenKitFactory($q) {
            return {
                "http": function (request) {
                    return $q(function (resolve, reject) {
                        snapscreenKit.http(request, resolve, reject);
                    });
                },
                "api": function (request) {
                    return $q(function (resolve, reject) {
                        snapscreenKit.api.exchange(request, resolve, reject);
                    });
                },
                "clipShareApi": function (request) {
                    return $q(function (resolve, reject) {
                        snapscreenKit.clipShareApi.exchange(request, resolve, reject);
                    });
                },
                "accessToken": snapscreenKit.accessTokenHolder.accessToken,
                "currentSnapscreenTimestamp": snapscreenKit.api.currentTimestamp,
                "webSearchService": snapscreenKit.webSearchService,
                "tvChannelService": snapscreenKit.tvChannelService,
                "sportEventService": snapscreenKit.sportEventService,
                "clipService": snapscreenKit.clipService,
                "tvSnapViewController": snapscreenKit.tvSnapViewController,
                "sportSnapViewController": snapscreenKit.sportSnapViewController,
                "adsSnapViewController": snapscreenKit.adsSnapViewController
            };
        }];
    }])
    .factory('webSearchService', ['$q', 'snapscreenKit', function webSearchServiceFactory($q, snapscreenKit) {
        var wrappers = {};
        Object.keys(snapscreenKit.webSearchService).forEach(function (method) {
            wrappers[method] = function () {
                var deferred = $q.defer();
                var argumentsArray = Array.prototype.slice.call(arguments, 0);
                argumentsArray.push(deferred.resolve, deferred.reject);
                snapscreenKit.webSearchService[method].apply(snapscreenKit.webSearchService, argumentsArray);
                return deferred.promise;
            };
        });
        return wrappers;
    }]);