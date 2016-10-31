# sdk-html

### Basic setup
To use the SDK you should include into you HTML page CSS an JavaScript files:
```html
<link href="css/snapscreen-sdk.css" type="text/css" rel="stylesheet">
<script href="js/snapscreen-sdk.js" type="text/javascript"></script>
```
Then you should setup access token for the SDK. How to obtain an access token please take a look here.
```javascript
SnapscreenKit.accessTokenHolder.accessToken(accessToken);
```
Now you are able to configure the Snap component.
```javascript
var snapComponent = SnapscreenKit.snapViewController({
    onTvSearchResult: function (result) {
        //TODO: handle snap results here.
    }
});
snapComponent.appendTo(divElement);
```
The delegate object is needed to handle TV search results from the component.
When you finish snapping process you have to call dispose method of the component to release the camera.
```javascript
snapComponent.dispose();
```