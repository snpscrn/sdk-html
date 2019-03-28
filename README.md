# Snapscreen SDK

### Support

In case of any questions or problems please contact us at [support@snapscreen.com](mailto:support@snapscreen.com).

### Basic setup

The first step of integration Snapscreen SDK into your site is to include provided CSS and JavaScript files 
on your HTML page, like this:
```html
<link href="css/snapscreen-sdk.css" type="text/css" rel="stylesheet">
<script href="js/snapscreen-sdk.js" type="text/javascript"></script>
```

And we expect that customers will host these files on there servers together with provided images and fonts. 
Please change paths if it is required.

#### Access token management

Snapscreen SDK requires Access token to communicate with Snapscreen API which uses 
OAuth 2.0 authentication mechanism. Customers will be provided with Client ID and Secret which it should use 
to receive access token. Here is an example of HTTP request using curl to receive access token:
```bash
curl -u "YourClientId:YourClientSecret" -d "grant_type=anonymous"  https://api.snapscreen.com/api/oauth/token
```

It is not secure to have this mechanism to be implemented on JavaScript side, because in this case it will be 
ease enough to steal your customer credentials. That why we suggest to implement this logic in customer server side. 
It is required to implement REST API resource which will receive token from Snapscreen API, store it in session 
and return back to user. Lets assume that we do have such resource and it has path '/accesstoken'. 
For better security we also recommends to use [CSRF token](https://www.owasp.org/index.php/Cross-Site_Request_Forgery_(CSRF)_Prevention_Cheat_Sheet#Synchronizer_.28CSRF.29_Tokens) technique.

#### SDK initialization

Once we are ready with access token management resource we can implement access token SDK initialization. 
For this we need to request access token from your server and set it into SDK like this:
```javascript
SnapscreenKit.http({
    url: 'https://yoursite.com/accesstoken',
    responseType: 'json'
}, function onResult(response) {
    if (response.satus < 400) {
        SnapscreenKit.accessTokenHolder.accessToken(response.data);
    } else {
       // log an error
    }
}, function(errorDetails) {
    // log the error 
})
```

### TV search setup

The first step in initialization of TV search is to create corresponding controller and specify callback functions 
to which results will be provided with timestamp when snap was made:
```javascript
var tvSnapController = SnapscreenKit.tvSnapViewController({
    onResultEntry: function (resultEntry, snapTimestamp, screenQuadrangle) {
        //TODO: handle snap results here.
    }
});
```

Now it is required to place a snap button somewhere on you HTML page which will trigger snapping process. Lets assume 
that you have an element on your page with id "main" then you can use the following code to add button to this element:
```javascript
tvSnapController.createSnapButton().appendTo(document.getElementById('main'));
```

Results of TV search will be provided in the following format:
```javascript
{
  tvChannel: {
    id: number (long),
    code: string,
    name: string,
    homepage: string (url),
    _links: {
      self: {
        href: string (url)
      },
      logo: {
        href: string (url)
      }
    }
  },
  timestampRef: number (long),
  score: number (double)
}
```

### Sport event search setup

Process of initialization of SDK for sport event search is the same as for TV search, but you need to call
a different function:
```javascript
var sportSnapController = SnapscreenKit.sportSnapViewController({
    onResultEntry: function (resultEntry, snapTimestamp, screenQuadrangle) {
        //TODO: handle snap results here.
    }
});
sportSnapController.createSnapButton().appendTo(document.getElementById('main'));
```

Results of sport event search will be provided in the following format:
```javascript
{
  tvChannel: {
    id: number, // long
    code: string,
    name: string,
    homepage: string, // URL
    _links: {
      self: {
        href: string // URL
      },
      logo: {
        href: string // URL
      },
      poster: {
        href: string // URL
      }
    }
  },
  sportEvent: {
    id: number, // long
    sportDataProviderCode: string,
    sportDataProviderMatchId: string,
    tvChannelId: number, // long
    startTime: string, // iso date-time: yyyy-MM-dd'T'HH:mm:ss.SSSZZ
    endTime: string, // iso date-time: yyyy-MM-dd'T'HH:mm:ss.SSSZZ
    sport: string,
    tournament: string,
    category: string,
    competitors: [
      {
         name: string
      }
    ],
    _links: {
      self: {
        href: string // URL
      }
    }
  },
  timestampRef: number (long),
  score: number (double)
}
```

### Advertisements search setup

Process of initialization of SDK for advertisement search is the same as for TV search, but you need to call
a different function:
```javascript
var snapController = SnapscreenKit.adsSnapViewController({
    onResultEntry: function (resultEntry, snapTimestamp, screenQuadrangle) {
        //TODO: handle snap results here.
    }
});
snapController.createSnapButton().appendTo(document.getElementById('main'));
```

Results of advertisement search will be provided in the following format:
```javascript
{
  advertisement: {
    id: number (long),
    title: string,
    description: string,
    landingPageUrl: string,
    duration: number (long)
  },
  timestampRef: number (long),
  score: number (double)
}
```

# Clip Share SDK

Clip Share SDK provides an AngularJS module with Clip Share functionality.

### Basic setup

The first step of the integration of Clip Share SDK is to integrate Snapscreen SDK as it Clip Share SDK only adds
the functionality of Clip Sharing while still relying on the basic functionality of Snapscreen SDK. Please find
more information about it above. But you need change the API URL to clip.farm instead of api.snapscreen.com
on line 307 of snapscreen-sdk.js:
```javascript
baseUrl = 'https://clip.farm';
```

Clip Share SDK uses [Swiper JS library](https://idangero.us/swiper/) to provide gallery behavior. The second step is
to include CSS and JS files, related to Swiper JS library on your HTML page:
```html
<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/Swiper/4.0.7/css/swiper.min.css">
<script src="//cdnjs.cloudflare.com/ajax/libs/Swiper/4.0.7/js/swiper.min.js"></script>
```

[JW Player](https://www.jwplayer.com) is used for Clip preview functionality. It is required to buy a license for
JW Player on their site and then you need to include provided configured player JS file on your HTML page like this:
```html
<script type="text/javascript" src="https://cdn.jwplayer.com/libraries/YOUR_LICENSE.js"></script>
```

Clip Share SDK provides an AngularJS module and as a result, we need to include AngularJS JavaScript on your HTML page.
You can use a self-hosted version of AngularJS or CDN-hosted like this:
```html
<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.5.8/angular.min.js"></script>
```

And of course you need to include provided CSS and JavaScript files related to Clip Farm SDK on your HTML page,
like this:
```html
<script href="js/snapscreen-ng-sdk.js" type="text/javascript"></script>
<script href="js/clip-share-sdk.js" type="text/javascript"></script>
```

The final step of basic integration is to activate AngularJS application somewhere on your HTML page, like this:
```html
<div id="clipShareApp" ng-app="clipShareSdk" ng-controller="ClipShareController">
    <clip-share result-entry="resultEntry" ng-if="resultEntry" on-clip-shared="clipShared(clip)"></clip-share>
</div>
```

### Integration with Snapscreen SDK

The functionality of Clip Share SDK is to give a user the possibility to share the clip. But before sharing a clip
user needs to snap to find a moment he is looking for. Snapscreen SDK is responsible for snapping functionality and after
snap you need to provide received resultEntry in onResultEntry callback to Clip Share SDK using the following code:
```javascript
var clipShareAppElement = document.getElementById('clipShareApp');
var $scope = angular.element(clipShareAppElement).scope();
$scope.$apply(function() {
    $scope.resultEntry = resultEntry;
});
```

### Clip Share result

After resultEntry is provided to Clip Share SDK it will navigate the user through the clip-sharing process. To receive
information about shared clip you need to subscribe for the corresponding event:
```javascript
var clipShareAppElement = document.getElementById('clipShareApp');
var $scope = angular.element(clipShareAppElement).scope();
$scope.$on('clipShared', function (event, clip) {
    // Your handling logic here
});
```

Metadata about the shared clip is provided to parameter clip and has the following structure:
```javascript
{
  tvChannelId; number (long),
  timestampRefFrom; number (long),
  timestampRefTo; number (long),
  timestampRefThumb; number (long),
  _links: {
      player: {
          href: string (url)
      },
      thumbnail: {
          href: string (url)
      }
  }
}
```
 