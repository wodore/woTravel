(function() {
    'use strict';
    var module = angular.module('map');

    /**
     * @name m // gives accesss to all map functionsapFn
     * @memberOf angularModule.map
     * @description
     * Function which help to do stuff on the map
     */

    module.service('mapFn', function(Restangular,$log) {

        var self = this;

        var map = {'main':{}};

        this.getMap = function(name){
            return _.get(map,name,{});
        }

        this.setMap = function(name,setMap){
            //$log.debug("[mapFn:setMap] map:")
            return _.set(map,name,setMap);
        }

        // fits markers on a map
        this.fitMarkers = function(markers,map) {
            //$log.debug("[fitMarkers] markers:")
            var bounds = L.latLngBounds(markers);
            map.fitBounds(bounds);
            return bounds
        }

        // center of markers
        this.center = function(markers,map) {
            //$log.debug("[fitMarkers] markers:")
            var bounds = L.latLngBounds(markers);
            return bounds.getCenter();
        }

        this.nameFromMarker = function(marker) {
            var name = Math.abs(marker.lat)+"_"+Math.abs(marker.lng)
            name = _.replace(name,".","p");
            name = _.replace(name,".","p");
            $log.info("Maker name: "+name);
            return name
        }




    /// END
    });

}());

