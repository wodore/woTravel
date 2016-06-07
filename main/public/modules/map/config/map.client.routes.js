(function() {
    'use strict';

    var module = angular.module('core');
    module.config(function($stateProvider) {
        $stateProvider
            .state('map', {
                url      : '/map',
                views    : {
                    '' : {
                        controller  : 'mapController',
                        templateUrl : '/p/modules/map/layout/map.client.view.html'
                    },
                    'side' : {
                        controller  : 'mapController',
                        templateUrl : '/p/modules/map/layout/sidenav.map.view.html'
                    }
                }
            })
            //.state('map.view', {
                //url         : '',
                //templateUrl : '/p/modules/map/layout/sidenav.map.view.html'
            //})
            
            
            ;
    });
}());
