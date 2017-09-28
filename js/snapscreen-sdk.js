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

    function extend(target, options) {
        var name;
        for (name in options) {
            if (options.hasOwnProperty(name) && typeof !target.hasOwnProperty(name)) {
                target[name] = options[name];
            }
        }
        return target;
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

    function snapscreenFactory(logger, accessTokenHolder) {
        var timeLag, baseUrl, countryCode, localeIdentifier;

        function currentTimestamp() {
            return Date.now() - timeLag;
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

        function api(request, resolve, reject, onUploadProgress) {
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

        timeLag = 0;
        baseUrl = '${BASE_URL}';
        if (baseUrl.startsWith('${BASE_URL')) {
            baseUrl = 'https://api.snapscreen.com';
        }

        return {
            "http": http,
            "api": api,
            "currentTimestamp": currentTimestamp,
            "countryCode": setAndGetCountryCode,
            "localeIdentifier": setAndGetLocaleIdentifier
        };
    }

    function webSearchServiceFactory(snapscreen) {
        function normalizeWebSearchResult(resolve, itemMapper) {
            return function (response) {
                var resultData = [], i, resultList;
                if (response.data.hasOwnProperty('_embedded')) {
                    resultList = response.data._embedded.webSearchResultList;
                    for (i = 0; i < resultList.length; i += 1) {
                        resultData.push(itemMapper(resultList[i]));
                    }
                }
                resolve({"content": resultData, "pageInfo": response.data.page});
            };
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
            if (snapscreen.countryCode()) {
                request.countryCode = snapscreen.countryCode();
            }
            return request;
        }

        function buildWebSearchRequestWithCreditName(tvChannelCode, timestampRef, creditName, pageNumber, pageSize) {
            var request = buildWebSearchRequest(tvChannelCode, timestampRef, pageNumber, pageSize);
            request.creditName = creditName;
            return request;
        }

        function internalApiWebSearch(resourceType, itemMapper, request, resolve, reject) {
            return snapscreen.api({
                url: '/api/web-search/' + resourceType,
                method: 'GET',
                params: request
            }, normalizeWebSearchResult(resolve, itemMapper), reject);
        }

        function buildApiWebSearch(resourceType, itemMapper) {
            return function (tvChannelCode, timestampRef, pageNumber, pageSize, resolve, reject) {
                var request = buildWebSearchRequest(tvChannelCode, timestampRef, pageNumber, pageSize);
                return internalApiWebSearch(resourceType, itemMapper, request, resolve, reject);
            };
        }

        function buildApiWebSearchByCreditName(resourceType, itemMapper) {
            return function (tvChannelCode, timestampRef, creditName, pageNumber, pageSize, resolve, reject) {
                var request = buildWebSearchRequestWithCreditName(tvChannelCode, timestampRef, creditName, pageNumber,
                    pageSize);
                return internalApiWebSearch(resourceType, itemMapper, request, resolve, reject);
            };
        }

        return {
            "searchSites": buildApiWebSearch('web', mapWebSearchItem),
            "searchImages": buildApiWebSearch('image', mapWebSearchImageItem),
            "searchVideos": buildApiWebSearch('video', mapWebSearchVideoItem),
            "searchSitesByCreditName": buildApiWebSearchByCreditName('web', mapWebSearchItem),
            "searchImagesByCreditName": buildApiWebSearchByCreditName('image', mapWebSearchImageItem),
            "searchVideosByCreditName": buildApiWebSearchByCreditName('video', mapWebSearchVideoItem)
        };
    }

    function snapServiceFactory(logger, snapscreen) {
        function snapHttpHeaders(request) {
            var headers = {
                "Content-type": 'application/octet-stream',
                "X-Snapscreen-MimeType": request.mimeType,
                "X-Snapscreen-Width": request.width,
                "X-Snapscreen-Height": request.height
            };
            if (snapscreen.countryCode()) {
                headers['X-Snapscreen-CountryCode'] = snapscreen.countryCode();
            }
            if (request.searchAds) {
                headers['X-Snapscreen-SearchAds'] = 'true';
            }
            return headers;
        }

        function autoSnapHttpHeaders(request) {
            var headers = snapHttpHeaders(request);
            headers['X-Snapscreen-Timestamp'] = snapscreen.currentTimestamp();
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
            snapscreen.api({
                "method": 'POST',
                "url": uri,
                "headers": headers(request),
                "data": request.blob
            }, onSearchResult(resolve, reject), onSearchFailed(reject), onUploadProgress);
        }

        function storeFeedback(result, resultEntry) {
            var feedback = {
                "requestUuid": result.requestUuid
            };
            if (resultEntry && resultEntry.tvChannel) {
                feedback.selectedResultEntry = {
                    "tvChannelCode": resultEntry.tvChannel.code,
                    "timestampRef": resultEntry.timestampRef,
                    "score": resultEntry.score

                };
            } else if (resultEntry && resultEntry.advertisement) {
                feedback.selectedAdEntry = {
                    "advertisementId": resultEntry.advertisement.id,
                    "timeOffset": resultEntry.timeOffset,
                    "score": resultEntry.score
                };
            }
            snapscreen.api({
                "method": 'POST',
                "url": '/api/tv-search/store-feedback',
                "headers": {'content-type': 'application/json'},
                "data": JSON.stringify(feedback)
            }, function(response) {
                logger.logDebug('Feedback stored successfully', response);
            }, function(response) {
                logger.logDebug('Error during storing feedback', response);
            });
        }

        return {
            "epg": {
                "snap": function snapEpg(request, resolve, reject, onUploadProgress) {
                    snap('/api/tv-search/epg/by-image', request, snapHttpHeaders, resolve, reject, onUploadProgress);
                },
                "autoSnap": function autoSnapEpg(request, resolve, reject, onUploadProgress) {
                    snap('/api/tv-search/epg/near-timestamp/by-image', request, autoSnapHttpHeaders,
                        resolve, reject, onUploadProgress);
                },
                "storeFeedback": storeFeedback
            },
            "ads": {
                "snap": function snapEpg(request, resolve, reject, onUploadProgress) {
                    snap('/api/ads/search/by-image', request, snapHttpHeaders, resolve, reject, onUploadProgress);
                },
                "storeFeedback": storeFeedback
            },
            "sport": {
                "snap": function snapEpg(request, resolve, reject, onUploadProgress) {
                    snap('/api/tv-search/sport/by-image', request, snapHttpHeaders, resolve, reject, onUploadProgress);
                },
                "autoSnap": function autoSnapEpg(request, resolve, reject, onUploadProgress) {
                    snap('/api/tv-search/sport/near-timestamp/by-image', request, autoSnapHttpHeaders,
                        resolve, reject, onUploadProgress);
                },
                "storeFeedback": storeFeedback
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
        function loadTemplate(templateCode, target) {
            var suffix = Date.now() + '_' + Math.round(10000000 * Math.random());
            target.innerHTML = templates[templateCode].split(':{suffix}:').join(suffix);
            return function elementAccessor(id) {
                return target.querySelector('#snapscreen' + suffix + id);
            };
        }

        return {
            "load": loadTemplate
        };
    }

    function httpBlobCacheFactory() {
        var MAX_BLOBS_COUNT = 20;

        var MAX_LIFE_TIME = 10000; //10 sec

        var cache = {};

        var cacheList = [];

        function truncateCacheIfNeeded() {
            if (cacheList.length > MAX_BLOBS_COUNT) {
                var buffer = [];
                var currentTs = Date.now();
                for (var i = 0; i < cacheList.length; i++) {
                    var cacheItem = cacheList[i];
                    if (currentTs - cacheItem.timestamp > MAX_LIFE_TIME) {
                        window.URL.revokeObjectURL(cacheItem.url);
                        delete cache[cacheItem.key];
                    } else {
                        buffer.push(cacheItem);
                    }
                }
                cacheList = buffer;
            }
        }

        return {
            "computeIfAbsent": function (key, suppler, resolve, reject) {
                var cacheItem = cache[key];
                if (cacheItem) {
                    cacheItem.timestamp = Date.now();
                    resolve(cacheItem.url);
                } else {
                    suppler(function (blobResponse) {
                        var blobUrl = window.URL.createObjectURL(
                            new Blob([blobResponse.data], {type: blobResponse.headers('content-type')}));
                        cacheItem = {
                            url: blobUrl,
                            key: key,
                            timestamp: Date.now()
                        };
                        cache[key] = cacheItem;
                        cacheList.push(cacheItem);
                        truncateCacheIfNeeded();
                        resolve(blobUrl);
                    }, reject);
                }
            }
        };
    }

    function tvChannelServiceFactory(snapscreen, httpBlobCache) {
        return {
            "resolveLiveImage": function (tvChannel, resolve, reject) {
                var liveImage = tvChannel._links.liveImage;
                if (liveImage) {
                    if (liveImage.secured) {
                        var imgUrl = liveImage.href;
                        httpBlobCache.computeIfAbsent(imgUrl, function (cacheResolve, cacheReject) {
                            return snapscreen.api({
                                method: 'GET',
                                absolute: true,
                                url: imgUrl,
                                responseType: 'arraybuffer'
                            }, cacheResolve, cacheReject);
                        }, resolve, reject);
                    } else {
                        resolve(liveImage.href);
                    }
                } else if (tvChannel._links && tvChannel._links.poster) {
                    resolve(tvChannel._links.poster.href);
                } else {
                    reject({status: 404});
                }
            }
        };
    }

    function tsImageServiceFactory(snapscreen, httpBlobCache) {
        return {
            "downloadAtTimestamp": function (tvChannelId, timestampRef, resolve, reject) {
                var uri = '/api/ts-images/' + tvChannelId + '/' + timestampRef + '/download';
                httpBlobCache.computeIfAbsent(uri, function (cacheResolve, cacheReject) {
                    return snapscreen.api({
                        method: 'GET',
                        url: uri,
                        responseType: 'arraybuffer'
                    }, cacheResolve, cacheReject);
                }, resolve, reject);
            }
        };
    }

    function adImageServiceFactory(snapscreen, httpBlobCache) {
        return {
            "downloadAtTimeOffset": function (advertisementId, timeOffset, resolve, reject) {
                var uri = '/api/ads/images/' + advertisementId + '/' + timeOffset + '/download';
                httpBlobCache.computeIfAbsent(uri, function (cacheResolve, cacheReject) {
                    return snapscreen.api({
                        method: 'GET',
                        url: uri,
                        responseType: 'arraybuffer'
                    }, cacheResolve, cacheReject);
                }, resolve, reject);
            }
        };
    }

    function sportEventServiceFactory() {
        return {
            "toString": function (sportEvent) {
                if (!sportEvent) {
                    return '';
                }
                if (sportEvent.competitors) {
                    var result = '', i;
                    for (i = 0; i < sportEvent.competitors.length; i+= 1) {
                        if (result.length > 0) {
                            result += ' vs ';
                        }
                        result += sportEvent.competitors[i].name;
                    }
                    return result;
                }
                return sportEvent.sport + ' - ' + sportEvent.category + ' - ' + sportEvent.tournament;
            }
        };
    }

    function SnapscreenSearchResults(snapComponent, uiNavigator, sportEventService, templateEngine,
                                     tvChannelService, tsImageService, adImageService) {
        function numberToString(number) {
            return number < 10 ? '0' + number.toString() : number.toString();
        }

        function formatDate(date) {
            var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
                'October', 'November', 'December'];

            return monthNames[date.getMonth()] + ' ' + date.getDate() + ', ' +
                numberToString(date.getHours()) + ':' + numberToString(date.getMinutes());
        }

        function showEntryImage(figure, resultEntry) {
            function setEntryImage(url) {
                figure.setAttribute('class', 'img-container');

                var image = document.createElement('IMG');
                image.setAttribute('class', 'list teaser');
                image.setAttribute('src', url);
                figure.appendChild(image);

                resultEntry.imageUrl = url;
            }

            function setNoEntryImage() {
                setEntryImage('/images/header-gradient.png');
            }

            function showTvChannelLiveImage() {
                tvChannelService.resolveLiveImage(resultEntry.tvChannel, setEntryImage, setNoEntryImage);
            }

            if (resultEntry.advertisement) {
                adImageService.downloadAtTimeOffset(resultEntry.advertisement.id, resultEntry.timeOffset,
                    setEntryImage, setNoEntryImage);
            } else {
                tsImageService.downloadAtTimestamp(resultEntry.tvChannel.id, resultEntry.timestampRef,
                    setEntryImage, showTvChannelLiveImage);
            }
        }

        function renderSearchResultEntry(resultEntry, parent) {
            var container, element, image;

            container = document.createElement('A');
            container.setAttribute('class', 'collection-item media right with-margin');
            container.setAttribute('href', '#');
            container.addEventListener('click', function(event) {
                event.preventDefault();
                uiNavigator.navigateToResult(resultEntry);
            });

            element = document.createElement('FIGURE');
            element.setAttribute('class', 'img-container preloader');
            container.appendChild(element);
            showEntryImage(element, resultEntry);

            if (resultEntry.tvChannel && resultEntry.tvChannel._links && resultEntry.tvChannel._links.logo) {
                element = document.createElement('DIV');
                element.setAttribute('class', 'channel-logo');

                image = document.createElement('IMG');
                image.setAttribute('src', resultEntry.tvChannel._links.logo.href);
                image.setAttribute('alt', resultEntry.tvChannel.name);

                element.appendChild(image);
                container.appendChild(element);
            }

            element = document.createElement('DIV');
            element.setAttribute('class', 'title');
            if (resultEntry.epgUnit) {
                element.innerText = resultEntry.epgUnit.title;
            } else if (resultEntry.sportEvent) {
                element.innerText = sportEventService.toString(resultEntry.sportEvent);
            } else if (resultEntry.advertisement) {
                element.innerText = resultEntry.advertisement.title;
            } else {
                element.innerText = resultEntry.tvChannel.name;
            }
            container.appendChild(element);

            if (resultEntry.advertisement) {
                element = document.createElement('P');
                element.setAttribute('class', 'small');
                element.innerText = resultEntry.advertisement.description;
                container.appendChild(element);
                container.setAttribute('class', 'collection-item media right with-margin advertisement');
            } else {
                element = document.createElement('DIV');
                element.setAttribute('class', 'meta schedule');
                element.innerText = formatDate(new Date(resultEntry.timestampRef));
                container.appendChild(element);
            }

            parent.appendChild(container);
        }

        this.showResults = function (target, results) {
            var template, collection, i;

            if (snapComponent.parentNode === null) {
                target.appendChild(snapComponent);
            }
            template = templateEngine.load('results', snapComponent);
            collection = template('collection');
            for (i = 0; i < results.resultEntries.length; i++) {
                renderSearchResultEntry(results.resultEntries[i], collection);
            }
        };
    }

    function DefaultNavigationBehavior(controller, snapComponent, snapService, templateEngine, options) {
        var modal, modalTemplate, vibrate, vibrateDelegate, storedResult;

        function close() {
            controller.dispose();
            document.body.removeChild(modal);
        }

        this.navigateToComponent = function () {
            if (storedResult) {
                snapService.storeFeedback(storedResult);
                storedResult = null;
            }
            modal.setAttribute('class', 'snapscreen-modal');
            if (controller.isActive()) {
                return;
            }
            if (snapComponent.parentNode) {
                controller.appendTo(snapComponent.parentNode);
            } else if (typeof options.navigator !== 'undefined' &&
                typeof options.navigator.navigateToComponent === 'function') {
                options.navigator.navigateToComponent(controller);
            } else {
                document.body.appendChild(modal);
                controller.appendTo(modalTemplate('site'));
            }
        };

        this.navigateToResults = function (result) {
            storedResult = result;
            var parent = snapComponent.parentNode;
            controller.dispose();
            if (typeof options.navigator !== 'undefined' && typeof options.navigator.navigateToResults === 'function') {
                if (modal.parentNode === document.body) {
                    document.body.removeChild(modal);
                }
                options.navigator.navigateToResults(result);
            } else {
                modal.setAttribute('class', 'snapscreen-modal snapscreen-results');
                controller.showResults(parent, result);
                vibrate(150);
            }
        };

        this.navigateToResult = function (resultEntry) {
            var snapTimestamp, screenQuadrangle;
            controller.dispose();
            if (modal.parentNode === document.body) {
                document.body.removeChild(modal);
            }
            if (storedResult) {
                snapTimestamp = storedResult.snapTimestamp;
                if (storedResult.screenQuadrangles && storedResult.screenQuadrangles.length > 0) {
                    screenQuadrangle = storedResult.screenQuadrangles[0];
                }
                snapService.storeFeedback(storedResult, resultEntry);
                storedResult = null;
            }
            if (typeof options.navigator !== 'undefined' && typeof options.navigator.navigateToResult === 'function') {
                options.navigator.navigateToResult(resultEntry, snapTimestamp, screenQuadrangle);
            } else if (typeof options.onResultEntry === 'function') {
                options.onResultEntry(resultEntry, snapTimestamp, screenQuadrangle);
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
        var devices, current, getUserMedia, delegate,
            defaultCameraConstraints = {
                audio: false,
                video: {
                    optional: [
                        {minWidth: 320}, {minWidth: 640}, {minWidth: 1024},
                        {minWidth: 1280}, {minWidth: 1920}, {minWidth: 2560}
                    ]
                }
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
                    var i;
                    devices = [];
                    for (i = 0; i < mediaDevices.length; i += 1) {
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
                    audio: false,
                    video: extend({mandatory: {sourceId: device.id}}, defaultCameraConstraints.video)
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
                    var device = null, i;
                    if (devices) {
                        for (i = 0; i < devices.length; i += 1) {
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

        this.switchDevice = function (resolve, reject) {
            if (!devices || devices.length < 2 || !current) {
                reject('no video device to switch');
            }
            var index = devices.indexOf(current);
            if (index < 0) {
                reject('unknown current video device');
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

        // detect get user media fuction
        getUserMedia = null;
        if (typeof navigator.mediaDevices !== 'undefined' &&
            typeof navigator.mediaDevices.getUserMedia === 'function') {
            getUserMedia = function (constraints, result, reject) {
                navigator.mediaDevices.getUserMedia(constraints).then(result, reject);
            };
        } else {
            delegate = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
            if (typeof delegate === 'function') {
                if (delegate.length && delegate.length === 3) {
                    getUserMedia = function (constraints, result, reject) {
                        delegate.call(navigator, constraints, result, reject);
                    };
                } else {
                    getUserMedia = function (constraints, result, reject) {
                        delegate.call(navigator, result, reject);
                    };
                }
            }
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

    function SnapscreenSnapViewController(logger, snapService, blobService, sportEventService, templateEngine,
                                          tvChannelService, tsImageService, adImageService, options) {
        var self = this, active = false, snapTimestamp = 0, snapComponent, searchResults, resultsSnapButton,
            videoDevices, zoom, video, viewFrame, checkCameraTimeout, autoSnapTimeout, autoSnapStatus, currentStream,
            storage, blocked, errorMessage, feedbackMessage, uiNavigator, uiBlocker,
            SNAP_MAX_DIMENSION = 1024,
            AUTOSNAP_MAX_DIMENSION = 512,
            AUTOSNAP_DELAY_INITIAL = 3000,
            AUTOSNAP_DELAY = 2000,
            AUTOSNAP_STATUS_NONE = 'NONE',
            AUTOSNAP_STATUS_WAITING = 'WAITING',
            AUTOSNAP_STATUS_IN_PROGRESS = 'IN_PROGRESS',
            AUTOSNAP_STATUS_SNAP_REQUESTED = 'SNAP_REQUESTED';

        function SnapButton() {
            var snapButton;

            function snapButtonClick(e) {
                if (needToShowTutorial() || videoDevices.isSupported()) {
                    e.preventDefault();
                    uiNavigator.navigateToComponent(self);
                }
                if (!needToShowTutorial() && videoDevices.isSupported()) {
                    checkCamera(); // needed for browsers which supports access to camera via gesture only.
                }
            }

            function init() {
                if (!snapButton) {
                    snapButton = document.createElement('div');
                    snapButton.setAttribute('class', 'snapscreen');
                    var snapButtonTemplate = templateEngine.load('button', snapButton);
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
                delegateEvent('onResult', result);
                uiNavigator.navigateToResults(result);
            } else {
                errorMessage.show(self.messages.noResults);
                delegateEvent('onNoResult', result);
            }
        }

        function onSearchFailed(error) {
            uiBlocker.unblock();
            feedbackMessage.hide();
            errorMessage.show(self.messages.failWithError);
            delegateEvent('onError', error);
        }

        function onSearchUploadProgress(event) {
            if (event.loaded === event.total) {
                feedbackMessage.show(self.messages.waitingResult);
            }
        }

        function onDataReady(blobMetadata) {
            snapTimestamp = Date.now();
            errorMessage.hide();
            feedbackMessage.show(self.messages.uploadingImage);
            if (options.searchAds) {
                blobMetadata.searchAds = true;
            }
            snapService.snap(blobMetadata, onSearchResult, onSearchFailed, onSearchUploadProgress);
        }

        function onDataError(error) {
            logger.logError('Failed to prepare image data to send.', error);
            uiBlocker.unblock();
            feedbackMessage.hide();
            errorMessage.show(self.messages.photoError);
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
                if (currentStream.getTracks && typeof currentStream.getTracks === 'function') {
                    var tracks = currentStream.getTracks(), i;
                    for (i = 0; i < tracks.length; i += 1) {
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

        function onStreamReady(stream) {
            if (checkCameraTimeout) {
                clearTimeout(checkCameraTimeout);
                checkCameraTimeout = null;
            }

            var template = templateEngine.load('camera', snapComponent);
            template('snap').addEventListener('click', snap);
            var switchCameraButton = template('switch');
            if (videoDevices.isSwitchSupported()) {
                switchCameraButton.addEventListener('click', switchCamera);
            } else {
                switchCameraButton.parentNode.removeChild(switchCameraButton);
            }

            replaceBlocker(new CameraUiBlocker(template));

            currentStream = stream;
            video = template('video');
            video.src = window.URL.createObjectURL(stream);

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
            } else {
                checkCamera();
            }
        }

        this.isActive = function () {
            return active;
        };
        this.appendTo = function (target) {
            active = true;
            (target.append || target.appendChild).call(target, snapComponent);
            prepareView();
        };
        this.dispose = function () {
            active = false;
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
        this.showResults = function(target, results) {
            searchResults.showResults(target, results);
            resultsSnapButton.appendTo(snapComponent);
        };

        this.messages = {
            photoError: 'Some error happens while preparing photo to send. Please retry searching with different image.',
            failWithError: 'Some error happens while searching a TV. Please retry searching with different image.',
            noResults: 'We’re sorry, your Snap returned no results - either the channel you are watching is not supported or a TV screen could not be detected.',
            uploadingImage: 'Uploading image...',
            waitingResult: 'Getting results...'
        };

        snapComponent = document.createElement('div');
        snapComponent.setAttribute('class', 'snapscreen');

        options = options || {};

        zoom = null;
        blocked = false;
        autoSnapStatus = AUTOSNAP_STATUS_NONE;

        videoDevices = new VideoDevicesManager();
        errorMessage = new AutoHideMessage(snapComponent);
        feedbackMessage = new FeedbackMessage(snapComponent);
        uiNavigator = new DefaultNavigationBehavior(this, snapComponent, snapService, templateEngine, options);
        searchResults = new SnapscreenSearchResults(snapComponent, uiNavigator, sportEventService, templateEngine,
            tvChannelService, tsImageService, adImageService);
        resultsSnapButton = new SnapButton();
        storage = (typeof Storage !== 'undefined') ? localStorage : {snapscreenTvSearchVisited: true};

        replaceBlocker();
    }

    var logger = loggerFactory(),
        accessTokenHolder = accessTokenHolderFactory(logger),
        snapscreen = snapscreenFactory(logger, accessTokenHolder),
        webSearchService = webSearchServiceFactory(snapscreen),
        snapService = snapServiceFactory(logger, snapscreen),
        blobService = blobServiceFactory(logger),
        httpBlobCache = httpBlobCacheFactory(),
        tvChannelService = tvChannelServiceFactory(snapscreen, httpBlobCache),
        sportEventService = sportEventServiceFactory(),
        tsImageService = tsImageServiceFactory(snapscreen, httpBlobCache),
        adImageService = adImageServiceFactory(snapscreen, httpBlobCache),
        templateEngine = templateEngineFactory({
            "camera": '<div class="tv-search-camera"><video id="snapscreen:{suffix}:video" width="100%" height="100%" autoplay></video>' +
            '<div id="snapscreen:{suffix}:frame" class="tv-search-frame"></div>' +
            '<div id="snapscreen:{suffix}:zoom" class="zoom-slider"><i class="zoom-pointer"></i><hr/></div>' +
            '<button id="snapscreen:{suffix}:snap" class="tv-search-button"><i class="icon-camera icon"></i></button>' +
            '<button id="snapscreen:{suffix}:switch" class="switch-camera-button"><i class="icon-refresh icon"></i></button>' +
            '</div>',
            "file": '<div class="tv-search-file"><input id="snapscreen:{suffix}:file" class="tv-search-input" type="file" accept="image/*;capture=camera"/>' +
            '<label id="snapscreen:{suffix}:label" class="tv-search-label" for="snapscreen:{suffix}:file">' +
            '<div><i class="icon-camera icon"></i><span>Click to access your camera!</span></div></label></div>',
            "button": '<input id="snapscreen:{suffix}:file" class="tv-search-input" type="file" accept="image/*;capture=camera"/>' +
            '<label id="snapscreen:{suffix}:label" class="tv-search-button" for="snapscreen:{suffix}:file">' +
            '<i class="icon-camera icon"></i>' +
            '</label>',
            "modal": '<div id="snapscreen:{suffix}:site">' +
            '<a id="snapscreen:{suffix}:close" class="close"></a>' +
            '</div>',
            "results": '<div class="collection with-header" id="snapscreen:{suffix}:collection">' +
            '<div class="collection-header">Please choose the best matching result</div></div>',
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
        });

    /**
     * Snapscreen SDK module.
     *
     * @module SnapscreenKit
     */
    scope.SnapscreenKit = {
        "http": snapscreen.http,
        "api": snapscreen.api,
        "loggingHandler": logger.handler,
        "accessTokenHolder": accessTokenHolder,
        "countryCode": snapscreen.countryCode,
        "localeIdentifier": snapscreen.localeIdentifier,
        "currentSnapscreenTimestamp": snapscreen.currentTimestamp,
        "tvSnapViewController": function createSnapscreenTvSnapViewController(options) {
            return new SnapscreenSnapViewController(logger, snapService.epg, blobService, sportEventService,
                templateEngine, tvChannelService, tsImageService, adImageService, options);
        },
        "sportSnapViewController": function createSnapscreenAdsSnapViewController(options) {
            return new SnapscreenSnapViewController(logger, snapService.sport, blobService, sportEventService,
                templateEngine, tvChannelService, tsImageService, adImageService, options);
        },
        "adsSnapViewController": function createSnapscreenSportSnapViewController(options) {
            return new SnapscreenSnapViewController(logger, snapService.ads, blobService, sportEventService,
                templateEngine, tvChannelService, tsImageService, adImageService, options);
        },
        "webSearchService": webSearchService,
        "tvChannelService": tvChannelService,
        "sportEventService": sportEventService
    };
}(window));