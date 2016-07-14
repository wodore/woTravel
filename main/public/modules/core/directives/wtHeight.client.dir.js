(function() {
    'use strict';
    var module = angular.module('core');

    /**
     * @name wtHeight
     * @memberOf angularModule.core
     * @description
     * It sets a height of an element
     */
    module.directive('wtHeight', function($log,$window) {
        /*jslint unparam:true*/
        var prelink = function(scope, el, attrs, form) {
            //jscs:disable requireCamelCaseOrUpperCaseIdentifiers
        var w = angular.element($window);
        var offset; 
        var calcOffset = function(){
            offset = parseInt(scope.wtHeight); 
            if (scope.wtHeight.substring(0, 1) == "#") {
                $log.info("[change height] check id: "+scope.wtHeight);
                var idEl = angular.element( document.querySelector( scope.wtHeight ) );
                offset = parseInt(idEl[0].offsetHeight);
            }
            if (! (offset > 0)){
                offset = 0
            }
        }

        var changeHeight = function () {
            calcOffset();
            var winHeight = parseInt($window.innerHeight);
            var height = winHeight - offset; 
            el.css('height', height + 'px');
            $log.debug("[change height] to: "+height+"px");
        };
        w.bind('resize', function () {
            changeHeight();
        });
        scope.$watch('wtHeight', function(newValue, oldValue) {
            changeHeight();
        });
        // run it the first time
        changeHeight();
        };

        return {
            link     : {
                pre : prelink
            },
            restrict : 'A',
            scope    : {
                wtHeight: "@",
            }
        };
    });

}());
