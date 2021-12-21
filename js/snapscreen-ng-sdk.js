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
                "accessToken": snapscreenKit.accessTokenHolder.accessToken,
                "currentSnapscreenTimestamp": snapscreenKit.api.currentTimestamp,
                "sportSnapViewController": snapscreenKit.sportSnapViewController
            };
        }];
    }]);
