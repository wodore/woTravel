(function() {
    'use strict';
    var module = angular.module('core');

    /**
     * @name wtIcon
     * @memberOf angularModule.core
     * @description
     * This directive is used to geter with md-icon to add a font icon,
     * It is possible later to change this to svg.
     */
    module.directive('wtIcon', function($log) {
        /*jslint unparam:true*/
        var prelink = function(scope, el, attrs, form) {
            //jscs:disable requireCamelCaseOrUpperCaseIdentifiers
            attrs.$addClass("mdi");
            attrs.$addClass("mdi-"+scope.wtIcon);
            var size = 24;
            attrs.$set("style","font-size: "+size+"px; height: "+size+"px;"+scope.style);
            scope.$watch('wtIcon', function(newValue, oldValue) {
                attrs.$addClass("mdi-"+newValue);
                if (newValue !== oldValue){
                    attrs.$removeClass("mdi-"+oldValue);
                }
                });
        };

        return {
            link     : {
                pre : prelink
            },
            restrict : 'A',
            scope    : {
                wtIcon: "@",
                style : "@"
            }
        };
    });

}());
