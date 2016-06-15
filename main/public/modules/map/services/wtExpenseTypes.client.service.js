(function() {
    'use strict';
    var module = angular.module('map');

    /**
     * @name wdTiles
     * @memberOf angularModule.map
     * @description
     * Serves map tiles
     */

    module.service('wtExpenseTypes', function(Restangular,$log,$q) {

        var self = this;
        // distance is used for suggestions

        self.types = {};
        self.meta = {};
        self.default = {};
        
        var defaultArguments = {
                orderBy:"-modified",
                total : false}
        this.loadAll = function(options) {
            $log.debug("[wtExpeneTypes:loadAll] ---------------- ")
            self = this;
            var o = typeof options !== 'undefined' ? options : {};
            _.defaults(o,{page_size:20,
                          pages:1000})
            var deferred = $q.defer();
            self.loading = true;
            Restangular.all('expense_types').getList(
                    _.merge({size:o.page_size,
                    cursor : _.get(self.meta,['nextCursor'],null)},
                    defaultArguments)
                ).then(function(types){
                    self.meta = types.meta;
                    if (o.pages > 0 && _.get(self.meta,'more')){
                        self.loadAll(_.merge({
                            page_size:o.page_size,pages:o.pages-1},
                                    defaultArguments)).then(function(){
                            deferred.resolve(_.get(self.meta,'more',true));
                        });
                    } else { // TODO is this correct? 
                            //Is the following for executed for the last batch?
                        deferred.resolve(_.get(self.meta,'more',false));
                    }
                    // prepare and update data
                    for (var i = 0; i < types.length; i++) { 
                        var type = types[i];
                        _.set(self.types,type.key,type);
                        if (_.get(type,'default',false) === true){
                            self.default = type
                        }
                    }
                    deferred.resolve(self.types);
                });
            return deferred.promise;
        }
        // load all the frist time
        self.loadAll();
        
        this.getAsync = function(key){
            //$log.debug("[wtExpenseTypes:getAsync] start");
            self = this;
            var deferred = $q.defer();
            if (_.isObject(key)){ // it is already loaded
                _.set(self.types,key.key,key);
                deferred.resolve(key)
            } else if (_.isString(key)){
                var ex_type = _.get(self.types,key,false);
                if (ex_type === false ) {
                Restangular.all('expense_types').one(key).get()
                    .then(function(type){
                        $log.debug("[wtExpenseTypes:getAsync] loaded new type");
                        self.types[key] = type;
                        deferred.resolve(type);
                    },function(msg){
                        $log.error("[wtExpenseTypes:getAsync] "+msg);
                        deferred.reject(msg);
                    });
                } else {
                    deferred.resolve(ex_type)
                }
            }
            else {
                deferred.resolve(self.default)
            }
            return deferred.promise;
        }

        });
}());
