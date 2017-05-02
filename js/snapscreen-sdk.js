/**
 * @file snapscreen-sdk.js
 * @brief a tool kit which provide an easy way to use Snpascreen's API.
 * @copyright 2016 Snapscreen. All rights reserved.
 */
(function (scope) {
    var refreshTokenCallback = function () {
        throw new Error("Token is expired but refreshTokenCallback is not configured");
    };

    var templates = {
        camera: '<div class="tv-search-camera"><video id="snapscreen:{suffix}:video" width="100%" height="100%" autoplay></video>' +
        '<div id="snapscreen:{suffix}:frame" class="tv-search-frame"></div>' +
        '<div id="snapscreen:{suffix}:zoom" class="zoom-slider"><i class="zoom-pointer"></i><hr/></div>' +
        '<button id="snapscreen:{suffix}:snap" class="tv-search-button"><i class="icon-camera icon"></i></button>' +
        '<button id="snapscreen:{suffix}:switch" class="switch-camera-button"><i class="icon-refresh icon"></i></button>' +
        '</div>',
        file: '<div class="tv-search-file"><input id="snapscreen:{suffix}:file" class="tv-search-input" type="file" accept="image/*;capture=camera"/>' +
        '<label id="snapscreen:{suffix}:label" class="tv-search-label" for="snapscreen:{suffix}:file">' +
        '<div><i class="icon-camera icon"></i><span>Click to access your camera!</span></div></label></div>',
        button: '<input id="snapscreen:{suffix}:file" class="tv-search-input" type="file" accept="image/*;capture=camera"/>' +
        '<label id="snapscreen:{suffix}:label" class="tv-search-button" for="snapscreen:{suffix}:file">' +
        '<i class="icon-camera icon"></i>' +
        '</label>',
        modal: '<div id="snapscreen:{suffix}:site" class="content">' +
        '<a id="snapscreen:{suffix}:close" class="close"></a>' +
        '</div>',
        tutorial: '<div class="dialog dialog--open">' +
        '<div class="dialog__overlay"></div>' +
        '<div class="dialog__content">' +
        '<input id="snapscreen:{suffix}:file" class="tv-search-input" type="file" accept="image/*;capture=camera"/>' +
        '<label id="snapscreen:{suffix}:label" for="snapscreen:{suffix}:file" class="tutorial-label">' +
        '<div class="tutorial-content">' +
        '<h3 class="tutorial-title">Zoom and focus on your TV-screen.</h3>' +
        '<div class="tutorial-picto"><img src="images/tutorial.png" alt=""/></div>' +
        '<button class="button button-cta" data-dialog-close="">Get started</button>' +
        '</div>' +
        '</label>' +
        '</div>' +
        '</div>',
        waiting: '<div class="tv-search-feedback">Getting access to the camera...</div>'
    };

    var accessToken;

    var tokenTime;

    var timeLag = 0;

    var baseUrl = 'https://api-dev.snapscreen.com';

    var apiCallQueue = [];

    var countryCode;

    var localeIdentifier;

    var MAX_SCALE = 4;

    var SNAP_MAX_DIMENSION = 1024;

    var AUTOSNAP_MAX_DIMENSION = 512;

    var AUTOSNAP_DELAY_INITIAL = 3000;

    var AUTOSNAP_DELAY = 2000;

    var AUTOSNAP_STATUS_NONE = 'NONE';

    var AUTOSNAP_STATUS_WAITING = 'WAITING';

    var AUTOSNAP_STATUS_IN_PROGRESS = 'IN_PROGRESS';

    var AUTOSNAP_STATUS_SNAP_REQUESTED = 'SNAP_REQUESTED';

    var loggingHandler = {
        logFatal: function logError(message) {
            console.error(message);
        },
        logError: function logError(message) {
            console.error(message);
        },
        logWarn: function logWarn(message) {
            console.warn(message);
        },
        logInfo: function logInfo(message) {
            console.info(message);
        }
    };

    function isTokenExpired() {
        return tokenTime.getTime() + 1000 * accessToken['expires_in'] < Date.now();
    }

    function setAndGetAccessToken(value, time) {
        if (arguments.length === 0) {
            return accessToken;
        }
        accessToken = value;
        tokenTime = time || new Date();
        return accessToken;
    }

    function setAndGetRefreshTokenCallback(value) {
        if (arguments.length === 0) {
            return refreshTokenCallback;
        }
        refreshTokenCallback = value;
        return refreshTokenCallback;
    }

    function setAndGetCountryCode(value) {
        if (arguments.length === 0) {
            return countryCode;
        }
        countryCode = value;
        return countryCode;
    }

    function setAndGetLocaleIdentifier(value) {
        if (arguments.length === 0) {
            return localeIdentifier;
        }
        localeIdentifier = value;
        return localeIdentifier;
    }

    function setAndGetLoggingHandler(value) {
        if (arguments.length === 0) {
            return loggingHandler;
        }
        loggingHandler = value;
        return loggingHandler;
    }

    function logFatal() {
        if (arguments.length === 0) {
            return typeof loggingHandler.logFatal === 'function';
        }
        loggingHandler.logFatal.apply(loggingHandler, arguments);
    }

    function logError() {
        if (arguments.length === 0) {
            return typeof loggingHandler.logError === 'function';
        }
        loggingHandler.logError.apply(loggingHandler, arguments);
    }

    function logWarn() {
        if (arguments.length === 0) {
            return typeof loggingHandler.logWarn === 'function';
        }
        loggingHandler.logWarn.apply(loggingHandler, arguments);
    }

    function logInfo() {
        if (arguments.length === 0) {
            return typeof loggingHandler.logInfo === 'function';
        }
        loggingHandler.logInfo.apply(loggingHandler, arguments);
    }

    function logDebug() {
        if (arguments.length === 0) {
            return typeof loggingHandler.logDebug === 'function';
        }
        loggingHandler.logDebug.apply(loggingHandler, arguments);
    }

    function logVerbose() {
        if (arguments.length === 0) {
            return typeof loggingHandler.logVerbose === 'function';
        }
        loggingHandler.logVerbose.apply(loggingHandler, arguments);
    }

    function http(request, result, error, onUploadProgress) {
        var xhr = new XMLHttpRequest();
        if (request.responseType) {
            try {
                xhr.responseType = request.responseType;
            } catch (e) {
                if (request.responseType !== 'json') {
                    throw e;
                } else {
                    //ignore
                }
            }
        }
        function getResponseHeader(header) {
            return xhr.getResponseHeader(header);
        }

        xhr.onload = function onLoad() {
            var response = ('response' in xhr) ? xhr.response : xhr.responseText;
            var status = xhr.status;
            //bug (http://bugs.jquery.com/ticket/1450)
            if (status === 1223) {
                status = 204
            }
            if (status >= 200 && status < 300) {
                if (request.responseType === 'json' && typeof response === 'string') {
                    response = JSON.parse(response);
                }
                result({
                    xhr: xhr,
                    headers: getResponseHeader,
                    data: response,
                    status: status
                })
            } else {
                onError();
            }
        };

        function onError() {
            var response = ('response' in xhr) ? xhr.response : xhr.responseText;
            error({
                xhr: xhr,
                data: response,
                status: xhr.status
            });
        }

        xhr.onerror = onError;
        xhr.onabort = onError;
        if (xhr.upload && typeof onUploadProgress === 'function') {
            xhr.upload.onprogress = onUploadProgress;
        }

        var paramsString;
        if ('params' in request) {
            var paramComponents = [];
            for (var paramName in request.params) {
                paramComponents.push(encodeURIComponent(paramName) + '=' + encodeURIComponent(request.params[paramName]));
            }
            paramsString = paramComponents.join('&');
        }
        var body = request.data;
        var url = request.url;
        if (typeof body === 'undefined' && request.method && request.method.toUpperCase() === 'POST') {
            body = paramsString;
        } else if (typeof paramsString !== 'undefined') {
            if (url.indexOf('?') > 0) {
                url += '&' + paramsString;
            } else {
                url += '?' + paramsString;
            }
        }
        xhr.open(request.method || 'GET', url, true);
        xhr.setRequestHeader('Accept', 'application/json, text/plain, */*');
        if (request.headers) {
            for (var header in request.headers) {
                //noinspection JSUnfilteredForInLoop
                xhr.setRequestHeader(header, request.headers[header]);
            }
        }
        xhr.send(body);
    }

    function processApiCallQueue() {
        var requests = apiCallQueue.concat([]);
        apiCallQueue = [];
        requests.forEach(function (args) {
            api.apply(this, args);
        });
    }

    function api(request, result, error, onUploadProgress) {
        if (typeof accessToken === 'undefined') {
            throw new Error('No access token is set');
        }
        if (typeof accessToken !== 'object') {
            throw new Error('Access token should be an object not a ' + typeof accessToken);
        }
        if (isTokenExpired()) {
            apiCallQueue.push([request, result, error]);
            if (apiCallQueue.length === 1) {
                try {
                    refreshTokenCallback(function (accessToken) {
                        setAndGetAccessToken(accessToken);
                        processApiCallQueue();
                    });
                } catch (e) {
                    if (logFatal()) {
                        logFatal('Failed to refresh access token.');
                    }
                    error(e);
                }
            }
        } else {
            if (typeof request.responseType === 'undefined') {
                request.responseType = 'json';
            }
            request.headers = request.headers || {};
            request.headers['Authorization'] = 'Bearer ' + accessToken['access_token'];
            if (!request.absolute) {
                request.url = baseUrl + request.url;
            }
            http(request, function (response) {
                timeLag = Date.now() - Date.parse(response.xhr.getResponseHeader('Date'));
                if (logDebug()) {
                    logDebug('Update time lag interval to ' + timeLag);
                }
                result(response);
            }, error, onUploadProgress);
        }
    }

    function normalizeWebSearchResult(result, itemMapper) {
        return function (response) {
            var resultData;
            if (typeof response.data._embedded !== 'undefined') {
                resultData = response.data._embedded.webSearchResultList.map(itemMapper);
            } else {
                resultData = [];
            }
            result({content: resultData, pageInfo: response.data.page});
        }
    }

    function mapWebSearchItem(webSearchItem) {
        var result = {
            type: webSearchItem.resourceType,
            uuid: webSearchItem.uuid,
            requestUUID: webSearchItem.requestUUID,
            visitUrl: webSearchItem._links.visit.href,
            title: webSearchItem.title,
            description: webSearchItem.description,
            url: webSearchItem.url
        };
        if (webSearchItem.thumbnailUrl) {
            result.thumbnailUrl = webSearchItem.thumbnailUrl;
            if (webSearchItem.thumbnailWidth && webSearchItem.thumbnailHeight) {
                result.thumbnailSize = {
                    width: webSearchItem.thumbnailWidth,
                    height: webSearchItem.thumbnailHeight
                };
            }
        }
        return result;
    }

    function mapWebSearchImageItem(webSearchItem) {
        var result = mapWebSearchItem(webSearchItem);
        result.sourceUrl = webSearchItem.sourceUrl;
        result.size = {
            width: webSearchItem.width,
            height: webSearchItem.height
        };
        return result;
    }

    function mapWebSearchVideoItem(webSearchItem) {
        var result = mapWebSearchItem(webSearchItem);
        result.duration = webSearchItem.duration;
        return result;
    }

    function buildWebSearchRequest(tvChannelCode, timestampRef, pageNumber, pageSize) {
        var request = {
            tvChannelCode: tvChannelCode,
            timestampRef: timestampRef,
            page: pageNumber,
            size: pageSize
        };
        if (countryCode) {
            request.countryCode = countryCode;
        }
        return request;
    }

    function buildWebSearchRequestWithCreditName(tvChannelCode, timestampRef, creditName, pageNumber, pageSize) {
        var request = buildWebSearchRequest(tvChannelCode, timestampRef, pageNumber, pageSize);
        request.creditName = creditName;
        return request;
    }

    function internalApiWebSearch(resourceType, itemMapper, request, result, error) {
        return api({
            url: '/api/web-search/' + resourceType,
            method: 'GET',
            params: request
        }, normalizeWebSearchResult(result, itemMapper), error);
    }

    function buildApiWebSearch(resourceType, itemMapper) {
        return function (tvChannelCode, timestampRef, pageNumber, pageSize, result, error) {
            var request = buildWebSearchRequest(tvChannelCode, timestampRef, pageNumber, pageSize);
            return internalApiWebSearch(resourceType, itemMapper, request, result, error);
        }
    }

    function buildApiWebSearchByCreditName(resourceType, itemMapper) {
        return function (tvChannelCode, timestampRef, creditName, pageNumber, pageSize, result, error) {
            var request = buildWebSearchRequestWithCreditName(tvChannelCode, timestampRef, creditName, pageNumber, pageSize);
            return internalApiWebSearch(resourceType, itemMapper, request, result, error);
        }
    }

    function currentSnapscreenTimestamp() {
        return Date.now() - timeLag;
    }

    function SnapscreenSnapViewController(searchRequestBuilder, autoSnapRequestBuilder, options) {
        var self = this;

        options = options || {};

        var snapComponent = document.createElement('div');
        snapComponent.setAttribute('class', 'snapscreen');

        var defaultCameraConstraints = {
            audio: false,
            video: {
                optional: [
                    {minWidth: 320}, {minWidth: 640}, {minWidth: 1024},
                    {minWidth: 1280}, {minWidth: 1920}, {minWidth: 2560}
                ]
            }
        };

        var videoDevices = new VideoDevicesController();

        var zoom = null;

        var video;

        var viewFrame;

        var checkCameraTimeout;

        var autoSnapTimeout;

        var autoSnapStatus = AUTOSNAP_STATUS_NONE;

        var currentStream;

        var snapComponentTemplate;

        var storage;
        if (typeof(Storage) !== 'undefined') {
            storage = localStorage;
        } else {
            storage = {snapscreenTvSearchVisited: true};
        }

        var blocked = false;

        var errorMessage = new AutoHideMessage();

        var feedbackMessage = new FeedbackMessage();

        var uiNavigator = options.navigator || new DefaultNavigationBehavior();

        var uiBlocker;

        if (typeof navigator.vibrate !== 'function') {
            navigator.vibrate = navigator.webkitVibrate || navigator.mozVibrate || function () {
                    return false;
                };
        }

        replaceBlocker();

        function replaceBlocker(newBlocker) {
            blocked && newBlocker && newBlocker.block();
            uiBlocker = {
                block: function () {
                    blocked = true;
                    newBlocker && newBlocker.block();
                },
                unblock: function () {
                    blocked = false;
                    newBlocker && newBlocker.unblock();
                }
            }
        }

        function delegateEvent(event, data) {
            if (options && typeof options[event] === 'function') {
                options[event].call(options, data);
            }
        }

        function CameraUiBlocker() {
            this.block = function () {
                snapComponentTemplate('snap').setAttribute('disabled', 'disabled');
                var cameraSwitchButton = snapComponentTemplate('switch');
                if (cameraSwitchButton) {
                    cameraSwitchButton.setAttribute('disabled', 'disabled')
                }
            };
            this.unblock = function () {
                snapComponentTemplate('snap').removeAttribute('disabled');
                var cameraSwitchButton = snapComponentTemplate('switch');
                if (cameraSwitchButton) {
                    cameraSwitchButton.removeAttribute('disabled')
                }
            }
        }

        function FileUiBlocker() {
            var BLOCK_STYLE_NAME = 'file-processing';

            this.block = function () {
                snapComponentTemplate('file').setAttribute('disabled', 'disabled');
                var label = snapComponentTemplate('label');
                var cssClass = label.getAttribute('class');
                if (cssClass && cssClass.length > 0) {
                    cssClass += ' ';
                }
                if (cssClass.indexOf(BLOCK_STYLE_NAME) === -1) {
                    cssClass += BLOCK_STYLE_NAME;
                    label.setAttribute('class', cssClass);
                }
            };
            this.unblock = function () {
                snapComponentTemplate('file').removeAttribute('disabled');
                var label = snapComponentTemplate('label');
                var cssClass = label.getAttribute('class');
                if (cssClass) {
                    var idx = cssClass.indexOf(BLOCK_STYLE_NAME);
                    if (idx > 0) {
                        var from = idx;
                        var to = idx + BLOCK_STYLE_NAME.length;
                        if (idx - 1 > 0 && cssClass.charAt(idx - 1) === ' ') {
                            from--;
                        }
                        label.setAttribute('class', cssClass.substr(0, from) + cssClass.substr(to));
                    }
                }
            }
        }

        function DefaultNavigationBehavior() {
            var modal = document.createElement('div');
            modal.setAttribute('class', 'snapscreen-modal');

            var modalTemplate = loadTemplate('modal', modal);

            function close() {
                self.dispose();
                document.body.removeChild(modal);
            }

            this.navigateToResults = function (viewController) {
                viewController.dispose();
                document.body.removeChild(modal);
            };

            this.navigateToComponent = function (viewController) {
                if (!viewController.isUsed()) {
                    viewController.appendTo(modalTemplate('site'));
                    modalTemplate('close').addEventListener('click', close);
                    document.body.appendChild(modal);
                }
            }
        }

        function AutoHideMessage() {
            var SHOW_MESSAGE_TIMEOUT = 10 * 1000;

            var messageTimeout;

            var messageElement;

            this.show = function (message) {
                if (messageTimeout) {
                    clearTimeout(messageTimeout);
                }
                if (!messageElement) {
                    messageElement = document.createElement('div');
                    messageElement.setAttribute('class', 'tv-search-error');
                    messageElement.textContent = message;
                    snapComponent.appendChild(messageElement);
                }
                messageTimeout = setTimeout(this.hide, SHOW_MESSAGE_TIMEOUT);
            };

            this.hide = function () {
                if (messageTimeout) {
                    clearTimeout(messageTimeout);
                    messageTimeout = null;
                }
                if (messageElement && messageElement.parentNode) {
                    messageElement.parentNode.removeChild(messageElement);
                }
                messageElement = null;
            }
        }

        function FeedbackMessage() {

            var messageElement;

            this.show = function (message) {
                if (!messageElement) {
                    messageElement = document.createElement('div');
                    messageElement.setAttribute('class', 'tv-search-feedback');
                    messageElement.textContent = message;
                    snapComponent.appendChild(messageElement);
                } else {
                    messageElement.textContent = message;
                }
            };

            this.hide = function () {
                if (messageElement && messageElement.parentNode) {
                    messageElement.parentNode.removeChild(messageElement);
                }
                messageElement = null;
            }
        }

        function SnapButton() {

            var snapButton;

            function snapButtonClick(e) {
                if (needToShowTutorial() || videoDevices.isSupported()) {
                    e.preventDefault();
                    uiNavigator.navigateToComponent(self);
                }
                if (!needToShowTutorial() && videoDevices.isSupported()) {
                    checkCamera();//needed for browsers which are support access to the camera via gesture only.
                }
            }

            function init() {
                if (!snapButton) {
                    snapButton = document.createElement('div');
                    snapButton.setAttribute('class', 'snapscreen');
                    var snapButtonTemplate = loadTemplate('button', snapButton);
                    snapButtonTemplate('file').addEventListener('change', fileChanged);
                    snapButtonTemplate('label').addEventListener('click', snapButtonClick);
                }
            }

            this.appendTo = function appendSnapButtonTo(target) {
                init();
                (target.append || target.appendChild).call(target, snapButton);
            };

            this.dispose = function disposeSnapButton() {
                if (snapButton !== null && snapButton.parentNode) {
                    snapButton.parentNode.removeChild(snapButton);
                }
            };
        }

        function VideoDevicesController() {
            var devices;

            var current;

            // detect get user media fuction
            var getUserMedia = null;
            if (typeof navigator.mediaDevices !== 'undefined' &&
                typeof navigator.mediaDevices.getUserMedia === 'function') {
                getUserMedia = function (constraints, result, reject) {
                    navigator.mediaDevices.getUserMedia(constraints).then(result, reject)
                };
            } else {
                var delegate = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
                if (typeof delegate === 'function') {
                    if (delegate.length && delegate.length === 3) {
                        getUserMedia = function (constraints, result, reject) {
                            delegate.call(navigator, constraints, result, reject);
                        }
                    } else {
                        getUserMedia = function (constraints, result, reject) {
                            delegate.call(navigator, result, reject);
                        }
                    }
                }
            }

            function detect(resolve, reject) {
                if (typeof devices !== 'undefined') {
                    if (devices === null || devices.length > 0) {
                        resolve(devices);
                    } else {
                        reject('no video devices detected');
                    }
                } else if (typeof MediaStreamTrack !== 'undefined' && typeof MediaStreamTrack.getSources === 'function') {
                    MediaStreamTrack.getSources(function (sources) {
                        devices = [];
                        for (var i = 0; i < sources.length; i++) {
                            if (sources[i].kind === 'video') {
                                devices.push({
                                    id: sources[i].id,
                                    label: sources[i].label,
                                    facing: sources[i].facing,
                                    kind: 'videoinput'
                                });
                            }
                        }
                        if (devices.length > 0) {
                            resolve(devices);
                        } else {
                            reject('no video devices detected');
                        }
                    });
                } else if (navigator && navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === 'function') {
                    navigator.mediaDevices.enumerateDevices().then(function (mediaDevices) {
                        devices = [];
                        for (var i = 0; i < mediaDevices.length; i++) {
                            if (mediaDevices[i].kind === 'videoinput') {
                                devices.push({
                                    id: mediaDevices[i].deviceId,
                                    label: mediaDevices[i].label,
                                    facing: mediaDevices[i].label.endsWith('facing back') ? 'environment' : 'user',
                                    kind: 'videoinput'
                                });
                            }
                        }
                        if (devices.length > 0) {
                            resolve(devices);
                        } else {
                            reject('no video devices detected');
                        }
                    }).catch(reject);
                } else {
                    devices = null;
                    resolve(devices);
                }
            }

            function open(device, resolve, reject) {
                function onDeviceStreamReady(stream) {
                    current = device;
                    resolve(stream);
                }
                if (device) {
                    getUserMedia({
                        audio: false, video: {
                            mandatory: {sourceId: device.id},
                            optional: defaultCameraConstraints.video.optional
                        }
                    }, onDeviceStreamReady, reject);
                } else {
                    getUserMedia(defaultCameraConstraints, onDeviceStreamReady, reject);
                }
            }

            this.openPreferred = function (resolve, reject) {
                if (typeof getUserMedia !== 'function') {
                    reject('getUserMedia is not supported');
                } else if (current) {
                    open(current, resolve, reject);
                } else {
                    detect(function onVideoDevicesDetected(devices) {
                        var device = null;
                        if (devices) {
                            for (var i = 0; i < devices.length; i++) {
                                if (devices[i].facing === 'environment') {
                                    device = devices[i];
                                }
                            }
                            if (!device) {
                                device = devices[devices.length - 1];
                            }
                        }
                        open(device, resolve, reject);
                    }, reject);
                }
            };

            this.switch = function(resolve, reject) {
                if (!devices || devices.length < 2 || !current) {
                    reject('no video device to switch');
                }
                var index = devices.indexOf(current);
                if (index < 0) {
                    reject('unknown current video device');
                }
                index++;
                if (index >= devices.length) {
                    index = 0;
                }
                open(devices[index], resolve, reject);
            };

            this.isSwitchSupported = function() {
                return devices && devices.length > 1;
            };

            this.isSupported = function() {
                return window.location.protocol === 'https:' && typeof getUserMedia === 'function';
            };
        }

        function ZoomController(template) {
            var element = template('video');
            var container = element.parentNode;
            var control = template('zoom');
            var point = control.childNodes[0];

            var inputMethod = '';
            var scaleFactor = 1;
            var scaleFactorChange = 1;
            var touchInitDistance = 0;

            control.addEventListener('mousedown', onSliderMouseDown);
            control.addEventListener('touchstart', onSliderTouchStart);
            container.addEventListener('mousemove', onSliderMouseMove);
            container.addEventListener('mouseup', onSliderMouseUp);

            container.addEventListener('touchstart', onTouchStart);
            container.addEventListener('touchmove', onTouchMove);
            container.addEventListener('touchend', onTouchEnd);

            function onSliderMouseDown(event) {
                if (inputMethod === '') {
                    inputMethod = 'SLIDER_MOUSE';
                    onSliderMoved(event);
                }
            }

            function onSliderMouseMove(event) {
                if (inputMethod === 'SLIDER_MOUSE') {
                    onSliderMoved(event);
                }
            }

            function onSliderMouseUp() {
                if (inputMethod === 'SLIDER_MOUSE') {
                    inputMethod = '';
                }
            }

            function onSliderTouchStart(event) {
                if (inputMethod === '') {
                    event.preventDefault();
                    inputMethod = 'SLIDER_TOUCH';
                    onSliderMoved(event.touches[0]);
                }
            }

            function onSliderMoved(event) {
                var rect = control.getBoundingClientRect();
                var left;
                if (rect.left > event.pageX - 10) {
                    left = 0;
                } else if (rect.right < event.pageX + 10) {
                    left = rect.width - 20;
                } else {
                    left = event.pageX - rect.left - 10;
                }
                point.style.left = left + 'px';
                scaleFactor = 1 + (MAX_SCALE - 1) * left / (rect.width - 20);
                changeScale(scaleFactor);
            }

            function onTouchStart(event) {
                if ((inputMethod !== '' && inputMethod !== 'PINCH_ZOOM') || event.target.tagName === 'BUTTON') {
                    return;
                }
                event.preventDefault();
                inputMethod = 'PINCH_ZOOM';
                if (event.touches.length === 2) {
                    touchInitDistance = touchDistance(event.touches[0], event.touches[1]);
                }
            }

            function onTouchMove(event) {
                if (inputMethod === 'SLIDER_TOUCH') {
                    event.preventDefault();
                    onSliderMoved(event.touches[0]);
                } else if (inputMethod === 'PINCH_ZOOM') {
                    event.preventDefault();
                    if (event.touches.length === 2 && touchInitDistance > 0) {
                        scaleFactorChange = touchDistance(event.touches[0], event.touches[1]) / touchInitDistance;
                        var scale = changeScale(scaleFactor * scaleFactorChange);
                        var left = ((scale - 1) / (MAX_SCALE - 1)) * (control.getBoundingClientRect().width - 20);
                        point.style.left = left + 'px';
                    }
                }
            }

            function onTouchEnd(event) {
                if (inputMethod === 'SLIDER_TOUCH') {
                    event.preventDefault();
                    inputMethod = '';
                } else if (inputMethod === 'PINCH_ZOOM') {
                    event.preventDefault();
                    touchInitDistance = 0;
                    scaleFactor = scaleFactor * scaleFactorChange;
                    if (scaleFactor < 1) {
                        scaleFactor = 1;
                    } else if (scaleFactor > MAX_SCALE) {
                        scaleFactor = MAX_SCALE;
                    }
                    scaleFactorChange = 1;
                    inputMethod = '';
                }
            }

            function changeScale(scale) {
                if (scale > 4) {
                    scale = 4;
                }
                if (scale > 1) {
                    element.style.webkitTransform = 'scale(' + scale + ',' + scale + ')';
                    element.style.mozTransform = 'scale(' + scale + ',' + scale + ')';
                    element.style.msTransform = 'scale(' + scale + ',' + scale + ')';
                    element.style.oTransform = 'scale(' + scale + ',' + scale + ')';
                    element.style.transform = 'scale(' + scale + ',' + scale + ')';
                    return scale;
                } else {
                    element.removeAttribute('style');
                    return 1;
                }
            }

            function touchDistance(touch1, touch2) {
                return Math.sqrt((touch1.clientX - touch2.clientX) * (touch1.clientX - touch2.clientX) +
                    (touch1.clientY - touch2.clientY) * (touch1.clientY - touch2.clientY))
            }

            this.dispose = function disposeZoomController() {
                control.removeEventListener('mousedown', onSliderMouseDown);
                control.removeEventListener('touchstart', onSliderTouchStart);
                container.removeEventListener('mousemove', onSliderMouseMove);
                container.removeEventListener('mouseup', onSliderMouseUp);

                container.removeEventListener('touchstart', onTouchStart);
                container.removeEventListener('touchmove', onTouchMove);
                container.removeEventListener('touchend', onTouchEnd);
            };

            this.scaleFactor = function getScaleFactor() {
                return scaleFactor;
            };
        }

        function loadTemplate(templateCode, target) {
            var suffix = Date.now() + '_' + Math.round(10000000 * Math.random());
            target.innerHTML = templates[templateCode].split(':{suffix}:').join(suffix);
            return function elementAccessor(id) {
                return target.querySelector('#snapscreen' + suffix + id);
            }
        }

        function showShortTutorial() {
            var tutorial = document.createElement('div');

            function close() {
                snapComponent.removeChild(tutorial);
            }

            function onTutorialFileChanged(e) {
                close();
                fileChanged(e);
            }

            function onTutorialSnapClick(e) {
                storage.snapscreenTvSearchVisited = true;
                if (videoDevices.isSupported()) {
                    e.preventDefault();
                    close();
                    checkCamera();
                }
            }

            var tutorialTemplate = loadTemplate('tutorial', tutorial);
            tutorialTemplate('file').addEventListener('change', onTutorialFileChanged);
            tutorialTemplate('label').addEventListener('click', onTutorialSnapClick);
            snapComponent.appendChild(tutorial);
        }

        function getExifOrientation(arrayBuffer) {
            var byteBuffer = new DataView(arrayBuffer);
            if (byteBuffer.getUint16(0) !== 0xFFD8) {
                if (logDebug()) {
                    logDebug('Not a JPEG');
                }
                return 0;
            }
            var seekPosition = 2;
            var fileLength = byteBuffer.byteLength;
            var exifMetaFound = false;
            while (seekPosition < fileLength) {
                var metaTagLength = byteBuffer.getUint16(seekPosition + 2);
                if (byteBuffer.getUint16(seekPosition) === 0xFFE1) {
                    exifMetaFound = true;
                    break;
                }
                seekPosition += 2 + metaTagLength;
            }
            if (!exifMetaFound) {
                return 0;
            }
            seekPosition += 4; //skip length definitions
            var i;
            for (i = 0; i < 4; i++) {
                if ('Exif'.charCodeAt(i) !== byteBuffer.getUint8(seekPosition + i)) {
                    if (logWarn()) {
                        logWarn('Not valid Exif data');
                    }
                    return 0;
                }
            }
            seekPosition += 6;//skip Exif string and 0x0000
            var littleEndian;
            var endianType = byteBuffer.getUint16(seekPosition);
            if (endianType === 0x4949) {//II
                littleEndian = true;
            } else if (endianType === 0x4D4D) {//MM
                littleEndian = false;
            } else {
                if (logWarn()) {
                    logWarn('Not valid TIFF data (Failed to detect endianness type) ' + endianType.toString(16));
                }
                return 0;
            }
            //skip "42" header
            var ifdOffset = byteBuffer.getUint32(seekPosition + 4, littleEndian);
            if (ifdOffset < 8) {
                if (logWarn()) {
                    logWarn('Not valid TIFF data (IFD offset less then header ' + ifdOffset + ')');
                }
                return 0;
            }
            seekPosition += ifdOffset;
            var tagCount = byteBuffer.getUint16(seekPosition, littleEndian);
            if (logDebug()) {
                logDebug('tag count: ' + tagCount);
            }
            seekPosition += 2;
            for (i = 0; i < tagCount; i++) {
                var entryPosition = seekPosition + i * 12;
                if (byteBuffer.getUint16(entryPosition, littleEndian) === 0x0112) { //Orientation
                    if (logDebug()) {
                        logDebug('orientation found');
                    }
                    var tagValueType = byteBuffer.getUint16(entryPosition + 2, littleEndian);
                    if (tagValueType === 3) {//SHORT
                        if (logDebug()) {
                            logDebug('orientation SHORT value found');
                        }
                        return byteBuffer.getUint16(entryPosition + 8, littleEndian);
                    }
                    if (tagValueType === 4) {//LONG
                        if (logDebug()) {
                            logDebug('orientation LONG value found');
                        }
                        return byteBuffer.getUint32(entryPosition + 8, littleEndian);
                    }
                }
            }
            return 0;
        }

        function prepareStreamBlob(source, viewFinder, maxDimension, resolve, reject) {
            try {
                var sx = 0, sy = 0, sourceWidth = source.videoWidth, sourceHeight = source.videoHeight;
                var scaleFactor = zoom ? zoom.scaleFactor() : 1;
                if (scaleFactor > 1 || source !== viewFinder) {
                    var ratio = Math.max(source.videoWidth / source.clientWidth, source.videoHeight / video.clientHeight);
                    sourceWidth = parseInt(viewFinder.clientWidth * ratio / scaleFactor);
                    sourceHeight = parseInt(viewFinder.clientHeight * ratio / scaleFactor);
                    sx = parseInt((source.videoWidth - sourceWidth) / 2);
                    sy = parseInt((source.videoHeight - sourceHeight) / 2);

                    if (sx < 0) {
                        sx = 0;
                        sourceWidth = source.videoWidth;
                    } else if (sy < 0) {
                        sy = 0;
                        sourceHeight = source.videoHeight;
                    }
                }
                var preferredWidth = sourceWidth, preferredHeight = sourceHeight;
                if (preferredWidth > preferredHeight && preferredWidth > maxDimension) {
                    preferredHeight = parseInt(maxDimension * preferredHeight / preferredWidth);
                    preferredWidth = maxDimension;
                } else if (preferredHeight > maxDimension) {
                    preferredWidth = parseInt(maxDimension * preferredWidth / preferredHeight);
                    preferredHeight = maxDimension;
                }

                var dataCanvas = window.document.createElement('canvas');
                dataCanvas.width = preferredWidth;
                dataCanvas.height = preferredHeight;
                var ctx = dataCanvas.getContext('2d');
                ctx.drawImage(source, sx, sy, sourceWidth, sourceHeight, 0, 0, preferredWidth, preferredHeight);

                canvasToBlob(dataCanvas, resolve);
            } catch (e) {
                reject(e);
            }
        }

        function prepareFileBlob(source, exifOrientation, resolve, reject) {
            var preferredWidth;
            var preferredHeight;
            if (exifOrientation < 5) {
                preferredWidth = source.width;
                preferredHeight = source.height;
            } else { //has 90 deg rotation
                preferredWidth = source.height;
                preferredHeight = source.width;
            }
            try {
                if (preferredWidth > SNAP_MAX_DIMENSION) {
                    preferredHeight = parseInt(SNAP_MAX_DIMENSION * preferredHeight / preferredWidth);
                    preferredWidth = SNAP_MAX_DIMENSION;
                }
                var dataCanvas = window.document.createElement('canvas');
                dataCanvas.width = preferredWidth;
                dataCanvas.height = preferredHeight;
                var ctx = dataCanvas.getContext('2d');
                switch (exifOrientation) {
                    case 1:
                        ctx.transform(1, 0, 0, 1, 0, 0);
                        break;
                    case 2:
                        ctx.transform(-1, 0, 0, 1, preferredWidth, 0);
                        break;
                    case 3:
                        ctx.transform(-1, 0, 0, -1, preferredWidth, preferredHeight);
                        break;
                    case 4:
                        ctx.transform(1, 0, 0, -1, 0, preferredHeight);
                        break;
                    case 5:
                        ctx.transform(0, 1, 1, 0, 0, 0);
                        break;
                    case 6:
                        ctx.transform(0, 1, -1, 0, preferredWidth, 0);
                        break;
                    case 7:
                        ctx.transform(0, -1, -1, 0, preferredWidth, preferredHeight);
                        break;
                    case 8:
                        ctx.transform(0, -1, 1, 0, 0, preferredHeight);
                        break;
                }
                if (exifOrientation < 5) {
                    ctx.drawImage(source, 0, 0, source.width, source.height, 0, 0, preferredWidth, preferredHeight);
                } else { //has 90 deg rotation
                    ctx.drawImage(source, 0, 0, source.width, source.height, 0, 0, preferredHeight, preferredWidth);
                }
                canvasToBlob(dataCanvas, resolve);
            } catch (e) {
                reject(e);
            }
        }

        function canvasToBlob(canvas, resolve) {
            var mimeType = 'image/jpeg';
            if (typeof canvas.toBlob === 'function') {
                canvas.toBlob(function (imageBlob) {
                    resolve({
                        blob: imageBlob,
                        mimeType: mimeType,
                        width: canvas.width,
                        height: canvas.height
                    });
                }, mimeType, 0.9);
            } else {
                var dataURL = canvas.toDataURL(mimeType, 0.9);
                var dataUrlParts = dataURL.match(/^data:(.*?)(;charset=.*?)?(;base64)?,/);
                if (!dataUrlParts) {
                    throw new Error('Invalid data URI format');
                }
                var dataString = dataURL.slice(dataUrlParts[0].length);
                var byteString;
                if (dataUrlParts[3]) { //has ";base64" part
                    byteString = atob(dataString)
                } else {
                    byteString = decodeURIComponent(dataString)
                }
                var arrayBuffer = new ArrayBuffer(byteString.length);
                var intArray = new Uint8Array(arrayBuffer);
                for (var i = 0; i < byteString.length; i += 1) {
                    intArray[i] = byteString.charCodeAt(i)
                }
                resolve({
                    blob: arrayBuffer,
                    mimeType: mimeType,
                    width: canvas.width,
                    height: canvas.height
                });
            }
        }

        function needToShowTutorial() {
            return !options.withoutTutorial && !storage.snapscreenTvSearchVisited;
        }

        function checkCamera() {
            if (checkCameraTimeout) {
                return;
            }
            waitingForCamera();
            checkCameraTimeout = setTimeout(onStreamBlocked, 20000);
            videoDevices.openPreferred(onStreamReady, onStreamBlocked);
        }

        function waitingForCamera() {
            loadTemplate('waiting', snapComponent);
        }

        function onSearchResult(response) {
            uiBlocker.unblock();
            feedbackMessage.hide();
            if (typeof response.data.resultEntries === 'undefined') {
                if (logError()) {
                    logError('Invalid response');
                }
                uiNavigator.navigateToComponent(self);
                errorMessage.show(self.messages.failWithError);
                delegateEvent('onError', response.data);
            } else if (response.data.resultEntries.length) {
                if (logInfo()) {
                    logInfo('Received results count ' + response.data.resultEntries.length);
                }
                if (logVerbose()) {
                    logVerbose(response.data);
                }
                delegateEvent('onResult', response.data);
                if (options.vibrate) {
                    navigator.vibrate(250);
                }
                uiNavigator.navigateToResults(self, response.data);
            } else {
                errorMessage.show(self.messages.noResults);
                delegateEvent('onNoResult', response.data);
                uiNavigator.navigateToComponent(self);
            }
        }

        function onSearchFailed(error) {
            if (logError()) {
                logError('Failed to make search by the image.', error);
            }
            feedbackMessage.hide();
            errorMessage.show(self.messages.failWithError);
            uiBlocker.unblock();
            delegateEvent('onError', error);
        }

        function onSearchUploadProgress(event) {
            if (event.loaded === event.total) {
                feedbackMessage.show(self.messages.waitingResult);
            }
        }

        function snap() {
            if (autoSnapTimeout) {
                clearTimeout(autoSnapTimeout);
                autoSnapTimeout = null;
                autoSnapStatus = AUTOSNAP_STATUS_NONE;
            }
            if (currentStream) {
                uiBlocker.block();
                if (autoSnapStatus === AUTOSNAP_STATUS_IN_PROGRESS) {
                    autoSnapStatus = AUTOSNAP_STATUS_SNAP_REQUESTED;
                } else {
                    prepareStreamBlob(video, video, SNAP_MAX_DIMENSION, onDataReady, onDataError);
                }
            }
        }

        function isImageValid(img) {
            if ('naturalHeight' in img) {
                return img.naturalHeight > 0 && img.naturalWidth > 0
            }
            return img.width > 0 && this.height > 0;
        }

        function fileChanged(event) {
            var exifOrientation = 0;
            if (event.target.files.length > 0) {
                uiNavigator.navigateToComponent(self);
                uiBlocker.block();
                var img = new Image();
                img.onerror = onDataError;
                img.onload = function () {
                    if (isImageValid(img)) {
                        prepareFileBlob(img, exifOrientation, onDataReady, onDataError);
                    } else {
                        onDataError();
                    }
                    window.URL.revokeObjectURL(img.src);
                };
                var fileReader = new FileReader();
                var file = event.target.files[0];
                fileReader.onload = function (e) {
                    if (logDebug()) {
                        logDebug('Got file of length ' + e.target.result.byteLength);
                    }
                    exifOrientation = getExifOrientation(e.target.result);
                    img.src = window.URL.createObjectURL(file);
                };
                fileReader.onerror = onDataError;
                fileReader.readAsArrayBuffer(file);
            }
        }

        function onDataReady(blobMetadata) {
            errorMessage.hide();
            feedbackMessage.show(self.messages.uploadingImage);
            api(searchRequestBuilder(blobMetadata), onSearchResult, onSearchFailed, onSearchUploadProgress);
        }

        function onDataError(error) {
            if (logError()) {
                logError('Failed to prepare image data to send.', error);
            }
            feedbackMessage.hide();
            errorMessage.show(self.messages.photoError);
            uiBlocker.unblock();
            delegateEvent('onError', error);
        }

        function onStreamReady(stream) {
            if (checkCameraTimeout) {
                clearTimeout(checkCameraTimeout);
                checkCameraTimeout = null;
            }

            snapComponentTemplate = loadTemplate('camera', snapComponent);
            snapComponentTemplate('snap').addEventListener('click', snap);
            var switchCameraButton = snapComponentTemplate('switch');
            if (videoDevices.isSwitchSupported()) {
                switchCameraButton.addEventListener('click', switchCamera)
            } else {
                switchCameraButton.parentNode.removeChild(switchCameraButton);
            }

            uiBlocker = new CameraUiBlocker();

            currentStream = stream;
            video = snapComponentTemplate('video');
            video.src = window.URL.createObjectURL(stream);

            zoom = new ZoomController(snapComponentTemplate);
            viewFrame = snapComponentTemplate('frame');

            if (options.autoSnap && typeof autoSnapRequestBuilder === 'function') {
                autoSnapTimeout = setTimeout(autoSnap, AUTOSNAP_DELAY_INITIAL);
                autoSnapStatus = AUTOSNAP_STATUS_WAITING;
            } else {
                autoSnapTimeout = null;
                autoSnapStatus = AUTOSNAP_STATUS_NONE;
            }

            if (logDebug()) {
                logDebug('User stream obtained');
            }
        }

        function onStreamBlocked(reason) {
            if (checkCameraTimeout) {
                clearTimeout(checkCameraTimeout);
                checkCameraTimeout = null;
            }
            if (logInfo()) {
                logInfo('Camera blocked with reason ' + reason);
            }
            switchFileMode();
        }

        function switchCamera() {
            if (currentStream) {
                disposeStream();
            }
            videoDevices.switch(onStreamReady, onStreamBlocked)
        }

        function switchFileMode() {
            disposeStream();
            snapComponentTemplate = loadTemplate('file', snapComponent);
            snapComponentTemplate('file').addEventListener('change', fileChanged);
            replaceBlocker(new FileUiBlocker());
        }

        function autoSnap() {
            autoSnapTimeout = null;
            autoSnapStatus = AUTOSNAP_STATUS_IN_PROGRESS;
            if (currentStream && video) {
                prepareStreamBlob(video, viewFrame, AUTOSNAP_MAX_DIMENSION, onAutoSnapDataReady, onAutoSnapDataError);
            }
        }

        function onAutoSnapDataReady(blobMetadata) {
            api(autoSnapRequestBuilder(blobMetadata), onAutoSnapResult, onAutoSnapFailed);
        }

        function onAutoSnapDataError(error) {
            if (logError()) {
                logError('Failed to prepare image data for auto snap.', error);
            }
            delegateEvent('onError', error);
            scheduleNextAutoSnap();
        }

        function onAutoSnapResult(response) {
            if (typeof response.data.resultEntries === 'undefined') {
                if (logError()) {
                    logError('Invalid auto snap response');
                }
                delegateEvent('onError', response.data);
                scheduleNextAutoSnap();
            } else if (response.data.resultEntries.length) {
                if (logInfo()) {
                    logInfo('Received auto snap results count ' + response.data.resultEntries.length);
                }
                if (logVerbose()) {
                    logVerbose(response.data);
                }
                delegateEvent('onResult', response.data);
                if (options.vibrate) {
                    navigator.vibrate(250);
                }
                uiNavigator.navigateToResults(self, response.data);
            } else {
                delegateEvent('onNoResult', response.data);
                scheduleNextAutoSnap();
            }
        }

        function onAutoSnapFailed(error) {
            if (logError()) {
                logError('Failed to make auto snap by the image.', error);
            }
            delegateEvent('onError', error);
            scheduleNextAutoSnap();
        }

        function scheduleNextAutoSnap() {
            if (autoSnapStatus === AUTOSNAP_STATUS_IN_PROGRESS) {
                autoSnapTimeout = setTimeout(autoSnap, AUTOSNAP_DELAY);
                autoSnapStatus = AUTOSNAP_STATUS_WAITING;
            } else if (autoSnapStatus === AUTOSNAP_STATUS_SNAP_REQUESTED) {
                autoSnapStatus = AUTOSNAP_STATUS_NONE;
                snap();
            }
        }

        function prepareView() {
            if (needToShowTutorial()) {
                switchFileMode();
                showShortTutorial();
            } else {
                checkCamera();
            }
        }

        function disposeStream() {
            if (currentStream) {
                if (currentStream.getTracks && typeof currentStream.getTracks === 'function') {
                    var tracks = currentStream.getTracks();
                    for (var i = 0; i < tracks.length; i++) {
                        tracks[i].stop();
                    }
                } else if (currentStream.stop && typeof currentStream.stop === 'function') {
                    currentStream.stop();
                }
                currentStream = null;

                window.URL.revokeObjectURL(video.src);
                video.removeAttribute('src');
                video.load();
                video = null;
                viewFrame = null;

                zoom.dispose();
                zoom = null;
            }
        }

        function isUsed() {
            return snapComponent.parentNode !== null;
        }

        function appendTo(target) {
            (target.append || target.appendChild).call(target, snapComponent);
            prepareView();
        }

        function dispose() {
            if (snapComponent.parentNode) {
                snapComponent.parentNode.removeChild(snapComponent);
            }

            if (checkCameraTimeout) {
                clearTimeout(checkCameraTimeout);
                checkCameraTimeout = null;
            }


            if (autoSnapTimeout) {
                clearTimeout(autoSnapTimeout);
                autoSnapTimeout = null;
            }

            disposeStream();
        }

        this.isUsed = isUsed;
        this.appendTo = appendTo;
        this.dispose = dispose;

        this.createSnapButton = function createSnapButton() {
            return new SnapButton();
        };
        this.messages = {
            photoError: 'Some error happens while preparing photo to send.' +
            ' Please retry searching with different image.',
            failWithError: 'Some error happens while searching a TV.' +
            ' Please retry searching with different image.',
            noResults: 'We’re sorry, your Snap returned no results -' +
            ' either the channel you are watching is not supported or a TV screen could not be detected.',
            uploadingImage: 'Uploading image...',
            waitingResult: 'Getting results...'
        }
    }

    function snapHttpHeaders(blobMetadata) {
        var headers = {
            'Content-type': 'application/octet-stream',
            'X-Snapscreen-MimeType': blobMetadata.mimeType,
            'X-Snapscreen-Width': blobMetadata.width,
            'X-Snapscreen-Height': blobMetadata.height
        };
        if (countryCode) {
            headers['X-Snapscreen-CountryCode'] = countryCode;
        }
        return headers;
    }

    function autoSnapHttpHeaders(blobMetadata) {
        var headers = snapHttpHeaders(blobMetadata);
        headers['X-Snapscreen-Timestamp'] = currentSnapscreenTimestamp();
        return headers;
    }

    function createSnapscreenTvSnapViewController(options) {
        return new SnapscreenSnapViewController(function searchEpg(blobMetadata) {
            return {
                method: 'POST',
                url: '/api/tv-search/epg/by-image',
                headers: snapHttpHeaders(blobMetadata),
                data: blobMetadata.blob
            };
        }, function autoSnapEpg(blobMetadata) {
            return {
                method: 'POST',
                url: '/api/tv-search/epg/near-timestamp/by-image',
                headers: autoSnapHttpHeaders(blobMetadata),
                data: blobMetadata.blob
            };
        }, options);
    }

    function createSnapscreenAdsSnapViewController(options) {
        return new SnapscreenSnapViewController(function searchAds(blobMetadata) {
            return {
                method: 'POST',
                url: '/api/ads/search/by-image',
                headers: snapHttpHeaders(blobMetadata),
                data: blobMetadata.blob
            };
        }, null, options);
    }

    function createSnapscreenSportSnapViewController(options) {
        return new SnapscreenSnapViewController(function searchSport(blobMetadata) {
            return {
                method: 'POST',
                url: '/api/tv-search/sport/by-image',
                headers: snapHttpHeaders(blobMetadata),
                data: blobMetadata.blob
            };
        }, function autoSnapSport(blobMetadata) {
            return {
                method: 'POST',
                url: '/api/tv-search/sport/near-timestamp/by-image',
                headers: autoSnapHttpHeaders(blobMetadata),
                data: blobMetadata.blob
            };
        }, options);
    }

    /**
     * Snapscreen SDK module.
     *
     * @module SnapscreenKit
     */
    scope.SnapscreenKit = {
        http: http,
        api: api,
        tvSnapViewController: createSnapscreenTvSnapViewController,
        sportSnapViewController: createSnapscreenSportSnapViewController,
        adsSnapViewController: createSnapscreenAdsSnapViewController,
        webSearchService: {
            searchSites: buildApiWebSearch('web', mapWebSearchItem),
            searchImages: buildApiWebSearch('image', mapWebSearchImageItem),
            searchVideos: buildApiWebSearch('video', mapWebSearchVideoItem),
            searchSitesByCreditName: buildApiWebSearchByCreditName('web', mapWebSearchItem),
            searchImagesByCreditName: buildApiWebSearchByCreditName('image', mapWebSearchImageItem),
            searchVideosByCreditName: buildApiWebSearchByCreditName('video', mapWebSearchVideoItem)
        },
        accessTokenHolder: {
            accessToken: setAndGetAccessToken,
            refreshTokenCallback: setAndGetRefreshTokenCallback,
            isTokenExpired: isTokenExpired
        },
        countryCode: setAndGetCountryCode,
        localeIdentifier: setAndGetLocaleIdentifier,
        loggingHandler: setAndGetLoggingHandler,
        currentSnapscreenTimestamp: currentSnapscreenTimestamp
    }
})(window);