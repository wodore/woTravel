(function() {
    'use strict';
    var module = angular.module('map');

    /**
     * @name wdTiles
     * @memberOf angularModule.map
     * @description
     * Serves map tiles
     */

    module.service('mapTiles', function(Restangular,$log) {

        var self = this;

        // Default layer if the server does not work somehow.
        this.baseLayers = [ {
           name : "osm",
           url: "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
           type : "xyz",
           layerOptions: { attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }}];
        this.defaultLayer = this.baseLayers[0];
        Restangular.all('tiles').getList({size:100,active:true,orderBy:"-modified"}).then(function(layers) {
            $log.debug("[mapTiles:getList] results:");
            _.assignDelete(self.baseLayers, _.cloneDeep(layers));
            //self.defaultLayer = self.baseLayers[0];
        });
    });

}());
