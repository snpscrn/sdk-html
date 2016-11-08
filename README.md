# sdk-html

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
curl -u 'YourClientId:YourClientSecret' -d 'grant_type=anonymous'  https://api-dev.snapscreen.com/api/oauth/token
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
    url: 'https://yoursite.com/accesstoken' 
}, function onResult(response) {
    if (response.satus == 200) {
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
to which results will be provided:
```javascript
var tvSnapController = SnapscreenKit.tvSnapViewController(null, {
    onResult: function (result) {
        //TODO: handle snap results here.
    }
});
```
Now it is required to place a snap button somewhere on you HTML page which will trigger snapping process. Lets assume 
that you have an element on your page with id "main" then you can use the following code to add button to this element:
```javascript
tvSnapController.createButton().appendTo(document.getElementById('main'));
```
Results of TV search will be provided in the following format:
```javascript
 {
   requestUuid: string (UUID),
   resultEntries: [
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
       timestampRef: number (long)
       score: number (double),
     },
   ]
 }
```

### Advertisements search setup
Process of initialization of SDK for advertisement search is the same as for TV search, but you need to call
a different function:
```javascript
var snapController = SnapscreenKit.adsSnapViewController(null, {
    onResult: function (result) {
        //TODO: handle snap results here.
    }
});
snapController.createButton().appendTo(divElement);
```
Results of TV search will be provided in the following format:
```javascript
 {
   requestUuid: string (UUID),
   resultEntries: [
     {
       advertisement: {
         id: number (long),
         title: string,
         description: string,
         landingPageUrl: string,
         duration: number (long)
       },
       timestampRef: number (long)
       score: number (double),
     }
   ]
 }
```