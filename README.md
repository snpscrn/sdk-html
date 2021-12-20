# Snapscreen SDK

Table of Contents
=================
* [Support.](#support)
* [Basic setup.](#basic-setup)
  * [Access token management.](#access-token-management)
  * [SDK initialization.](#sdk-initialization)
* [Sport event search setup.](#sport-event-search-setup)

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
