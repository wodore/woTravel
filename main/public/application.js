/**
 * @namespace angularModule
 */

// Init the application configuration module for AngularJS application
var AppConfig = (function() {
    'use strict';
    // Init module configuration options
    var applicationModuleName = 'woTravel';
    var applicationModuleVendorDependencies = [
        'ngAnimate',
        'ngMessages',
        'restangular',
        'ui.router',
        'noCAPTCHA',
        'ngMaterial',
        'angulartics',
        'angulartics.google.analytics',
        'angularMoment',
        'ngFileUpload',
        'ui-leaflet',
        'iso-3166-country-codes',
        'ngFlag'
    ];

    // Add a new vertical module
    var registerModule = function(moduleName, dependencies) {
        // Create angular module
        angular.module(moduleName, dependencies || []);

        // Add the module to the AngularJS configuration file
        angular.module(applicationModuleName).requires.push(moduleName);
    };

    return {
        applicationModuleName               : applicationModuleName,
        applicationModuleVendorDependencies : applicationModuleVendorDependencies,
        registerModule                      : registerModule
    };
}());

//Start by defining the main module and adding the module dependencies
angular.module(AppConfig.applicationModuleName, AppConfig.applicationModuleVendorDependencies);

var mdiIconsURL = "http://cdn.rawgit.com/nkoterba/material-design-iconsets/master/iconsets/mdi-icons.svg";

// Setting HTML5 Location Mode
angular.module(AppConfig.applicationModuleName).config([
    '$locationProvider',
    function($locationProvider) {
        'use strict';
        $locationProvider.hashPrefix('!');
    }
]).config(function($sceDelegateProvider) {
  $sceDelegateProvider.resourceUrlWhitelist([
    // Allow same origin resource loads.
    'self',
    // Allow loading from our assets domain.  Notice the difference between * and **.
    //'http://srv*.assets.example.com/**',
    mdiIconsURL
  ])})

.config(['$mdIconProvider', function($mdIconProvider) {
        'use strict';

        // see: https://design.google.com/icons/
        // mdi.svg is downloaded from:
        // https://materialdesignicons.com/getting-started
        // Update is done manually!
        //$mdIconProvider.defaultIconSet('/p/core/icons/mdi-icons.svg');
        $mdIconProvider.defaultIconSet(mdiIconsURL)

        //$mdIconProvider.defaultIconSet('/p/core/icons/mdi.svg');
                .iconSet('action', '/p/core/icons/action-icons.svg', 24)
                .iconSet('alert', '/p/core/icons/alert-icons.svg', 24)
                .iconSet('av', '/p/core/icons/av-icons.svg', 24)
                .iconSet('communication', '/p/core/icons/communication-icons.svg', 24)
                .iconSet('content', '/p/core/icons/content-icons.svg', 24)
                .iconSet('device', '/p/core/icons/device-icons.svg', 24)
                .iconSet('editor', '/p/core/icons/editor-icons.svg', 24)
                .iconSet('file', '/p/core/icons/file-icons.svg', 24)
                .iconSet('hardware', '/p/core/icons/hardware-icons.svg', 24)
                .iconSet('icons', '/p/core/icons/icons-icons.svg', 24)
                .iconSet('image', '/p/core/icons/image-icons.svg', 24)
                .iconSet('maps', '/p/core/icons/maps-icons.svg', 24)
                .iconSet('navigation', '/p/core/icons/navigation-icons.svg', 24)
                .iconSet('notification', '/p/core/icons/notification-icons.svg', 24)
                .iconSet('social', '/p/core/icons/social-icons.svg', 24)
                .iconSet('toggle', '/p/core/icons/toggle-icons.svg', 24);

        //
    }
]).config(['$logProvider', function($logProvider){
    $logProvider.debugEnabled(true);
}]).config(['$httpProvider', function($httpProvider) {
        //$httpProvider.defaults.useXDomain = true;
        //delete $httpProvider.defaults.headers.common['X-Requested-With'];
}]).config(function( $mdGestureProvider ) { // fix for mobile
   // https://github.com/angular/material/issues/1300
          $mdGestureProvider.skipClickHijack();
      });


//Then define the init function for starting up the application
angular.element(document).ready(function() {
    'use strict';
    //Fixing facebook bug with redirect
    if (window.location.hash === '#_=_') {
        window.location.hash = '#!';
    }

    //Then init the app
    angular.bootstrap(document, [AppConfig.applicationModuleName]);
});
