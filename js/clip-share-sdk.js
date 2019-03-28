/**
 * @file   clip-share-sdk.js
 * @brief  a Clip share SDK in form of AngularJS 1.5 module.
 * @copyright 2019 Snapscreen. All rights reserved.
 */
angular.module('clipShareSdk', ['snapscreen-sdk'])
    .controller('ClipShareController', ['$scope', function ($scope) {
        $scope.clipShared = function(clip) {
            $scope.$emit('clipShared', clip);
        };
    }])
    .component('clipShare', {
        bindings: {
            resultEntry: '<',
            onClipShared: '&'
        },
        template: '<div class="snapscreen clipshare" ng-if="$ctrl.fragment">' +
            '<div class="snp-tab-container">' +
            '<div class="snp-tab" ng-class="{\'snp-tab-active\': $ctrl.tab == \'preview\'}"' +
            ' ng-click="$ctrl.showTab(\'preview\')"><i class="icon-control-play"></i> Clip</div>' +
            '<div class="snp-tab" title="Edit clip start" ng-class="{\'snp-tab-active\': $ctrl.tab == \'start\'}"' +
            ' ng-click="$ctrl.showTab(\'start\')"><i class="icon-pencil"></i> Start</div>' +
            '<div class="snp-tab" title="Edit clip end" ng-class="{\'snp-tab-active\': $ctrl.tab == \'end\'}"' +
            ' ng-click="$ctrl.showTab(\'end\')"><i class="icon-pencil"></i> End</div>' +
            '</div>' +
            '<div class="snp-preview-meta">' +
            '<p class="snp-preview-meta-item"><i class="icon-clock"></i> {{$ctrl.fragment.endTime - $ctrl.fragment.startTime | date:"HH:mm:ss":"UTC"}}</p>' +
            '<p class="snp-preview-meta-item"><i class="icon-control-start"></i> {{$ctrl.fragment.startTime | date:"HH:mm:ss"}}</p>' +
            '<p class="snp-preview-meta-item"><i class="icon-control-end"></i> {{$ctrl.fragment.endTime | date:"HH:mm:ss"}}</p>' +
            '</div>' +
            '<hls-player playlist="$ctrl.fragment.href" poster="$ctrl.fragment.poster" ng-if="$ctrl.tab == \'preview\'"></hls-player>' +
            '<preview-editor tv-channel-id="$ctrl.resultEntry.tvChannel.id" timestamp-ref="$ctrl.resultEntry.timestampRef"' +
            ' advertisement-id="$ctrl.resultEntry.advertisement.id" time-offset="$ctrl.resultEntry.timeOffset"' +
            ' selected-time="$ctrl.selectedTime" on-update="$ctrl.onPreviewUpdated(fragment, fragments, index)"' +
            ' ng-if="$ctrl.tab == \'start\' || $ctrl.tab == \'end\'"></preview-editor>' +
            '<div class="snp-form-error">{{$ctrl.formFeedback}}</div>' +
            '<button class="snp-btn-share" type="submit" ng-disabled="$ctrl.processing"' +
            ' ng-click="$ctrl.onShareClip()">Make Clip</button>' +
            '</div>',
        controller: ['clipShareService', function (clipShareService) {
            var ctrl = this, minDuration = 1900, maxDuration = 60100;

            ctrl.tab = 'preview';
            ctrl.showTab = function (tab) {
                ctrl.tab = tab;
                if (ctrl.tab === 'start') {
                    ctrl.selectedTime = ctrl.fragment.startTime;
                } else if (ctrl.tab === 'end') {
                    ctrl.selectedTime = ctrl.fragment.endTime;
                }
            };

            function initComponent() {
                ctrl.tab = 'preview';
                if(ctrl.resultEntry && ctrl.resultEntry._links
                    && ctrl.resultEntry._links.frame && ctrl.resultEntry._links.fragment) {
                    ctrl.fragment = angular.extend({
                        poster: ctrl.resultEntry._links.frame.href,
                        posterTime: ctrl.resultEntry.timestampRef ? ctrl.resultEntry.timestampRef : ctrl.resultEntry.timeOffset
                    }, ctrl.resultEntry._links.fragment);
                } else {
                    ctrl.fragment = null;
                }
            }

            function findFragment(fragments, value, start, end) {
                var i;
                if (start < end) {
                    for (i = start; i <= end; i++) {
                        if (fragments[i].timestampRef >= value) {
                            return fragments[i];
                        }
                    }
                } else {
                    for (i = start; i >= end; i--) {
                        if (fragments[i].timestampRef <= value) {
                            return fragments[i];
                        }
                    }
                }
                return null;
            }

            function doUpdatePreview(fragment, poster, startTime, endTime) {
                var index = fragment.lastIndexOf('?d=');
                if (index > 0) {
                    fragment = fragment.substring(0, index);
                }
                ctrl.fragment = {
                    href: fragment + '?d=' + (endTime - startTime),
                    poster: poster,
                    posterTime: startTime,
                    startTime: startTime,
                    endTime: endTime
                };
            }

            function updatePreview(startFragment, endFragment) {
                if (startFragment && endFragment) {
                    doUpdatePreview(startFragment._links.fragment.href, startFragment._links.frame.href,
                        startFragment.timestampRef, endFragment.timestampRef);
                }
            }

            function onStartUpdated(fragment, fragments, index) {
                if (ctrl.fragment.startTime !== fragment.timestampRef) {
                    var duration = ctrl.fragment.endTime - fragment.timestampRef;
                    if (duration > minDuration && duration < maxDuration) {
                        doUpdatePreview(fragment._links.fragment.href, fragment._links.frame.href,
                            fragment.timestampRef, ctrl.fragment.endTime);
                    } else if (duration < minDuration) {
                        updatePreview(fragment, findFragment(fragments, fragment.timestampRef + minDuration,
                            index, fragments.length - 1));
                    } else {
                        updatePreview(fragment, findFragment(fragments, fragment.timestampRef + maxDuration,
                            fragments.length - 1, index));
                    }
                }
            }

            function onEndUpdated(fragment, fragments, index) {
                if (ctrl.fragment.endTime !== fragment.timestampRef) {
                    var duration = fragment.timestampRef - ctrl.fragment.startTime;
                    if (duration > minDuration && duration < maxDuration) {
                        doUpdatePreview(ctrl.fragment.href, ctrl.fragment.poster,
                            ctrl.fragment.startTime, fragment.timestampRef);
                    } else if (duration < minDuration) {
                        updatePreview(findFragment(fragments, fragment.timestampRef - minDuration, index, 0), fragment);
                    } else {
                        updatePreview(findFragment(fragments, fragment.timestampRef - maxDuration, 0, index), fragment);
                    }
                }
            }

            ctrl.onPreviewUpdated = function (fragment, fragments, index) {
                if (ctrl.tab === 'start') {
                    onStartUpdated(fragment, fragments, index);
                } else if (ctrl.tab === 'end') {
                    onEndUpdated(fragment, fragments, index);
                }
            };

            ctrl.processing = false;
            ctrl.formFeedback = '';

            function shareFailed(reason) {
                ctrl.processing = false;
                if (reason.status === 401 || reason.status === 403 || reason.failReason === 'FORBIDDEN') {
                    ctrl.formFeedback = 'Authentication failed, please re-authenticate to continue.';
                } else if (reason.failReason === 'NOT_FOUND') {
                    ctrl.formFeedback = 'Clip not found, please try another.';
                } else {
                    ctrl.formFeedback = 'Failed to share clip. Please try again';
                }
            }

            function shareClip() {
                var promise, posterTime;
                if (ctrl.fragment.posterTime) {
                    posterTime = ctrl.fragment.posterTime;
                } else {
                    posterTime = ctrl.fragment.startTime;
                }

                if (ctrl.resultEntry.advertisement) {
                    promise = clipShareService.shareAdClip(ctrl.resultEntry.advertisement.id,
                        ctrl.fragment.startTime, ctrl.fragment.endTime, posterTime);
                } else {
                    promise = clipShareService.shareTvClip(ctrl.resultEntry.tvChannel.id,
                        ctrl.fragment.startTime, ctrl.fragment.endTime, posterTime);
                }
                promise.then(function(response) {
                    ctrl.formFeedback = '';
                    ctrl.processing = false;

                    ctrl.onClipShared({
                        clip: response.data
                    });
                }, shareFailed);
            }

            ctrl.onShareClip = function () {
                if (ctrl.processing) {
                    return;
                }
                ctrl.formFeedback = '';
                ctrl.processing = true;
                shareClip();
            };

            ctrl.$postLink = initComponent;
            ctrl.$onChanges = initComponent;
        }]
    })
    .component('previewEditor', {
        bindings: {
            tvChannelId: '<',
            timestampRef: '<',
            advertisementId: '<',
            timeOffset: '<',
            selectedTime: '<',
            onUpdate: '&'
        },
        template: '<div class="snp-gallery snp-gallery-main" ng-if="$ctrl.visible" ng-class="{\'snp-gallery-loading\': !$ctrl.gallery}">' +
            '<div class="swiper-container"><div class="swiper-wrapper">' +
            '<div class="swiper-slide" ng-repeat="item in ::$ctrl.gallery track by $index">' +
            '<img data-src="{{::item._links.frame.href}}" class="swiper-lazy"/>' +
            '<div class="swiper-lazy-preloader"></div>' +
            '</div></div>' +
            '<div class="swiper-button-next swiper-button-white"></div>' +
            '<div class="swiper-button-prev swiper-button-white"></div>' +
            '</div></div>' +
            '<div class="snp-gallery snp-gallery-thumb" ng-if="$ctrl.visible" ng-class="{\'snp-gallery-loading\': !$ctrl.gallery}">' +
            '<div class="swiper-container"><div class="swiper-wrapper">' +
            '<div class="swiper-slide" ng-repeat="item in ::$ctrl.galleryThumbnails track by $index">' +
            '<img data-src="{{::item._links.frame.href}}" class="swiper-lazy"/>' +
            '<div class="swiper-lazy-preloader"></div>' +
            '</div></div>' +
            '<div class="swiper-button-next swiper-button-white"></div>' +
            '<div class="swiper-button-prev swiper-button-white"></div>' +
            '</div></div>',
        controller: ['$scope', 'clipShareService', function ($scope, clipShareService) {
            var ctrl = this, galleryTop = null, galleryThumbs = null, activeGallery = null, thumbDiff = 5;

            function onMainGallerySlideChange() {
                if (activeGallery === null) {
                    var newIndex = Math.floor(this.activeIndex / thumbDiff);
                    if (galleryThumbs !== null && galleryThumbs.activeIndex !== newIndex) {
                        activeGallery = this;
                        galleryThumbs.slideTo(newIndex, 0, false);
                        activeGallery = null;
                    }
                    $scope.$apply(doUpdatePreview);
                }
            }

            function onThumbGallerySlideChange() {
                if (activeGallery === null) {
                    var newIndex = this.activeIndex * thumbDiff;
                    if (galleryTop !== null && galleryTop.activeIndex !== newIndex) {
                        activeGallery = this;
                        galleryTop.slideTo(newIndex, 0, false);
                        activeGallery = null;
                    }
                    $scope.$apply(doUpdatePreview);
                }
            }

            function doUpdatePreview() {
                ctrl.onUpdate({
                    fragment: ctrl.gallery[galleryTop.activeIndex],
                    fragments: ctrl.gallery,
                    index: galleryTop.activeIndex
                });
            }

            function createGallery() {
                galleryThumbs = new Swiper('.snp-gallery.snp-gallery-thumb .swiper-container', {
                    spaceBetween: 10,
                    lazy: {
                        loadPrevNext: true,
                        loadPrevNextAmount: 2
                    },
                    preloadImages: false,
                    slidesPerView: 3,
                    centeredSlides: true,
                    slideToClickedSlide: true,
                    watchSlidesVisibility: true,
                    navigation: {
                        nextEl: '.swiper-button-next',
                        prevEl: '.swiper-button-prev'
                    },
                    on: {
                        slideChange: onThumbGallerySlideChange
                    }
                });

                galleryTop = new Swiper('.snp-gallery.snp-gallery-main .swiper-container', {
                    spaceBetween: 10,
                    lazy: {
                        loadPrevNext: true,
                        loadPrevNextAmount: 1
                    },
                    preloadImages: false,
                    navigation: {
                        nextEl: '.swiper-button-next',
                        prevEl: '.swiper-button-prev'
                    },
                    on: {
                        slideChange: onMainGallerySlideChange
                    }
                });

                activeGallery = galleryTop;
                var initialSlide = detectSelectedSlide();
                galleryTop.slideTo(initialSlide, 0);
                galleryThumbs.slideTo(Math.floor(initialSlide / thumbDiff), 0);
                activeGallery = null;
            }

            function detectSelectedSlide() {
                var low = 0, high = ctrl.gallery.length - 1, mid, midValue;
                while (low <= high) {
                    mid = (low + high) >>> 1;
                    midValue = ctrl.gallery[mid].timestampRef || ctrl.gallery[mid].timeOffset;
                    if (midValue > ctrl.selectedTime) {
                        high = mid - 1;
                    } else if (midValue < ctrl.selectedTime) {
                        low = mid + 1;
                    } else {
                        return mid;
                    }
                }
                return low;
            }

            function onPreviewLoaded(response) {
                if (response.data && response.data._embedded && response.data._embedded.frameList &&
                    Array.isArray(response.data._embedded.frameList) && response.data._embedded.frameList.length > 0) {
                    ctrl.gallery = response.data._embedded.frameList;
                    ctrl.galleryThumbnails = [];
                    for (var i = 0; i < response.data._embedded.frameList.length; i += thumbDiff) {
                        ctrl.galleryThumbnails.push(response.data._embedded.frameList[i]);
                    }
                    $scope.$applyAsync(createGallery);
                } else {
                    ctrl.visible = false;
                }
            }

            ctrl.visible = true;
            function onPreviewLoadFailed() {
                ctrl.visible = false;
            }

            ctrl.$postLink = function () {
                if (ctrl.tvChannelId && ctrl.timestampRef) {
                    clipShareService.previewTvClip(ctrl.tvChannelId, ctrl.timestampRef)
                        .then(onPreviewLoaded, onPreviewLoadFailed);
                } else if (ctrl.advertisementId && ctrl.timeOffset) {
                    clipShareService.previewAdClip(ctrl.advertisementId, ctrl.timeOffset)
                        .then(onPreviewLoaded, onPreviewLoadFailed);
                }
            };

            ctrl.$onChanges = function() {
                if (galleryTop && galleryThumbs && activeGallery === null) {
                    activeGallery = galleryTop;

                    var index = detectSelectedSlide();
                    if (galleryTop.activeIndex !== index) {
                        galleryTop.slideTo(index);
                    }

                    index = Math.floor(index / thumbDiff);
                    if (galleryThumbs.activeIndex !== index) {
                        galleryThumbs.slideTo(index);
                    }

                    activeGallery = null;
                }
            };

            ctrl.$onDestroy = function () {
                if (galleryTop) {
                    galleryTop.destroy();
                    galleryTop = null;
                }
                if (galleryThumbs) {
                    galleryThumbs.destroy();
                    galleryThumbs = null;
                }
            };
        }]
    })
    .component('hlsPlayer', {
        bindings: {
            playlist: '<',
            poster: '<'
        },
        template: '<div id="player"></div>',
        controller: function () {
            var ctrl = this, player = null, source = {
                "file": ctrl.playlist,
                "image": ctrl.poster
            };

            ctrl.$postLink = function () {
                player = jwplayer("player");
                player.setup({
                    "file": ctrl.playlist,
                    "image": ctrl.poster,
                    "height": "auto",
                    "width": "100%",
                    "autostart": false,
                    "mute": false
                });
            };

            ctrl.$onChanges = function() {
                if (player && source.file !== ctrl.playlist) {
                    source = {
                        "file": ctrl.playlist,
                        "image": ctrl.poster
                    };
                    player.load(source);
                }
            };

            ctrl.$onDestroy = function () {
                if (player) {
                    player.remove();
                    player = null;
                }
            };
        }
    })
    .factory('clipShareService', ['$q', 'snapscreenKit', function ($q, snapscreenKit) {
        var storedPreview = {};
        function loadPreview(params) {
            if ((params.tvChannelId && params.tvChannelId === storedPreview.tvChannelId &&
                params.timestampRef && params.timestampRef === storedPreview.timestampRef) ||
                params.advertisementId && params.advertisementId === storedPreview.advertisementId &&
                params.timeOffset && params.timeOffset === storedPreview.timeOffset) {
                return $q.resolve(storedPreview);
            }
            return $q(function(resolve, reject) {
                snapscreenKit.api({
                    url: '/api/clips/preview',
                    method: 'POST',
                    responseType: 'json',
                    headers: {'content-type': 'application/x-www-form-urlencoded'},
                    params: params
                }).then(function(response) {
                    storedPreview = angular.extend({data: response.data}, params);
                    resolve(response);
                }, reject);
            });
        }
        return {
            shareTvClip: function shareTvClip(tvChannelId, timestampRefFrom, timestampRefTo, timestampRefThumb) {
                return snapscreenKit.api({
                    url: '/api/clips/share',
                    method: 'POST',
                    responseType: 'json',
                    headers: {'content-type': 'application/x-www-form-urlencoded'},
                    params: {
                        tvChannelId: tvChannelId,
                        timestampRefFrom: timestampRefFrom,
                        timestampRefTo: timestampRefTo,
                        timestampRefThumb: timestampRefThumb
                    }
                });
            },
            previewTvClip: function previewTvClip(tvChannelId, timestampRef) {
                return loadPreview({tvChannelId: tvChannelId, timestampRef: timestampRef});
            },
            shareAdClip: function shareAdClip(advertisementId, timeOffsetFrom, timeOffsetTo, timeOffsetThumb) {
                return snapscreenKit.api({
                    url: '/api/clips/share',
                    method: 'POST',
                    responseType: 'json',
                    headers: {'content-type': 'application/x-www-form-urlencoded'},
                    params: {
                        advertisementId: advertisementId,
                        timeOffsetFrom: timeOffsetFrom,
                        timeOffsetTo: timeOffsetTo,
                        timeOffsetThumb: timeOffsetThumb
                    }
                });
            },
            previewAdClip: function previewAdClip(advertisementId, timeOffset) {
                return loadPreview({advertisementId: advertisementId, timeOffset: timeOffset});
            }
        };
    }]);