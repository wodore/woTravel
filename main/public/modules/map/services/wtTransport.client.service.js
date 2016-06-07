(function() {
    'use strict';
    var module = angular.module('map');

    /**
     * @name wdTiles
     * @memberOf angularModule.map
     * @description
     * Serves map tiles
     */

    module.service('wtTransport', function(Restangular,$log) {

        var self = this;
        var S = 2.5;
        this.defaultStyle = {
                  weight: S * 3,
                  opacity : 0.4,
                  color : 'blue',
                  dashArray : "10, 5",
                  lineCap : "round",
                  lineJoin : "round"
                  } 
        // distance is used for suggestions
        this.list = [ 
            { name : "none",
              distance : 0,
              style : _.defaults({
                  color : 'green',
                  weight : S * 0
                                }, this.defaultStyle),
              icon : "alert-circle-outline" },
            { name : "plane",
              style : _.defaults({
                  color : 'blue',
                  weight : S * 6,
                  dashArray : "15, 10",
                                }, this.defaultStyle),
              distance : 100000,
              icon : "airplane" },
            { name : "train",
              style : _.defaults({
                  color : 'red',
                  weight : S * 4
                                }, this.defaultStyle),
              distance : 300,
              icon : "train" },
            { name : "bus",
              style : _.defaults({
                  color : 'green',
                  weight : S * 3
                                }, this.defaultStyle),
              distance : 150,
              icon : "bus" },
            { name : "car",
              style : _.defaults({
                  color : 'green',
                  weight : 3
                                }, this.defaultStyle),
              distance : 250,
              icon : "car" },
            { name : "taxi",
              style : _.defaults({
                  color : 'green',
                  weight : 3,
                  dashArray : "5, 5",
                                }, this.defaultStyle),
              distance : 50,
              icon : "taxi" },
            { name : "motorbike",
              style : _.defaults({
                  color : 'pink',
                  weight : S * 3
                                }, this.defaultStyle),
              distance : 0,
              icon : "motorbike" },
            { name : "bike",
              style : _.defaults({
                  color : 'yellow',
                  weight : S * 2
                                }, this.defaultStyle),
              distance : 100,
              icon : "bike" },
            { name : "foot",
              style : _.defaults({
                  color : 'green',
                  weight : S * 6
                                }, this.defaultStyle),
              distance : 10,
              icon : "walk" },
            { name : "boat",
              style : _.defaults({
                  color : 'green',
                  weight : S * 5
                                }, this.defaultStyle),
              distance : 0,
              icon : "water" },
            { name : "hitchhiking",
              style : _.defaults({
                  color : 'brown',
                  weight : S * 3
                                }, this.defaultStyle),
              distance : 0,
              icon : "baby" },
            { name : "other",
              style : _.defaults({
                  color : 'green',
                  weight : S * 4
                                }, this.defaultStyle),
              distance : 0,
              icon : "compass" },
           ];
        this.listNames = _.map(self.list, 'name');
        this.listIcons = _.map(self.list, 'icon');
        this.listNameKeys = _.keyBy(self.list, 'name');
        this.listIconKeys = _.keyBy(self.list, 'icon');
        $log.debug("[wtTransport] init");
        //$log.debug("[wtTransport] listNames");
        //$log.debug(this.listNames);
        //$log.debug("[wtTransport] listIcons");
        //$log.debug(this.listIcons);
        //$log.debug("[wtTransport] listNameKeys");
        //$log.debug(this.listNameKeys);
        //$log.debug("[wtTransport] listIconKeys");
        //$log.debug(this.listIconKeys);
        this.getStyle = function(name){
            name = typeof name !== 'undefined' ? name : 'other';
            var style = _.get(this.listNameKeys,[name,'style'],
                this.listNameKeys['other'].style );
            return  style
        }

        });
}());
