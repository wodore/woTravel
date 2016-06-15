(function() {
    'use strict';
    var module = angular.module('map');

    /**
     * @name wtTransport
     * @memberOf angularModule.map
     * @description
     * Serves map tiles
     */

    module.service('wtTransport', function(Restangular,$log) {

        var self = this;
        var S = 2.0;
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
            { type : "none",
              distance : 0,
              style : _.defaults({
                  color : 'green',
                  weight : S * 0
                                }, this.defaultStyle),
              icon : "alert-circle-outline" },
            { type : "plane",
              style : _.defaults({
                  color : 'blue',
                  weight : S * 1.2,
                  opacity : 0.3,
                  dashArray : "10, 20",
                                }, this.defaultStyle),
              distance : 100000,
              icon : "airplane" },
            { type : "train",
              style : _.defaults({
                  color : 'red',
                  weight : S * 4
                                }, this.defaultStyle),
              distance : 300,
              icon : "train" },
            { type : "bus",
              style : _.defaults({
                  color : 'green',
                  weight : S * 3
                                }, this.defaultStyle),
              distance : 150,
              icon : "bus" },
            { type : "car",
              style : _.defaults({
                  color : 'green',
                  weight : 3
                                }, this.defaultStyle),
              distance : 250,
              icon : "car" },
            { type : "taxi",
              style : _.defaults({
                  color : 'green',
                  weight : 3,
                  dashArray : "5, 5",
                                }, this.defaultStyle),
              distance : 50,
              icon : "taxi" },
            { type : "motorbike",
              style : _.defaults({
                  color : 'pink',
                  weight : S * 3
                                }, this.defaultStyle),
              distance : 0,
              icon : "motorbike" },
            { type : "bike",
              style : _.defaults({
                  color : 'yellow',
                  weight : S * 2
                                }, this.defaultStyle),
              distance : 100,
              icon : "bike" },
            { type : "foot",
              style : _.defaults({
                  color : 'green',
                  weight : S * 6
                                }, this.defaultStyle),
              distance : 10,
              icon : "walk" },
            { type : "boat",
              style : _.defaults({
                  color : 'green',
                  weight : S * 5
                                }, this.defaultStyle),
              distance : 0,
              icon : "water" },
            { type : "hitchhiking",
              style : _.defaults({
                  color : 'brown',
                  weight : S * 3
                                }, this.defaultStyle),
              distance : 0,
              icon : "baby" },
            { type : "other",
              style : _.defaults({
                  color : 'green',
                  weight : S * 4
                                }, this.defaultStyle),
              distance : 0,
              icon : "compass" },
           ];
        this.listTypes = _.map(self.list, 'type');
        this.listIcons = _.map(self.list, 'icon');
        this.listTypeKeys = _.keyBy(self.list, 'type');
        this.listIconKeys = _.keyBy(self.list, 'icon');
        $log.debug("[wtTransport] init");
        //$log.debug("[wtTransport] listTypes");
        //$log.debug(this.listTypes);
        //$log.debug("[wtTransport] listIcons");
        //$log.debug(this.listIcons);
        //$log.debug("[wtTransport] listTypeKeys");
        //$log.debug(this.listTypeKeys);
        //$log.debug("[wtTransport] listIconKeys");
        //$log.debug(this.listIconKeys);
        this.getStyle = function(type){
            type = typeof type !== 'undefined' ? type : 'other';
            var style = _.get(this.listTypeKeys,[type,'style'],
                this.listTypeKeys['other'].style );
            return  style
        }

        });
}());
