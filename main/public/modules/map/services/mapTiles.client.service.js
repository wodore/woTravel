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


        this.settings = {
                center: {
                    lat: 46.78,
                    lng: 9.9,
                    zoom:13,
                    autoDiscover: true
                },
                defaults: {
                    scrollWheelZoom: true,
                    doubleClickZoom: false,
                    maxZoom : 16,
                    worldCopyJump : true,
                    touchZoom : true,
                    dragging: true,
                    tap : true,
                    map: {
                        editable : true
                    }   
                    //zoomControl : false
                },
                events: {
                    map: {
                        enable: ['dblclick'],
                        logic: 'emit'
                    },
                    markers: {
                        enable: [],
                        logic: 'emit'
                    }
                },
                watchOptions: {
                    markers: {
                        // changes in master
                        // new match-options
                        // old markers-watch-options
                        type: 'watchCollection', // new
                        doWatch: true, //old
                        isDeep: true, //old
                        individual: {
                            type: null,//'watch'
                            doWatch: false, //old
                            isDeep: false //old
                        }
                    },
                    paths: {
                        type: null,
                        doWatch : false,
                        isDeep: false,
                        individual: {
                            type: null,
                            doWatch: false, //old
                            isDeep: false //old
                        }
                    }
                },
                //tiles: tilesDict.OfflineHike,
                layers: {
                        baselayers: self.baseLayers
                }
        }


    /// END
    });

}());
