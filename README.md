# Snapscreen SDK

Table of Contents
=================
* [Support.](#support)
* [Basic setup.](#basic-setup)
  * [Access token management.](#access-token-management)
  * [SDK initialization.](#sdk-initialization)
* [TV search setup.](#tv-search-setup)
* [Sport event search setup.](#sport-event-search-setup)
* [Advertisements search setup.](#advertisements-search-setup)
* [Clip Share.](#clip-share)
  * [Clip Share dependencies.](#clip-share-dependencies)
  * [Clip Share setup.](#clip-share-setup)

### Support

In case of any questions or problems please contact us at [support@snapscreen.com](mailto:support@snapscreen.com).

### Basic setup

The first step of integration of the Snapscreen SDK into your site is to include provided CSS and JavaScript
files your HTML page, like this:
```html
<link href="css/snapscreen-sdk.css" type="text/css" rel="stylesheet">
<script href="js/snapscreen-sdk.js" type="text/javascript"></script>
```

We expect that customers will host these files on their servers together with provided images and fonts.
Please change paths in CSS and JS files if it is required.

#### Access token management

Snapscreen SDK requires an access token to communicate with Snapscreen API which uses OAuth 2.0 authentication
mechanism. Customers will be provided with Client ID and Secret which it should use to receive the access token.
Here is an example of the HTTP request using curl to receive access token:
```bash
curl -u "YourClientId:YourClientSecret" -d "grant_type=anonymous"  https://api.snapscreen.com/api/oauth/token
```

It is not secure to have this mechanism to be implemented in JavaScript, because in this case it will be
easy enough to steal your customer credentials. That why we suggest implementing this logic on your server-side.
It is required to implement REST API resource which will receive the access token from Snapscreen API, store it in
HTTP session and return back to the user. Let's assume that we do have such resource and it has path '/accesstoken'. 
For better security, we also recommend using [CSRF token](https://www.owasp.org/index.php/Cross-Site_Request_Forgery_(CSRF)_Prevention_Cheat_Sheet#Synchronizer_.28CSRF.29_Tokens) technique.

#### SDK initialization

Once we are ready with access token management resource we are ready to initialize Snapscreen SDK.
For this we need to request the access token from your server and set it into SDK like this:
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
Snapscreen provides three types of search/snap:
* [TV search](#tv-search-setup). Snapscreen will search in the TV channel indexes associated with the customer and
then resolve EPG units for each found result.
* [Sports event search](#sport-event-search-setup). Snapscreen will search in the TV channel indexes associated
with the customer and then resolve Sports events for each found result. If no Sports event found for search
result entry then this entry will be removed from response.
* [Advertisement search](#advertisements-search-setup). Snapscreen will search in the special static index
with advertisements. Customer can request some advertisement to be added to the index.

Snapscreen SDK provides a separate controller for each type of search. Information on how to setup each of them you
can find below.

### TV search setup

The first step in the initialization of TV search is to create the corresponding controller and specify the callback
function to which results will be provided with timestamp when the snap was made:
```javascript
var tvSnapController = SnapscreenKit.tvSnapViewController({
    onResultEntry: function (resultEntry, snapTimestamp, screenQuadrangle) {
        //TODO: handle snap results here.
    }
});
```

``resultEntry`` has the following format:
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

Now it is required to place a snap button somewhere on you HTML page which will trigger the snapping process.
Let's assume that you have an element on your page with id "main" then you can use the following code to add
the snap button to this element:
```javascript
tvSnapController.createSnapButton().appendTo(document.getElementById('main'));
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

``resultEntry`` in this case has the following format:
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

``resultEntry`` in this case has the following format:
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

### Clip Share

Snapscreen SDK provides a component that allows end users to create and share video clips. This article will describe
how to setup it and use.

#### Clip Share dependencies

Clip share component of the Snapscreen SDK have several dependencies that are listed bellow.

[Swiper JS library](https://idangero.us/swiper/) is used to provide gallery behavior. It is required to
include CSS and JS files, related to Swiper JS library on your HTML page:
```html
<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/Swiper/4.0.7/css/swiper.min.css">
<script src="//cdnjs.cloudflare.com/ajax/libs/Swiper/4.0.7/js/swiper.min.js"></script>
```

[JW Player](https://www.jwplayer.com) is used for Clip preview functionality. You will need to buy a license for
JW Player on their site and then you need to include provided configured player JS file on your HTML page like this:
```html
<script type="text/javascript" src="https://cdn.jwplayer.com/libraries/YOUR_LICENSE.js"></script>
```

#### Clip Share setup

The first step is to create one of the snap view controllers described above, but now you also need to provide a
callback function to which created clip will be provided. In the code snippet below I will show how to do this
for the TV search controller, but the same is possible with other controllers too. The only difference is
the name of the function.
```javascript
var tvSnapController = SnapscreenKit.tvSnapViewController({
    onResultEntry: function (resultEntry) {
        // Your handling logic here
    },
    onClipCreated: function(createdClip) {
        // Your handling logic here
    }
});
```

Snap view controllers provide a function ``showClipShare`` that will open the clip sharing component in the modal window.
This function accepts only one argument ``resultEntry`` that was provided in ``onResultEntry`` callback. You can put
the call to ``showClipShare`` inside onResultEntry callback function like this:
```javascript
var tvSnapController = SnapscreenKit.tvSnapViewController({
    onResultEntry: function (resultEntry) {
        tvSnapController.showClipShare(resultEntry);
    },
    onClipCreated: function(createdClip) {
        // Your handling logic here
    }
});
```

``createdClip`` has the following format:
```javascript
{
  id: string,
  tvChannelId: number (long),
  timestampRefFrom: number (long),
  timestampRefTo: number (long),
  timestampRefThumb: number (long),
  _links: {
      player: {
          href: string (url)
      },
      thumbnail: {
          href: string (url)
      },
      video: {
          href: string (url)
      }
  }
}
```
 
 After receiving created clip you have two options:
 * Use the HTML player provided by Snapscreen. In this case, you need to take the link to the HTML player page from
``createdClip._links.player.href`` and initialize sharing process of this link.
 * Another possibility is to develop your own HTML player page (it is required to use a player that can play HLS
 videos). In this case, you need to store somewhere id of the created clip and use this id to get the link to
 the video using [this API](https://github.com/snpscrn/api-http#clips) when a user requested corresponding page.
   