(function() {
    'use strict';

    var module = angular.module('core');
    module.config(function($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise('/');

        $stateProvider
            .state('home', {
                url         : '/',
                views    : {
                    '' : {
                controller  : 'HomeController',
                templateUrl : '/p/modules/core/home/home.client.view.html'
                    } ,
                    'sideLeft' : {
                templateUrl : '/p/modules/core/layout/sidenav.client.view.html'
                    }
                }
            })
            .state('feedback', {
                url         : '/feedback',
                controller  : 'FeedbackController',
                templateUrl : '/p/modules/core/feedback/feedback.client.view.html'
            });
    });
}());
