(function() {
    'use strict';
    var module = angular.module('map');

    /**
     * @name wdTiles
     * @memberOf angularModule.map
     * @description
     * Serves map tiles
     */

    module.service('wtFellowTravelers', function(Restangular,$log,$q) {

        var self = this;
        // distance is used for suggestions

        self.travelers = {};
        self.meta = {};
        self.default = {};
        
        var defaultArguments = {
                orderBy:"-modified",
                total : false}
        this.loadAll = function(options) {
            $log.debug("[wtFellowTravelers:loadAll] ---------------- ")
            self = this;
            var o = typeof options !== 'undefined' ? options : {};
            _.defaults(o,{page_size:20,
                          pages:1000,
                          cursor:null })
            var deferred = $q.defer();
            self.loading = true;
            Restangular.all('fellow_travelers').getList(
                    _.merge({size:o.page_size,
                    cursor : o.cursor},
                    defaultArguments)
                ).then(function(travelers){
                    //self.meta = travelers.meta;
                    if (o.pages > 0 && _.get(travelers,'meta.more')){
                        self.loadAll(_.merge({
                            page_size:o.page_size,
                            pages:o.pages-1,
                            cursor: travelers.meta.nextCursor},
                                    defaultArguments)).then(function(){
                            deferred.resolve(_.get(travelers,'meta.more'));
                        });
                    } else { // TODO is this correct? 
                            //Is the following for executed for the last batch?
                        $log.debug("[wtFellowTravelers:loadAll] NO more travelers (more=false).")
                        deferred.resolve(_.get(travelers,'meta.more',false));
                    }
                    // prepare and update data
                    for (var i = 0; i < travelers.length; i++) { 
                        var traveler = travelers[i];
                        _.set(self.travelers,traveler.key,traveler);
                    }
                });
            return deferred.promise;
        }
        self.loadAll({pages:2});
        
        this.getAsync = function(key){
            //$log.debug("[wtExpenseTypes:getAsync] start");
            self = this;
            var deferred = $q.defer();
            if (_.isObject(key)){ // it is already loaded
                $log.debug("[wtFellowTravelers:getAsync] is object");
                _.set(self.travelers,key.key,key);
                deferred.resolve(key)
            } else if (_.isString(key)){
                var trav = _.get(self.travelers,key,false);
                if (trav === false ) {
                    $log.debug("[wtFellowTravelers:getAsync] load travelers from server:" + key);
                    Restangular.all('fellow_travelers').one(key).get()
                        .then(function(traveler){
                            $log.debug("[wtFellowTravelers:getAsync] loaded new travelers: "+traveler.name+" ("+traveler.key+")");
                            self.travelers[key] = traveler;
                            deferred.resolve(traveler);
                        },function(msg){
                            $log.error("[wtFellowTravelers:getAsync] "+msg);
                            deferred.reject(msg);
                        });
                } else {
                    //$log.debug("[wtFellowTravelers:getAsync] already exists: "+trav.name+" ("+trav.key+")");
                    deferred.resolve(trav)
                }
            }
            else {
                deferred.resolve(null)
            }
            return deferred.promise;
        }


        this.query = function(qry){
            var deferred = $q.defer();
            Restangular.all('fellow_travelers/suggestions').getList({q:qry,size:15}).then(function(users) {
                if (users){
                    deferred.resolve(users);
                } else {
                    deferred.resolve([{name: qry}]);
                }
            });
            return deferred.promise;
        };

        var imageSuggestions = {};
        this.queryImages =  function(qry){
            var deferred = $q.defer();
            var img = _.get(imageSuggestions,qry,false);
            if (img === false ){
                Restangular.one('fellow_travelers/social').one(qry)
                        .get({size:20})
                        .then(function(data) {
                    deferred.resolve(data.images);
                },function(msg) {
                    $log.warn("[wtFellowTravelers:loadUserImages] "+msg);
                    deferred.reject(msg);
                });
            } else {
                deferred.resolve(img);
            }
            return deferred.promise;
        }

        this.addOnline =  function(traveler){
            var deferred = $q.defer();
            Restangular.one('fellow_travelers',_.get(traveler,"key","new"))
                .customPUT(traveler).then(function(res){
                    _.assignDelete(traveler,res);
                    deferred.resolve(res);
                },function(msg){
                    $log.error("[wtFellowTravelers:addOnline] "+msg);
                    deferred.reject(msg);
                });
            return deferred.promise;
        }


   // END     
    });
}());
