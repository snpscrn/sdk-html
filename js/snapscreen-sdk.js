/**
 * @file snapscreen-sdk.js
 * @brief a tool kit which provide an easy way to use Snpascreen's API.
 * @copyright 2016 Snapscreen. All rights reserved.
 */
(function (scope) {
    if (!String.prototype.startsWith) {
        String.prototype.startsWith = function(searchString, position){
            position = position || 0;
            return this.substr(position, searchString.length) === searchString;
        };
    }

    function merge(left, right){
        var result = [], il = 0, ir = 0;

        while (il < left.length && ir < right.length){
            if (left[il].score > right[ir].score){
                result.push(left[il++]);
            } else {
                result.push(right[ir++]);
            }
        }

        return result.concat(left.slice(il)).concat(right.slice(ir));
    }

    function extend() {
        var i, prop, argument, extended = {};
        for (i = 0; i < arguments.length; i++) {
            argument = arguments[i];
            if (argument) {
                for (prop in argument) {
                    if (Object.prototype.hasOwnProperty.call(argument, prop)) {
                        extended[prop] = argument[prop];
                    }
                }
            }
        }
        return extended;
    }

    function loggerFactory() {
        var handler = {
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

        function setAndGetHandler(value) {
            if (arguments.length === 0) {
                return handler;
            }
            handler = value;
            return handler;
        }

        return {
            "handler": setAndGetHandler,
            "logFatal": function() {
                if (typeof handler.logFatal === 'function') {
                    handler.logFatal.apply(handler, arguments);
                }
            },
            "logError": function(message) {
                if (typeof handler.logError === 'function') {
                    handler.logError.apply(handler, arguments);
                }
            },
            "logWarn": function(message) {
                if (typeof handler.logWarn === 'function') {
                    handler.logWarn.apply(handler, arguments);
                }
            },
            "logInfo": function(message) {
                if (typeof handler.logInfo === 'function') {
                    handler.logInfo.apply(handler, arguments);
                }
            },
            "logDebug": function(message) {
                if (typeof handler.logDebug === 'function') {
                    handler.logDebug.apply(handler, arguments);
                }
            },
            "logVerbose": function(message) {
                if (typeof handler.logVerbose === 'function') {
                    handler.logVerbose.apply(handler, arguments);
                }
            }
        };
    }

    function accessTokenHolderFactory(logger) {
        var accessToken, tokenTime, refreshTokenCallback, callQueue;

        function isTokenExpired() {
            return tokenTime.getTime() + 1000 * accessToken.expires_in < Date.now();
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

        function refreshTokenHandler(accessToken) {
            setAndGetAccessToken(accessToken);
            var queue = callQueue;
            callQueue = [];
            queue.forEach(function (deferred) {
                deferred.resolve(accessToken.access_token);
            });
        }

        function withAccessToken(deferred) {
            if (typeof accessToken === 'undefined') {
                throw new Error('No access token is set');
            }
            if (typeof accessToken !== 'object') {
                throw new Error('Access token should be an object not a ' + typeof accessToken);
            }
            if (isTokenExpired()) {
                callQueue.push(deferred);
                if (callQueue.length === 1) {
                    try {
                        refreshTokenCallback(refreshTokenHandler);
                    } catch (e) {
                        logger.logFatal('Failed to refresh access token.');
                        deferred.reject(e);
                    }
                }
            } else {
                deferred.resolve(accessToken.access_token);
            }
        }

        callQueue = [];
        refreshTokenCallback = function () {
            throw new Error('Token is expired but refreshTokenCallback is not configured');
        };

        return {
            "accessToken": setAndGetAccessToken,
            "refreshTokenCallback": setAndGetRefreshTokenCallback,
            "isTokenExpired": isTokenExpired,
            "withAccessToken": withAccessToken
        };
    }

    function analyticsFactory() {
        var trackEvent, category = 'SnapscreenSDK', label = 'JS/1.0.0';
        trackEvent = function(action, value) {
            try {
                if (typeof ga === 'function') {
                    ga('send', {
                        "hitType": 'pageview',
                        "transport": 'beacon',
                        "page": '/' + category + '/' + label + '/' + action,
                        "title": category + ': ' + action
                    });
                } else if (typeof gtag === 'function') {
                    gtag('event', 'page_view', {
                        "page_path": '/' + category + '/' + label + '/' + action,
                        "page_title": category + ': ' + action
                    });
                } else {
                    console.log('Tracked event', {
                        "eventCategory": category,
                        "eventAction": action,
                        "eventLabel": label,
                        "eventValue": value
                    });
                }
            } catch(error) {
                console.error('Failed to track event', error);
            }
        };

        return {
            sdkInitialized: function() {
                trackEvent('SnapSdkInit');
            },
            snapViewOpened: function() {
                trackEvent('SnapViewOpen');
            },
            snapViewSnap: function() {
                trackEvent('SnapViewSnap');
            },
            snapViewSnapResult: function(duration) {
                trackEvent('SnapViewSnapResult', duration);
            },
            snapViewSnapFailed: function(duration) {
                trackEvent('SnapViewSnapFail', duration);
            },
            snapViewSnapNegative: function(duration) {
                trackEvent('SnapViewSnapNegative', duration);
            },
            snapViewClosed: function() {
                trackEvent('SnapViewClose');
            },
            clipShareOpened: function() {
                trackEvent('ClipShareOpen');
            },
            clipShareNotFound: function() {
                trackEvent('ClipShareNotFound');
            },
            clipShareOpenFailed: function() {
                trackEvent('ClipShareOpenFail');
            },
            clipSharePreviewPlay: function() {
                trackEvent('ClipSharePreviewPlay');
            },
            clipSharePreviewClosed: function() {
                trackEvent('ClipSharePreviewClose');
            },
            clipShareCreate: function() {
                trackEvent('ClipShareCreate');
            },
            clipShareCreated: function() {
                trackEvent('ClipShareCreated');
            },
            clipShareCreateFailed: function() {
                trackEvent('ClipShareCreateFail');
            },
            clipShareClosed: function() {
                trackEvent('ClipShareClose');
            },
            clipShareShare: function() {
                trackEvent('ClipShareShare');
            },
            clipShareShared: function() {
                trackEvent('ClipShareShared');
            },
            clipShareShareCancelled: function() {
                trackEvent('ClipShareShareCancel');
            }
        };
    }

    function http(request, resolve, reject, onUploadProgress) {
        var xhr, url, header, paramsString, paramName, body;

        function getResponseHeader(header) {
            return xhr.getResponseHeader(header);
        }

        function onError() {
            reject({
                xhr: xhr,
                data: ('response' in xhr) ? xhr.response : xhr.responseText,
                status: xhr.status
            });
        }

        function onLoad() {
            var response = ('response' in xhr) ? xhr.response : xhr.responseText, status = xhr.status;
            //bug (http://bugs.jquery.com/ticket/1450)
            if (status === 1223) {
                status = 204;
            }
            if (status >= 200 && status < 300) {
                if (request.responseType === 'json' && typeof response === 'string') {
                    response = JSON.parse(response);
                }
                resolve({
                    xhr: xhr,
                    headers: getResponseHeader,
                    data: response,
                    status: status
                });
            } else {
                onError();
            }
        }

        xhr = new XMLHttpRequest();
        if (request.responseType) {
            try {
                xhr.responseType = request.responseType;
            } catch (e) {
                if (request.responseType !== 'json') {
                    throw e;
                }
            }
        }

        xhr.onload = onLoad;
        xhr.onerror = onError;
        xhr.onabort = onError;
        if (xhr.upload && typeof onUploadProgress === 'function') {
            xhr.upload.onprogress = onUploadProgress;
        }

        if (request.hasOwnProperty('params')) {
            paramsString = '';
            for (paramName in request.params) {
                if (request.params.hasOwnProperty(paramName)) {
                    if (paramsString.length > 0) {
                        paramsString += '&';
                    }
                    paramsString += encodeURIComponent(paramName) + '=' + encodeURIComponent(request.params[paramName]);
                }
            }
        }
        body = request.data;
        url = request.url;
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
            for (header in request.headers) {
                if (request.headers.hasOwnProperty(header)) {
                    xhr.setRequestHeader(header, request.headers[header]);
                }
            }
        }

        xhr.send(body);
    }

    function snapscreenApiFactory(logger, accessTokenHolder) {
        var timeLag = 0, baseUrl = 'https://api.snapscreen.com/api';

        function currentTimestamp() {
            return Date.now() - timeLag;
        }

        function setOrGetBaseUrl() {
            if (arguments.length === 0) {
                return baseUrl;
            }
            baseUrl = arguments[0];
            return baseUrl;
        }

        function exchange(request, resolve, reject, onUploadProgress) {
            accessTokenHolder.withAccessToken({
                "resolve": function(accessToken) {
                    if (!request.hasOwnProperty('responseType')) {
                        request.responseType = 'json';
                    }
                    request.headers = request.headers || {};
                    request.headers.Authorization = 'Bearer ' + accessToken;
                    if (!request.absolute) {
                        request.url = baseUrl + request.url;
                    }
                    http(request, function (response) {
                        timeLag = Date.now() - Date.parse(response.xhr.getResponseHeader('Date'));
                        logger.logDebug('Update time lag interval to ' + timeLag);
                        resolve(response);
                    }, reject, onUploadProgress);
                },
                "reject": reject
            });
        }

        return {
            "exchange": exchange,
            "baseUrl": setOrGetBaseUrl,
            "currentTimestamp": currentTimestamp
        };
    }

    function snapServiceFactory(logger, snapscreenApi) {
        function snapHttpHeaders(request) {
            var headers = {
                "Content-type": 'application/octet-stream',
                "X-Snapscreen-MimeType": request.mimeType
            };
            if (request.searchAds) {
                headers['X-Snapscreen-SearchAds'] = 'true';
            }
            return headers;
        }

        function autoSnapHttpHeaders(request) {
            var headers = snapHttpHeaders(request);
            headers['X-Snapscreen-Timestamp'] = snapscreenApi.currentTimestamp();
            return headers;
        }

        function onSearchResult(resolve, reject) {
            return function (response) {
                if (typeof response.data.resultEntries === 'undefined') {
                    logger.logError('Invalid response');
                    reject(response);
                } else {
                    var results = response.data;
                    if (results.adEntries && results.adEntries.length > 0) {
                        results = {
                            "requestUuid": results.requestUuid,
                            "screenQuadrangles": results.screenQuadrangles,
                            "resultEntries": merge(results.resultEntries, results.adEntries)
                        };
                    }
                    logger.logInfo('Received results count ' + results.resultEntries.length);
                    logger.logVerbose(results);
                    resolve(results);
                }
            };
        }

        function onSearchFailed(reject) {
            return function(error) {
                logger.logError('Failed to make search by the image.', error);
                reject(error);
            };
        }

        function snap(uri, request, headers, resolve, reject, onUploadProgress) {
            snapscreenApi.exchange({
                "method": 'POST',
                "url": uri,
                "headers": headers(request),
                "data": request.blob
            }, onSearchResult(resolve, reject), onSearchFailed(reject), onUploadProgress);
        }

        return {
            "epg": {
                "snap": function snapEpg(request, resolve, reject, onUploadProgress) {
                    snap('/tv-search/epg/by-image', request, snapHttpHeaders, resolve, reject, onUploadProgress);
                },
                "autoSnap": function autoSnapEpg(request, resolve, reject, onUploadProgress) {
                    snap('/tv-search/epg/near-timestamp/by-image', request, autoSnapHttpHeaders,
                        resolve, reject, onUploadProgress);
                }
            },
            "ads": {
                "snap": function snapAds(request, resolve, reject, onUploadProgress) {
                    snap('/ads/search/by-image', request, snapHttpHeaders, resolve, reject, onUploadProgress);
                }
            },
            "sport": {
                "snap": function snapSport(request, resolve, reject, onUploadProgress) {
                    snap('/tv-search/sport/by-image', request, snapHttpHeaders, resolve, reject, onUploadProgress);
                },
                "autoSnap": function autoSnapSport(request, resolve, reject, onUploadProgress) {
                    snap('/tv-search/sport/near-timestamp/by-image', request, autoSnapHttpHeaders,
                        resolve, reject, onUploadProgress);
                }
            }
        };
    }

    function blobServiceFactory(logger) {
        function canvasToBlob(canvas, resolve) {
            var mimeType = 'image/jpeg', dataURL, dataUrlParts, dataString, byteString, arrayBuffer, intArray, i;
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
                dataURL = canvas.toDataURL(mimeType, 0.9);
                /*jslint regexp: true*/
                dataUrlParts = dataURL.match(/^data:(.*?)(;charset=.*?)?(;base64)?,/);
                /*jslint regexp: false*/
                if (!dataUrlParts) {
                    throw new Error('Invalid data URI format');
                }
                dataString = dataURL.slice(dataUrlParts[0].length);
                if (dataUrlParts[3]) { //has ";base64" part
                    byteString = window.atob(dataString);
                } else {
                    byteString = decodeURIComponent(dataString);
                }
                arrayBuffer = new ArrayBuffer(byteString.length);
                intArray = new Uint8Array(arrayBuffer);
                for (i = 0; i < byteString.length; i += 1) {
                    intArray[i] = byteString.charCodeAt(i);
                }
                resolve({
                    blob: arrayBuffer,
                    mimeType: mimeType,
                    width: canvas.width,
                    height: canvas.height
                });
            }
        }

        function prepareStreamBlob(source, viewFinder, scaleFactor, maxDimension,  resolve, reject) {
            try {
                var sx = 0, sy = 0, sourceWidth = source.videoWidth, sourceHeight = source.videoHeight,
                    ratio, preferredWidth, preferredHeight, dataCanvas;
                if (scaleFactor > 1 || source !== viewFinder) {
                    ratio = Math.max(source.videoWidth / source.clientWidth, source.videoHeight / source.clientHeight);
                    sourceWidth = Math.floor(viewFinder.clientWidth * ratio / scaleFactor);
                    sourceHeight = Math.floor(viewFinder.clientHeight * ratio / scaleFactor);
                    sx = Math.floor((source.videoWidth - sourceWidth) / 2);
                    sy = Math.floor((source.videoHeight - sourceHeight) / 2);

                    if (sx < 0) {
                        sx = 0;
                        sourceWidth = source.videoWidth;
                    } else if (sy < 0) {
                        sy = 0;
                        sourceHeight = source.videoHeight;
                    }
                }
                preferredWidth = sourceWidth;
                preferredHeight = sourceHeight;
                if (preferredWidth > preferredHeight && preferredWidth > maxDimension) {
                    preferredHeight = Math.floor(maxDimension * preferredHeight / preferredWidth);
                    preferredWidth = maxDimension;
                } else if (preferredHeight > maxDimension) {
                    preferredWidth = Math.floor(maxDimension * preferredWidth / preferredHeight);
                    preferredHeight = maxDimension;
                }

                dataCanvas = window.document.createElement('canvas');
                dataCanvas.width = preferredWidth;
                dataCanvas.height = preferredHeight;
                dataCanvas.getContext('2d').drawImage(source, sx, sy, sourceWidth, sourceHeight,
                    0, 0, preferredWidth, preferredHeight);

                canvasToBlob(dataCanvas, resolve);
            } catch (e) {
                reject(e);
            }
        }

        function prepareFileBlob(source, exifOrientation, maxDimension, resolve, reject) {
            var preferredWidth, preferredHeight, dataCanvas, ctx;
            if (exifOrientation < 5) {
                preferredWidth = source.width;
                preferredHeight = source.height;
            } else { //has 90 deg rotation
                preferredWidth = source.height;
                preferredHeight = source.width;
            }
            try {
                if (preferredWidth > maxDimension) {
                    preferredHeight = Math.floor(maxDimension * preferredHeight / preferredWidth);
                    preferredWidth = maxDimension;
                }
                dataCanvas = window.document.createElement('canvas');
                dataCanvas.width = preferredWidth;
                dataCanvas.height = preferredHeight;
                ctx = dataCanvas.getContext('2d');
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

        function getExifOrientation(arrayBuffer) {
            var byteBuffer, seekPosition, fileLength, exifMetaFound, i, metaTagLength, littleEndian, endianType,
                ifdOffset, tagCount, entryPosition, tagValueType;
            byteBuffer = new DataView(arrayBuffer);
            if (byteBuffer.getUint16(0) !== 0xFFD8) {
                logger.logDebug('Not a JPEG');
                return 0;
            }
            seekPosition = 2;
            fileLength = byteBuffer.byteLength;
            exifMetaFound = false;
            while (seekPosition < fileLength) {
                metaTagLength = byteBuffer.getUint16(seekPosition + 2);
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
            for (i = 0; i < 4; i += 1) {
                if ('Exif'.charCodeAt(i) !== byteBuffer.getUint8(seekPosition + i)) {
                    logger.logWarn('Not valid Exif data');
                    return 0;
                }
            }
            seekPosition += 6;//skip Exif string and 0x0000
            endianType = byteBuffer.getUint16(seekPosition);
            if (endianType === 0x4949) {//II
                littleEndian = true;
            } else if (endianType === 0x4D4D) {//MM
                littleEndian = false;
            } else {
                logger.logWarn('Not valid TIFF data (Failed to detect endianness type) ' + endianType.toString(16));
                return 0;
            }
            //skip "42" header
            ifdOffset = byteBuffer.getUint32(seekPosition + 4, littleEndian);
            if (ifdOffset < 8) {
                logger.logWarn('Not valid TIFF data (IFD offset less then header ' + ifdOffset + ')');
                return 0;
            }
            seekPosition += ifdOffset;
            tagCount = byteBuffer.getUint16(seekPosition, littleEndian);
            logger.logDebug('tag count: ' + tagCount);
            seekPosition += 2;
            for (i = 0; i < tagCount; i += 1) {
                entryPosition = seekPosition + i * 12;
                if (byteBuffer.getUint16(entryPosition, littleEndian) === 0x0112) { //Orientation
                    logger.logDebug('orientation found');
                    tagValueType = byteBuffer.getUint16(entryPosition + 2, littleEndian);
                    if (tagValueType === 3) {//SHORT
                        logger.logDebug('orientation SHORT value found');
                        return byteBuffer.getUint16(entryPosition + 8, littleEndian);
                    }
                    if (tagValueType === 4) {//LONG
                        logger.logDebug('orientation LONG value found');
                        return byteBuffer.getUint32(entryPosition + 8, littleEndian);
                    }
                }
            }
            return 0;
        }

        return {
            "prepareStreamBlob": prepareStreamBlob,
            "prepareFileBlob": prepareFileBlob,
            "getExifOrientation": getExifOrientation
        };
    }

    function templateEngineFactory(templates) {
        function loadTemplate(templateCode, target, model) {
            var suffix = Date.now() + '_' + Math.round(10000000 * Math.random());
            if (model) {
                model.suffix = suffix;
            } else {
                model = {
                    suffix: suffix
                };
            }
            target.innerHTML = templates[templateCode].replace(/:{(\w+)}:/g, function(match, name) {
                return model[name];
            });
            return function elementAccessor(id) {
                return target.querySelector('#snapscreen' + suffix + id);
            };
        }

        return {
            "load": loadTemplate
        };
    }

    function DefaultNavigationBehavior(controller, snapComponent, templateEngine, options) {
        var modal, modalTemplate, vibrate, vibrateDelegate;

        function disposeController() {
            controller.dispose();
        }

        function close() {
            disposeController();
            document.body.removeChild(modal);
        }

        this.navigateToComponent = function () {
            modal.setAttribute('class', 'snapscreen-modal');
            if (controller.isActive()) {
                return;
            }
            if (typeof options.navigator !== 'undefined' &&
                typeof options.navigator.navigateToComponent === 'function') {
                options.navigator.navigateToComponent(controller);
            } else {
                document.body.appendChild(modal);
                controller.appendTo(modalTemplate('site'));
            }
        };

        this.navigateToResults = function (result) {
            disposeController();
            if (modal.parentNode === document.body) {
                document.body.removeChild(modal);
            }

            if (typeof options.navigator !== 'undefined' && typeof options.navigator.navigateToResults === 'function') {
                if (modal.parentNode === document.body) {
                    document.body.removeChild(modal);
                }
                options.navigator.navigateToResults(result);
            } else {
                var snapTimestamp, screenQuadrangle, resultEntry;
                if (result) {
                    snapTimestamp = result.snapTimestamp;
                    if (result.screenQuadrangles && result.screenQuadrangles.length > 0) {
                        screenQuadrangle = result.screenQuadrangles[0];
                    }
                }

                resultEntry = result.resultEntries[0];
                if (typeof options.navigator !== 'undefined' && typeof options.navigator.navigateToResult === 'function') {
                    options.navigator.navigateToResult(resultEntry, snapTimestamp, screenQuadrangle);
                } else if (typeof options.onResultEntry === 'function') {
                    options.onResultEntry(resultEntry, snapTimestamp, screenQuadrangle);
                }
            }
        };

        modal = document.createElement('div');
        modalTemplate = templateEngine.load('modal', modal);
        modalTemplate('close').addEventListener('click', close);
        vibrateDelegate = navigator.vibrate || navigator.webkitVibrate || navigator.mozVibrate;
        if (options.vibrate && typeof vibrateDelegate === 'function') {
            vibrate = function(duration) {
                return vibrateDelegate.call(navigator, duration);
            };
        } else {
            vibrate = function() {
                return false;
            };
        }
    }

    function AutoHideMessage(snapComponent) {
        var messageTimeout, messageElement, SHOW_MESSAGE_TIMEOUT = 10 * 1000;

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
        };
    }

    function FeedbackMessage(snapComponent) {
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
        };
    }

    function CameraUiBlocker(template) {
        this.block = function () {
            template('snap').setAttribute('disabled', 'disabled');
            var cameraSwitchButton = template('switch');
            if (cameraSwitchButton) {
                cameraSwitchButton.setAttribute('disabled', 'disabled');
            }
        };
        this.unblock = function () {
            template('snap').removeAttribute('disabled');
            var cameraSwitchButton = template('switch');
            if (cameraSwitchButton) {
                cameraSwitchButton.removeAttribute('disabled');
            }
        };
    }

    function FileUiBlocker(template) {
        var BLOCK_STYLE_NAME = 'file-processing';

        this.block = function () {
            template('file').setAttribute('disabled', 'disabled');
            var label = template('label'),
                cssClass = label.getAttribute('class');
            if (cssClass && cssClass.length > 0) {
                cssClass += ' ';
            }
            if (cssClass.indexOf(BLOCK_STYLE_NAME) === -1) {
                cssClass += BLOCK_STYLE_NAME;
                label.setAttribute('class', cssClass);
            }
        };

        this.unblock = function () {
            template('file').removeAttribute('disabled');
            var idx, to, from,
                label = template('label'),
                cssClass = label.getAttribute('class');
            if (cssClass) {
                idx = cssClass.indexOf(BLOCK_STYLE_NAME);
                if (idx > 0) {
                    from = idx;
                    to = idx + BLOCK_STYLE_NAME.length;
                    if (idx - 1 > 0 && cssClass.charAt(idx - 1) === ' ') {
                        from -= 1;
                    }
                    label.setAttribute('class', cssClass.substr(0, from) + cssClass.substr(to));
                }
            }
        };
    }

    function VideoDevicesManager() {
        var devices, selectedVideoDevice, getUserMedia, getDeviceConstraints, supportedConstraints,
            videoOptional = [{minWidth: 320}, {minWidth: 640}, {minWidth: 1024},
                {minWidth: 1280}, {minWidth: 1920}, {minWidth: 2560}],
            defaultConstraints = {audio: false, video: {optional: videoOptional}},
            defaultEnvironmentConstraints = {
                audio: false,
                video: {facingMode: { ideal: 'environment' }, width: {min: 320, ideal: 1920, max: 2560}}
            };

        function detect(resolve, reject) {
            if (typeof devices !== 'undefined') {
                if (devices === null || devices.length > 0) {
                    resolve(devices);
                } else {
                    reject('no video devices detected');
                }
            } else if (typeof MediaStreamTrack !== 'undefined' && typeof MediaStreamTrack.getSources === 'function') {
                MediaStreamTrack.getSources(function (sources) {
                    var i;
                    devices = [];
                    for (i = 0; i < sources.length; i += 1) {
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
                    var i, label, lcLabel, facing, prevFacing = '';
                    devices = [];
                    for (i = 0; i < mediaDevices.length; i += 1) {
                        if (mediaDevices[i].kind === 'videoinput') {
                            label = mediaDevices[i].label;
                            if (label === '') {
                                facing = (devices.length % 2 === 0) ? 'user' : 'environment';
                            } else {
                                lcLabel = label.toLocaleLowerCase();
                                if (label.endsWith('facing back') || label.endsWith('back camera') || prevFacing === 'user') {
                                    facing = 'environment';
                                } else {
                                    facing = 'user';
                                }
                            }
                            prevFacing = facing;
                            devices.push({
                                id: mediaDevices[i].deviceId,
                                label: label,
                                facing: facing,
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
            var constraints;
            if (device) {
                constraints = getDeviceConstraints(device);
            } else {
                constraints = defaultConstraints;
            }
            getUserMedia(constraints, function onDeviceStreamReady(stream) {
                selectedVideoDevice = device;
                resolve(stream);
            }, reject);
        }

        function findDeviceById(deviceId) {
            if (devices) {
                for (var i = 0; i < devices.length; i += 1) {
                    if (deviceId === devices[i].id) {
                        return devices[i];
                    }
                }
            }
            return undefined;
        }

        function openDefault(resolve, reject) {
            getUserMedia(defaultEnvironmentConstraints, function onDeviceStreamReady(stream) {
                var deviceId = null;
                function onVideoDevicesDetected() {
                    selectedVideoDevice = findDeviceById(deviceId);
                    resolve(stream);
                }

                if (typeof stream.getVideoTracks === 'function') {
                    var videoTracks = stream.getVideoTracks();
                    if (videoTracks && videoTracks.length > 0 && typeof videoTracks[0].getSettings === 'function') {
                        deviceId = videoTracks[0].getSettings().deviceId;
                    }
                }
                if (typeof devices !== 'undefined') {
                    onVideoDevicesDetected();
                } else {
                    detect(onVideoDevicesDetected, reject);
                }

            }, reject);
        }

        this.openPreferred = function (resolve, reject) {
            if (typeof getUserMedia !== 'function') {
                reject('getUserMedia is not supported');
            } else if (selectedVideoDevice) {
                open(selectedVideoDevice, resolve, reject);
            } else {
                detect(function onVideoDevicesDetected(detected) {
                    var device = null, i;
                    if (detected) {
                        if (detected.length === 1 && detected[0].id === '' && supportedConstraints.deviceId) {
                            // This is a fix for Safari new behaviour since version 13: now it returns a fake list of
                            // devices if it was requested before getUserMedia first call. A designator is that we get
                            // only one video device with empty id while deviceId feature is supported. In order to
                            // solve this problem we request environment faced video stream and after that we request
                            // a real list of devices.
                            devices = undefined;
                            openDefault(resolve, reject);
                            return;
                        }
                        for (i = 0; i < detected.length; i += 1) {
                            if (detected[i].facing === 'environment') {
                                device = detected[i];
                            }
                        }
                        if (!device) {
                            device = detected[detected.length - 1];
                        }
                    }
                    open(device, resolve, reject);
                }, reject);
            }
        };

        this.switchDevice = function (resolve, reject) {
            if (!devices || devices.length < 2 || !selectedVideoDevice) {
                reject('no video device to switch');
            }
            var index = devices.indexOf(selectedVideoDevice);
            if (index < 0) {
                reject('unknown selected video device video device');
            }
            index += 1;
            if (index >= devices.length) {
                index = 0;
            }
            open(devices[index], resolve, reject);
        };

        this.isSwitchSupported = function () {
            return devices && devices.length > 1;
        };

        this.isSupported = function () {
            return window.location.protocol === 'https:' && typeof getUserMedia === 'function';
        };

        // detect get user media function
        getUserMedia = null;
        if (typeof navigator.mediaDevices !== 'undefined' &&
            typeof navigator.mediaDevices.getUserMedia === 'function') {
            getUserMedia = function (constraints, result, reject) {
                navigator.mediaDevices.getUserMedia(constraints).then(result, reject);
            };
        } else {
            navigator.getUserMedia = navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia;
            if (typeof navigator.getUserMedia === 'function') {
                if (navigator.getUserMedia.length && navigator.getUserMedia.length === 3) {
                    getUserMedia = function (constraints, result, reject) {
                        navigator.getUserMedia(constraints, result, reject);
                    };
                } else {
                    getUserMedia = function (constraints, result, reject) {
                        navigator.getUserMedia(result, reject);
                    };
                }
            }
        }

        // detect constraint factory function
        getDeviceConstraints = function getDeviceConstraintsDefault(device) {
            return {
                audio: false,
                video: {mandatory: {sourceId: device.id}, optional: videoOptional}
            };
        };
        if (typeof navigator.mediaDevices !== 'undefined' &&
            typeof navigator.mediaDevices.getSupportedConstraints === 'function') {
            supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
            if (supportedConstraints.deviceId) {
                getDeviceConstraints = function getDeviceConstraintsWithDeviceId(device) {
                    return {
                        audio: false,
                        video: {deviceId: device.id, width: {min: 320, ideal: 1920, max: 2560}}
                    };
                };
            }
            var iOS = navigator.userAgent.match(/iPad/i) || navigator.userAgent.match(/iPhone/i);
            if (supportedConstraints.facingMode && (iOS || !supportedConstraints.deviceId)) {
                getDeviceConstraints = function getDeviceConstraintsWithFacingMode(device) {
                    return {
                        audio: false,
                        video: {facingMode: device.facing, width: {min: 320, ideal: 1920, max: 2560}}
                    };
                };
            }
        } else {
            supportedConstraints = {};
        }
    }

    function ZoomController(template) {
        var element, container, control, point, inputMethod, scaleFactor, scaleFactorChange, touchInitDistance,
            MAX_SCALE = 4;

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
            }
            element.removeAttribute('style');
            return 1;
        }

        function touchDistance(touch1, touch2) {
            return Math.sqrt((touch1.clientX - touch2.clientX) * (touch1.clientX - touch2.clientX) +
                (touch1.clientY - touch2.clientY) * (touch1.clientY - touch2.clientY));
        }

        function onSliderMoved(event) {
            var rect = control.getBoundingClientRect(), left;
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

        function onTouchStart(event) {
            if (inputMethod !== '' && inputMethod !== 'PINCH_ZOOM') {
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
                    var scale = changeScale(scaleFactor * scaleFactorChange),
                        left = ((scale - 1) / (MAX_SCALE - 1)) * (control.getBoundingClientRect().width - 20);
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

        element = template('video');
        container = element.parentNode;
        control = template('zoom');
        point = control.childNodes[0];
        inputMethod = '';
        scaleFactor = 1;
        scaleFactorChange = 1;
        touchInitDistance = 0;

        control.addEventListener('mousedown', onSliderMouseDown);
        control.addEventListener('touchstart', onSliderTouchStart);
        container.addEventListener('mousemove', onSliderMouseMove);
        container.addEventListener('mouseup', onSliderMouseUp);

        container.addEventListener('touchstart', onTouchStart);
        container.addEventListener('touchmove', onTouchMove);
        container.addEventListener('touchend', onTouchEnd);
    }

    function RangePickerController() {
        var container, maxPtr, maxOffset, maxValue, minPtr, minOffset, minValue, videoPosition, minDiff, maxDiff,
            barWidth, handleHalfWidth, offsetRange, valueRange, settings, events, listeners, changeListener;

        function offset(element, percent) {
            element.style.left = (percent * offsetRange / 100) + "px";
        }

        function halfWidth(element) {
            return element.offsetWidth / 2;
        }

        function width(element) {
            return element.offsetWidth;
        }

        function contain(value) {
            if (isNaN(value)) {
                return value;
            }
            return Math.min(Math.max(0, value), 100);
        }

        function roundStep(value) {
            var decimals, remainder, roundedValue, steppedValue;
            remainder = (value - settings.floor) % settings.step;
            steppedValue = remainder > (settings.step / 2) ? value + settings.step - remainder : value - remainder;
            decimals = Math.pow(10, settings.precision);
            roundedValue = steppedValue * decimals / decimals;
            return parseFloat(roundedValue.toFixed(settings.precision));
        }

        function percentOffset(offset) {
            return contain(((offset - minOffset) / offsetRange) * 100);
        }

        function percentValue(value) {
            return contain(((value - minValue) / valueRange) * 100);
        }

        function dimensions() {
            handleHalfWidth = halfWidth(minPtr);
            barWidth = width(container);
            minOffset = 0;
            maxOffset = barWidth - width(minPtr);
            minValue = settings.floor;
            maxValue = settings.ceiling;
            minDiff = settings.min;
            maxDiff = settings.max;
            valueRange = maxValue - minValue;
            offsetRange = maxOffset - minOffset;
        }

        function setPointers() {
            offset(minPtr, percentValue(settings.low));
            offset(maxPtr, percentValue(settings.high));
        }

        function updateDOM() {
            dimensions();
            setPointers();
        }

        function createHandlerListeners(handle, ref, events) {
            function onStart(event) {
                handle.classList.add('active');
                event.stopPropagation();
                event.preventDefault();
                document.addEventListener(events.move, onMove);
                document.addEventListener(events.end, onEnd);
            }

            function onMove(event) {
                var eventX, newOffset, newPercent, newValue, changed;
                eventX = event.clientX || (typeof event.touches !== 'undefined' ? event.touches[0].clientX : void 0) || (typeof event.originalEvent !== 'undefined' ? typeof event.originalEvent.changedTouches !== 'undefined' ? event.originalEvent.changedTouches[0].clientX : void 0 : void 0) || 0;
                newOffset = eventX - container.getBoundingClientRect().left - handleHalfWidth;
                newOffset = Math.max(Math.min(newOffset, maxOffset), minOffset);
                newPercent = percentOffset(newOffset);
                newValue = minValue + (valueRange * newPercent / 100.0);
                switch (ref) {
                    case 'low':
                        if (newValue + minDiff > settings.high) {
                            if (newValue + minDiff >= maxValue) {
                                return;
                            }
                            settings.high = newValue + minDiff;
                        } else if (newValue + maxDiff < settings.high) {
                            settings.high = newValue + maxDiff;
                        }
                        break;
                    case 'high':
                        if (settings.low > newValue - minDiff) {
                            if (newValue - minDiff < minValue) {
                                return;
                            }
                            settings.low = newValue - minDiff;
                        } else if (settings.low < newValue - maxDiff) {
                            settings.low = newValue - maxDiff;
                        }
                }
                newValue = roundStep(newValue);
                changed = settings[ref] !== newValue;
                settings[ref] = newValue;
                setPointers();
                if (changed && changeListener) {
                    changeListener(settings.low, settings.high, ref);
                }
            }

            function onEnd () {
                handle.classList.remove('active');
                document.removeEventListener(events.move, onMove);
                document.removeEventListener(events.end, onEnd);
            }

            return {
                bind: function() {
                    handle.addEventListener(events.start, onStart);
                },
                unbind: function() {
                    handle.removeEventListener(events.start, onStart);
                    handle.removeEventListener(events.move, onMove);
                    handle.removeEventListener(events.end, onEnd);

                    document.removeEventListener(events.move, onMove);
                    document.removeEventListener(events.end, onEnd);
                }
            };
        }

        function bindHandlerListeners() {
            listeners = [
                createHandlerListeners(minPtr, 'low', events.mouse),
                createHandlerListeners(minPtr, 'low', events.touch),
                createHandlerListeners(maxPtr, 'high', events.mouse),
                createHandlerListeners(maxPtr, 'high', events.touch)
            ];

            for (var i = 0; i < listeners.length; i++) {
                listeners[i].bind();
            }

            window.addEventListener('resize', updateDOM);
        }

        function unbindHandlerListeners() {
            if (listeners) {
                for (var i = 0; i < listeners.length; i++) {
                    listeners[i].unbind();
                }
            }

            window.removeEventListener('resize', updateDOM);
        }

        events = {
            mouse: {
                start: 'mousedown',
                move: 'mousemove',
                end: 'mouseup'
            },
            touch: {
                start: 'touchstart',
                move: 'touchmove',
                end: 'touchend'
            }
        };

        this.settings = function(values) {
            var floor = typeof values.floor === 'number' ? values.floor : 0;
            var ceiling = values.ceiling;
            settings = {
                "floor": floor,
                "ceiling": ceiling,
                "step": typeof values.step === 'number' ? values.step : 1,
                "precision": typeof values.precision === 'number' ? values.precision : 0,
                "low": values.low,
                "high": values.high,
                "min": typeof values.min === 'number' ? values.min : 0,
                "max": typeof values.max === 'number' ? values.max : ceiling - floor
            };
        };

        this.changeListener = function(value) {
            changeListener = value;
        };

        this.appendTo = function (element) {
            unbindHandlerListeners();

            container = element;
            minPtr = element.childNodes[0];
            maxPtr = element.childNodes[1];
            videoPosition = element.childNodes[2];
            videoPosition.style.display = 'none';
            bindHandlerListeners();
            setTimeout(updateDOM);
        };

        this.updateVideoPosition = function(position, duration) {
            var positionStart = minPtr.offsetLeft + width(minPtr);
            var positionEnd = maxPtr.offsetLeft - width(videoPosition);
            videoPosition.style.left = (positionStart + (position / duration) * (positionEnd - positionStart)).toFixed(3) + "px";
            videoPosition.style.display = 'block';
        };

        this.hideVideoPosition = function() {
            videoPosition.style.display = 'none';
        };

        this.dispose = function () {
            unbindHandlerListeners();
            container = minPtr = maxPtr = videoPosition = listeners = null;
        };
    }

    function SnapscreenSnapViewController(logger, snapService, blobService, analytics, options) {
        var self = this, active = false, snapTimestamp = 0, snapComponent,
            videoDevices, zoom, video, viewFrame, checkCameraTimeout, autoSnapTimeout, autoSnapStatus, currentStream,
            storage, blocked, errorMessage, feedbackMessage, uiNavigator, uiBlocker, templateEngine,
            SNAP_MAX_DIMENSION = 1024,
            AUTOSNAP_MAX_DIMENSION = 512,
            AUTOSNAP_DELAY_INITIAL = 1500,
            AUTOSNAP_DELAY = 1000,
            AUTOSNAP_STATUS_NONE = 'NONE',
            AUTOSNAP_STATUS_WAITING = 'WAITING',
            AUTOSNAP_STATUS_IN_PROGRESS = 'IN_PROGRESS',
            AUTOSNAP_STATUS_SNAP_REQUESTED = 'SNAP_REQUESTED';

        function SnapButton() {
            var snapButton, withoutInputFile = false;

            function snapButtonClick(e) {
                if (withoutInputFile || needToShowTutorial() || videoDevices.isSupported()) {
                    e.preventDefault();
                    uiNavigator.navigateToComponent(self);
                }
                if (!needToShowTutorial() && videoDevices.isSupported()) {
                    checkCamera(); // needed for browsers which supports access to camera via gesture only.
                }
            }

            function bindTo(button, file) {
                button.addEventListener('click', snapButtonClick);
                if (file) {
                    file.addEventListener('change', fileChanged);
                } else {
                    withoutInputFile = true;
                }

            }
            function init() {
                if (!snapButton) {
                    snapButton = document.createElement('div');
                    snapButton.setAttribute('class', options.cssClass);
                    var template = templateEngine.load('button', snapButton);
                    bindTo(template('label'), template('file'));
                }
            }

            this.bindTo = bindTo;

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

        function replaceBlocker(newBlocker) {
            if (blocked && newBlocker) {
                newBlocker.block();
            }
            uiBlocker = {
                block: function () {
                    blocked = true;
                    if (newBlocker) {
                        newBlocker.block();
                    }
                },
                unblock: function () {
                    blocked = false;
                    if (newBlocker) {
                        newBlocker.unblock();
                    }
                }
            };
        }

        function delegateEvent(event, data) {
            var handler = options[event];
            if (typeof handler === 'function') {
                handler.call(options, data);
            }
        }

        function onSearchResult(result) {
            uiBlocker.unblock();
            feedbackMessage.hide();
            result.snapTimestamp = snapTimestamp;
            if (result.resultEntries.length) {
                analytics.snapViewSnapResult(Date.now() - snapTimestamp);
                delegateEvent('onResult', result);
                uiNavigator.navigateToResults(result);
            } else {
                analytics.snapViewSnapNegative(Date.now() - snapTimestamp);
                errorMessage.show(options.messages.noResults);
                delegateEvent('onNoResult', result);
            }
        }

        function onSearchFailed(error) {
            analytics.snapViewSnapFailed(Date.now() - snapTimestamp);
            feedbackMessage.hide();
            uiBlocker.unblock();
            errorMessage.show(options.messages.failWithError);
            delegateEvent('onError', error);
        }

        function onSearchUploadProgress(event) {
            if (event.loaded === event.total) {
                feedbackMessage.show(options.messages.waitingResult);
            }
        }

        function onDataReady(blobMetadata) {
            analytics.snapViewSnap();
            snapTimestamp = Date.now();
            errorMessage.hide();
            feedbackMessage.show(options.messages.uploadingImage);
            if (options.searchAds) {
                blobMetadata.searchAds = true;
            }
            snapService.snap(blobMetadata, onSearchResult, onSearchFailed, onSearchUploadProgress);
        }

        function onDataError(error) {
            logger.logError('Failed to prepare image data to send.', error);
            uiBlocker.unblock();
            feedbackMessage.hide();
            errorMessage.show(options.messages.photoError);
            delegateEvent('onError', error);
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
                    blobService.prepareStreamBlob(video, video, zoom ? zoom.scaleFactor() : 1, SNAP_MAX_DIMENSION,
                        onDataReady, onDataError);
                }
            }
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

        function onAutoSnapResult(result) {
            uiBlocker.unblock();
            feedbackMessage.hide();
            result.snapTimestamp = snapTimestamp;
            if (result.resultEntries.length) {
                delegateEvent('onResult', result);
                uiNavigator.navigateToResults(result);
            } else {
                delegateEvent('onNoResult', result);
                scheduleNextAutoSnap();
            }
        }

        function onAutoSnapFailed(error) {
            delegateEvent('onError', error);
            scheduleNextAutoSnap();
        }

        function onAutoSnapDataReady(blobMetadata) {
            snapTimestamp = Date.now();
            if (options.searchAds) {
                blobMetadata.searchAds = true;
            }
            snapService.autoSnap(blobMetadata, onAutoSnapResult, onAutoSnapFailed);
        }

        function onAutoSnapDataError(error) {
            logger.logError('Failed to prepare image data for auto snap.', error);
            delegateEvent('onError', error);
            scheduleNextAutoSnap();
        }

        function autoSnap() {
            autoSnapTimeout = null;
            autoSnapStatus = AUTOSNAP_STATUS_IN_PROGRESS;
            if (currentStream && video) {
                blobService.prepareStreamBlob(video, viewFrame, zoom ? zoom.scaleFactor() : 1, AUTOSNAP_MAX_DIMENSION,
                    onAutoSnapDataReady, onAutoSnapDataError);
            }
        }

        function disposeStream() {
            if (currentStream) {
                if (typeof currentStream.getTracks === 'function') {
                    var tracks = currentStream.getTracks(), i;
                    for (i = 0; i < tracks.length; i += 1) {
                        tracks[i].stop();
                    }
                } else if (typeof currentStream.stop === 'function') {
                    currentStream.stop();
                }
                currentStream = null;

                if (video.src) {
                    window.URL.revokeObjectURL(video.src);
                    video.removeAttribute('src');
                    video.load();
                }
                video = null;
                viewFrame = null;

                if (autoSnapTimeout) {
                    clearTimeout(autoSnapTimeout);
                    autoSnapTimeout = null;
                }

                zoom.dispose();
                zoom = null;
            }
        }

        function isImageValid(img) {
            if ('naturalHeight' in img) {
                return img.naturalHeight > 0 && img.naturalWidth > 0;
            }
            return img.width > 0 && img.height > 0;
        }

        function fileChanged(event) {
            var exifOrientation = 0, img, fileReader, file;
            if (event.target.files.length > 0) {
                uiNavigator.navigateToComponent(self);
                uiBlocker.block();
                img = new Image();
                img.onerror = onDataError;
                img.onload = function () {
                    if (isImageValid(img)) {
                        blobService.prepareFileBlob(img, exifOrientation, SNAP_MAX_DIMENSION, onDataReady, onDataError);
                    } else {
                        onDataError();
                    }
                    window.URL.revokeObjectURL(img.src);
                };
                fileReader = new FileReader();
                file = event.target.files[0];
                fileReader.onload = function (e) {
                    logger.logDebug('Got file of length ' + e.target.result.byteLength);
                    exifOrientation = blobService.getExifOrientation(e.target.result);
                    img.src = window.URL.createObjectURL(file);
                };
                fileReader.onerror = onDataError;
                fileReader.readAsArrayBuffer(file);
            }
        }

        function switchFileMode() {
            disposeStream();
            var template = templateEngine.load('file', snapComponent);
            template('file').addEventListener('change', fileChanged);
            replaceBlocker(new FileUiBlocker(template));
        }

        function stopEventPropagation(event) {
            event.stopPropagation();
        }

        function onStreamReady(stream) {
            if (checkCameraTimeout) {
                clearTimeout(checkCameraTimeout);
                checkCameraTimeout = null;
            }

            var template = templateEngine.load('camera', snapComponent);
            var snapButton = template('snap');
            snapButton.addEventListener('click', snap);
            snapButton.addEventListener('mousemove', stopEventPropagation);
            snapButton.addEventListener('touchstart', stopEventPropagation);

            var switchCameraButton = template('switch');
            if (videoDevices.isSwitchSupported()) {
                switchCameraButton.addEventListener('click', switchCamera);
                switchCameraButton.addEventListener('mousemove', stopEventPropagation);
                switchCameraButton.addEventListener('touchstart', stopEventPropagation);
            } else {
                switchCameraButton.parentNode.removeChild(switchCameraButton);
            }

            replaceBlocker(new CameraUiBlocker(template));

            currentStream = stream;
            video = template('video');
            if (typeof video.srcObject !== 'undefined') {
                video.srcObject = stream;
            } else if (typeof video.mozSrcObject !== 'undefined') {
                video.mozSrcObject = stream;
            } else {
                video.src = window.URL.createObjectURL(stream);
            }

            zoom = new ZoomController(template);
            viewFrame = template('frame');

            if (options.autoSnap && typeof snapService.autoSnap === 'function') {
                autoSnapTimeout = setTimeout(autoSnap, AUTOSNAP_DELAY_INITIAL);
                autoSnapStatus = AUTOSNAP_STATUS_WAITING;
            } else {
                autoSnapTimeout = null;
                autoSnapStatus = AUTOSNAP_STATUS_NONE;
            }

            logger.logDebug('User stream obtained');
        }

        function onStreamBlocked(reason) {
            if (checkCameraTimeout) {
                clearTimeout(checkCameraTimeout);
                checkCameraTimeout = null;
            }
            logger.logInfo('Camera blocked with reason ' + reason);
            switchFileMode();
        }

        function checkCamera() {
            if (checkCameraTimeout) {
                return;
            }
            templateEngine.load('waiting', snapComponent);
            checkCameraTimeout = setTimeout(onStreamBlocked, 20000);
            videoDevices.openPreferred(onStreamReady, onStreamBlocked);
        }

        function switchCamera() {
            if (currentStream) {
                disposeStream();
            }
            videoDevices.switchDevice(onStreamReady, onStreamBlocked);
        }

        function needToShowTutorial() {
            return !options.withoutTutorial && !storage.snapscreenTvSearchVisited;
        }

        function showShortTutorial() {
            var tutorial, tutorialTemplate;

            function close() {
                snapComponent.removeChild(tutorial);
            }

            function onTutorialFileChanged(event) {
                close();
                fileChanged(event);
            }

            function onTutorialSnapClick(event) {
                storage.snapscreenTvSearchVisited = true;
                if (videoDevices.isSupported()) {
                    event.preventDefault();
                    close();
                    checkCamera();
                }
            }

            tutorial = document.createElement('div');
            tutorialTemplate = templateEngine.load('tutorial', tutorial);
            tutorialTemplate('file').addEventListener('change', onTutorialFileChanged);
            tutorialTemplate('label').addEventListener('click', onTutorialSnapClick);
            snapComponent.appendChild(tutorial);
        }

        function prepareView() {
            if (needToShowTutorial()) {
                switchFileMode();
                showShortTutorial();
            } else if (videoDevices.isSupported()) {
                checkCamera();
            } else {
                switchFileMode();
            }
        }

        this.isActive = function () {
            return active;
        };
        this.appendTo = function (target) {
            analytics.snapViewOpened();
            active = true;
            (target.append || target.appendChild).call(target, snapComponent);
            prepareView();
        };
        this.dispose = function () {
            if (active) {
                analytics.snapViewClosed();
                active = false;
            }
            if (snapComponent.parentNode) {
                snapComponent.parentNode.removeChild(snapComponent);
                snapComponent.innerHTML = '';
            }

            if (checkCameraTimeout) {
                clearTimeout(checkCameraTimeout);
                checkCameraTimeout = null;
            }

            disposeStream();
        };
        this.createSnapButton = function () {
            return new SnapButton();
        };

        options = extend({
            "vibrate": false,
            "searchAds": false,
            "autoSnap": false,
            "withoutTutorial": false,
            "cssClass": 'snapscreen',
            "noEntryImage": '/images/header-gradient.png'
        }, options);
        options.messages = extend({
            photoError: 'Some error happens while preparing photo to send. Please retry searching with different image.',
            failWithError: 'Some error happens while searching a TV. Please retry searching with different image.',
            noResults: 'We’re sorry, your Snap returned no results - either the channel you are watching is not supported or a TV screen could not be detected.',
            uploadingImage: 'Uploading image...',
            waitingResult: 'Getting results...'
        }, options.messages);
        options.templates = extend({
            "camera": '<div class="tv-search-camera"><video id="snapscreen:{suffix}:video" width="100%" height="100%" autoplay muted playsInline></video>' +
                '<div id="snapscreen:{suffix}:frame" class="tv-search-frame"></div>' +
                '<div id="snapscreen:{suffix}:zoom" class="zoom-slider"><i class="zoom-pointer"></i><hr/></div>' +
                '<button id="snapscreen:{suffix}:snap" class="tv-search-button"><i class="icon-camera icon"></i></button>' +
                '<button id="snapscreen:{suffix}:switch" class="switch-camera-button"><i class="icon-refresh icon"></i></button>' +
                '</div>',
            "file": '<div class="tv-search-file"><input id="snapscreen:{suffix}:file" class="tv-search-input" type="file" accept="image/*;capture=camera"/>' +
                '<label id="snapscreen:{suffix}:label" class="tv-search-label" for="snapscreen:{suffix}:file">' +
                '<div><i class="icon-camera icon"></i><span>Click to access your camera!</span></div></label></div>' +
                '<div class="tv-search-fallback-message">Please allow camera access to make Snapping work.</div>',
            "button": '<input id="snapscreen:{suffix}:file" class="tv-search-input" type="file" accept="image/*;capture=camera"/>' +
                '<label id="snapscreen:{suffix}:label" class="tv-search-button" for="snapscreen:{suffix}:file">' +
                '<i class="icon-camera icon"></i>' +
                '</label>',
            "modal": '<div id="snapscreen:{suffix}:site">' +
                '<a id="snapscreen:{suffix}:close" class="close"></a>' +
                '</div>',
            "results": '<div class="snapscreen-modal-header">Please choose the best matching result</div>' +
                '<div class="collection with-header" id="snapscreen:{suffix}:collection"></div>',
            "tutorial": '<div class="dialog dialog--open">' +
                '<div class="dialog__overlay"></div>' +
                '<div class="dialog__content">' +
                '<input id="snapscreen:{suffix}:file" class="tv-search-input" type="file" accept="image/*;capture=camera"/>' +
                '<label id="snapscreen:{suffix}:label" for="snapscreen:{suffix}:file" class="tutorial-label">' +
                '<div class="tutorial-content">' +
                '<h3 class="tutorial-title">Zoom and focus on your TV-screen.</h3>' +
                '<div class="tutorial-picto"><img src="/images/tutorial.png" alt=""/></div>' +
                '<button class="button button-cta" data-dialog-close="">Get started</button>' +
                '</div>' +
                '</label>' +
                '</div>' +
                '</div>',
            "waiting": '<div class="tv-search-feedback">Getting access to the camera...</div>'
        }, options.templates);

        snapComponent = document.createElement('div');
        snapComponent.setAttribute('class', options.cssClass);
        templateEngine = templateEngineFactory(options.templates);

        zoom = null;
        blocked = false;
        autoSnapStatus = AUTOSNAP_STATUS_NONE;

        videoDevices = new VideoDevicesManager();
        errorMessage = options.snapErrorMessage || new AutoHideMessage(snapComponent);
        feedbackMessage = new FeedbackMessage(snapComponent);
        uiNavigator = new DefaultNavigationBehavior(this, snapComponent, templateEngine, options);
        storage = (typeof Storage !== 'undefined') ? localStorage : {snapscreenTvSearchVisited: true};

        replaceBlocker();
        analytics.sdkInitialized();
    }

    var logger = loggerFactory(),
        accessTokenHolder = accessTokenHolderFactory(logger),
        snapscreenApi = snapscreenApiFactory(logger, accessTokenHolder),
        snapService = snapServiceFactory(logger, snapscreenApi),
        blobService = blobServiceFactory(logger),
        analytics = analyticsFactory();

    /**
     * Snapscreen SDK module.
     *
     * @module SnapscreenKit
     */
    scope.SnapscreenKit = {
        "http": http,
        "api": snapscreenApi,
        "loggingHandler": logger.handler,
        "accessTokenHolder": accessTokenHolder,
        "sportSnapViewController": function createSnapscreenSportSnapViewController(options) {
            return new SnapscreenSnapViewController(logger, snapService.sport, blobService, analytics, extend({
                    "cssClass": 'snapscreen snpbet',
                    "noEntryImage": '/images/bet/header-gradient.png'
                }, options));
        }
    };
}(window));
