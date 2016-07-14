(function() {
    'use strict';
    var module = angular.module('map');

    /**
     * @name wdWayPoints
     * @memberOf angularModule.core
     * @description
     * Loads and updates waypoints
     */

    module.service('mapTrips', function(Restangular,$log,
                $q,$timeout,gaAuthentication , wtTransport,
                wtExpenseTypes, wtFellowTravelers, mapFn) {

        var self = this;

        /*****************************************************************
         * loading is true if something is loading
         */
        this.loading = false;

        /*****************************************************************
         * Saves all trips: [CACHE]
         * trips.data = {id1:trip1, id2: ...
         *               ,meta = {nextCursor, more, and so on}}
         */
        this.trips = {data:{}}; 
        this.locations = {};  // a list with a reference to each location
        this.countries = {};  // a list with all countries (name, code, duration, tripsNo, locationsNo)
        this.fellow_travelers = {};  // a list with all fellow travelers (name, duration, tripsNo, locationsNo)
        this.tripPaths = {};  // paths for all trips

        /*****************************************************************
         * Not used at the moment
         */
        this.current_trip = {}; 

        /*****************************************************************
         * Save the timestamp when it was last updated
         */
        this.timestamp = null;

        /*****************************************************************
         * Load new waypoints every 5 seconds as long the user is active
         */
        $timeout(function(){
            //$log.info("[ifvisible] Start loading");
            ifvisible.onEvery(60.0, function(){
                // time in seconds
                $log.info("[ifvisible] Load newest data");
                //$log.info("[ifvisible] timestamp: "+self.timestamp);
                if (gaAuthentication.isLogged()){
                    self.update();
                }
            });
        },10000)

        /*****************************************************************
         * Update async 'trips' from the server.
         * It loads the last modified and created trips.
         * 
         * */
        this.update = function() {
            var deferred = $q.defer();
            self.load({newer:self.timestamp, offset:-40})
                .then(function(){
                    deferred.resolve(true);
                }, function(msg){
                    $log.error("[mapTrips:update] "+msg);
                    deferred.reject(msg);
                });
            return deferred.promise;
        }


        /*****************************************************************
         * Load async 'trips' from the server.
         * If a trip is already available offline it is updated with the server
         * version.
         *
         * Parameters:
         * - options     : {}
         *     page_size : how much to load per page (default:20)
         *     pages     : how many pages to load (default:1000 -> 20'000 trips)
         *     newer     : date string, if given only newer waypoints are loaded (Y-m-d H:M:S)
         *                 dependes on the modified date
         *
         * Returns:
         * - more        : true if more data is available (as promise)
         */
        var defaultArguments = {
                orderBy:"-modified",
                locations:true,
                travelers:false, // TODO dont do it this way, create a service
                expenses:false,
                total:false}
        this.load = function(options) {
            $log.debug("[mapTrips:load] ---------------- ")
            self = this;
            var o = typeof options !== 'undefined' ? options : {};
            _.defaults(o,{page_size:20,
                          pages:1000,
                          cursor:null,
                          newer:null,
                          offset:null})

            $log.debug("[load Trips] options:   ");
            $log.debug(o);

            var TS = new Date().toJSON();
            var deferred = $q.defer();
            self.loading = true;
            Restangular.all('trips').getList(
                    _.merge({size:o.page_size,
                    cursor : o.cursor,
                    newer:o.newer, offset:o.offset},
                    defaultArguments)
                ).then(function(trips) {
                    $log.debug("[load Trips] loaded trips are:");
                    $log.debug(trips);
                    $log.debug(o);
                    $log.debug("[load Trips] cursor: "+trips.meta.nextCursor);
                    $log.debug("[load Trips] more:   "+trips.meta.more);
                    self.timestamp = TS.slice(0,10)+" "+TS.slice(11,19);
                    //_.set(self.trips,['meta'+o.newer], trips.meta)
                    //$log.debug(trips)
                    self.timestamp = TS.slice(0,10)+" "+TS.slice(11,19);
                    if (o.pages > 0 && _.get(trips,'meta.more')){
                        $log.debug("[load] load MORE trips from the server ...")
                        self.load(_.merge({page_size:o.page_size,pages:o.pages-1,
                                    newer:o.newer,offset:o.offset,
                                    cursor : trips.meta.nextCursor},
                                    defaultArguments)).then(function(){
                            deferred.resolve(_.get(trips,'meta.more'));
                        });
                    } else { // TODO is this correct? 
                            //Is the following for executed for the last batch?
                        $log.debug("[load] NO more trips (more=false).")
                        deferred.resolve(_.get(trips,'meta.more'));
                    }
                    // prepare and update data
                    for (var i = 0; i < trips.length; i++) { 
                        self.add(trips[i]);
                    }
                });
            return deferred.promise;
        }


        /*****************************************************************
         * Add a 'trip' from the server.
         * */
        this.add = function(trip, options) {
            //$log.debug("[mapTrips:add] ---------------- ")
            self = this;
            var o = typeof options !== 'undefined' ? options : {};
            _.defaults(o,{});
            var deferred = $q.defer();
            self.trips['data'][trip.key] = trip;
            if (_.has(trip,'locations')){
                self.getLocationsAsync(trip).then(function(locs){
                    self.addLocationsFromServer(trip,locs);
                });
            }
            return trip
        }
        
        /*****************************************************************
         * Get a 'trip' from local or server.
         * */
        this.getAsync = function(trip_key, options) {
            //$log.debug("[mapTrips:getAsync] ---------------- ")
            self = this;
            var deferred = $q.defer();
            var o = typeof options !== 'undefined' ? options : {};
            _.defaults(o,{force_update:false,
                          only_local:false})
            var trip = _.get(self.trips.data,trip_id,false);
            if (trip === false || o.force_update && !o.only_local){
            Restangular.all('trips').one(trip_key).get(
                    _.merge({},
                    defaultArguments)
                ).then(function(trip) {
                    deferred.resolve(self.add(trip));
                },function(msg){
                    $log.error("[mapTrips:getAsync] "+msg);
                    deferred.reject(msg);
                });
            }
            if (trip !== false){
                deferred.resolve(trip);
            } else {
                deferred.resolve(false)
            }
            return deferred.promise;
        }


        /*****************************************************************
         * Returns a marker radius depended on the duration (in days)
         * */
        this.durationToRadius = function(duration, options) {
            var d = typeof duration !== 'undefined' ? duration : 3;
            var o = typeof options !== 'undefined' ? options : {};
            _.defaults(o,{
                minRadius : 5,
                maxRadius : 20,
                tau : 15});
            d = d > 1 ? d : 1; // no negative values
            return (o.maxRadius-o.minRadius) * ( 1-Math.exp(-d/o.tau)) + o.minRadius;
        }

        /*****************************************************************
         * Get a 'locations' from a 'trip' from local or server.
         * Parameters:
         * - trip : trip object
         * - options     : {force_update : false}
         * */
        this.getLocationsAsync = function(trip, options) {
            //$log.debug("[mapTrips:getLocationsAsync] ---------------- ")
            self = this;
            var deferred = $q.defer();
            var o = typeof options !== 'undefined' ? options : {};
            _.defaults(o,{force_update:false})
            var locs = _.get(trip,'locations',false);
            if ( locs !== false){
                // check if it is only keys or already an object
                if ( _.isArray(locs) && !o.force_update){
                    deferred.resolve(locs);
                } else {
                Restangular.all('locations').get({
                        trip : trip.key, size:200})
                    .then(function(locations) {
                        _.set(trip,'locations',locations);
                        deferred.resolve(locations);
                    },function(msg){
                        deferred.reject(msg);
                    });
                }
            }
            deferred.resolve([]);
            return deferred.promise;
        }



        /*****************************************************************
         * Add locations to a trip
         * Parameters:
         * - trip : trip object
         * - locations : list with locations (from the server)
         * - options     : {}
         *   */
        this.addLocationsFromServer = function(trip,locations, options) {
            var path = [];
            var markerCircles = {} ;
            //var markers = {} ;
            if(!_.has(trip,'markers')){
                _.set(trip,'markers',[]);
            }
            var prevMarker = false;
            _.forEach(locations,function(val,ind,col){
                self.setCountry(val);
                // set marker options
                if (_.get(val,'geo',false)){
                    //val.lat = _.get(val,'geo.lat',undefined);
                    //val.lng = _.get(val,'geo.lng',undefined);
                    _.set(val,'trans_start.waypoints',
                        _.get(val,"trans_start.waypoints",[]));
                    _.set(val,'trans_start.locationRaw.name',
                        _.get(val,"trans_start.name",""));
                    _.set(val,'trans_end.waypoints',
                        _.get(val,"trans_end.waypoints",[]));
                    _.set(val,'trans_end.locationRaw.name',
                        _.get(val,"trans_end.name",""));
                    if (!_.isEmpty(_.get(val,"trans_end.geo",[]))){
                        _.set(val,'last',true);
                    }
                    val.message = val.name+" ("+trip.name+")";
                    //val.marker = val.geo;
                    trip.markers.push(val.geo);
                    var mainID = "Tid"+trip.id+"Lid"+val.id;
                    markerCircles[mainID+"C"]= {
                                weight: 2, color: '#ff612f',
                                latlngs: val.geo,
                                radius: self.durationToRadius(_.get(val,'duration')),
                                type: 'circleMarker',
                                message : val.name+" ("+trip.name+")" 
                            };
                    val.locationRaw = { // TODO dont use this if possible
                        name : val.name,
                        country : val.country,
                        country_code : val.country_code,
                        marker : val.geo
                        }
                    val.start_datetime = new Date(val.start_datetime);
                    val.end_datetime = new Date(val.end_datetime);
                    val.map = {zoom : 10, center : val.geo, defaults: {}}
                    path.push(val.geo);
                    if (prevMarker !== false || 
                            ! _.isEmpty(_.get(val,'trans_start.waypoints'))){ // TODO not necessary with waypoints
                        $log.debug("waypoints");
                        $log.debug(val.trans_start.waypoints);
                        var style = _.get(val,"trans_start.type",'other')
                        if (_.isEmpty(val.trans_start.waypoints)){
                            var line =  [prevMarker, val.geo];
                        } else {
                            var line = val.trans_start.waypoints;
                        }
                        self.tripPaths[mainID+"transStart"]=_.defaults(
                                {latlngs: line, 
                                // TODO replace with val.waypoints
                                    type: "polyline",
                                    message : style
                                },wtTransport.getStyle(style))
                    }
                    if (!_.isEmpty(_.get(val,'trans_end.waypoints',[]))){
                        var style = _.get(val,"trans_end.type",'other')
                        self.tripPaths[mainID+"transEnd"]=_.defaults(
                                {latlngs: val.trans_end.waypoints, 
                                    type: "polyline",
                                    message : style
                                },wtTransport.getStyle(style))
                    }
                    prevMarker = val.geo;

                    // extra functions
                    
                    val.prevLocation = function(){
                        return self.getLocationsRelative(trip,val,-1)
                    }
                    val.nextLocation = function(){
                        return self.getLocationsRelative(trip,val,1)
                    }

                    // EXPENSES EDIT
                    _.forEach(val.expenses,function(exp){
                        exp.showNote = _.get(exp,'note',false) ? true : false;
                        wtExpenseTypes.getAsync(exp.type).then(function(res){
                                exp.type = res;
                        });
                    });

                    // FELLOW TRAVELERS EDIT
                    //var trav_keys = _.clone(fellow_travelers);
                    //val.fellow_travelers = [];
                    _.forEach(val.fellow_travelers,function(trav,key){
                        wtFellowTravelers.getAsync(trav).then(function(res){
                                val.fellow_travelers[key] = res;
                                self.setFellowTraveler(val,res);
                        });
                    });


                }
            });
            _.merge(self.tripPaths,markerCircles);
        }

        /*****************************************************************
         * Add a country to the country list from a location.
         * Parameters:
         * - loc: location
         * - options     : {}
         *   */
        this.setCountry = function(loc) {
            var country = _.get(self.countries,loc.country,{duration:0,
                    trips:[], locations:[]});
            country.duration = (parseInt(country.duration) + parseInt(loc.duration));
            country.trips.push(loc.trip);
            country.trips = _.uniq(country.trips);
            country.tripsNo = country.trips.length;
            country.locations.push(loc.name);
            country.locations = _.uniq(country.locations);
            country.locationsNo = country.locations.length;
            country.name = _.get(country,'name',_.get(loc,'country'));
            country.code = _.get(country,'code',_.get(loc,'country_code'));
            _.set(self.countries,country.name,country);
        }

        /*****************************************************************
         * Add a fellow traveler to the list from a location.
         * Parameters:
         * - loc: location
         * - options     : {}
         *   */
        this.setFellowTraveler = function(loc,fellow) {
            var traveler = _.get(self.fellow_travelers,fellow.key,{duration:0,
                    trips:[], locations:[]});
            traveler.duration = (parseInt(traveler.duration) + parseInt(loc.duration));
            traveler.trips.push(loc.trip);
            traveler.trips = _.uniq(traveler.trips);
            traveler.tripsNo = traveler.trips.length;
            traveler.locations.push(loc.name);
            traveler.locations = _.uniq(traveler.locations);
            traveler.locationsNo = traveler.locations.length;
            traveler.name = _.get(traveler,'name',_.get(fellow,'name'));
            traveler.avatar_url = _.get(traveler,'avatar_url',_.get(fellow,'avatar_url'));
            _.set(self.fellow_travelers,fellow.key,traveler);
        }

        /*****************************************************************
         * Get next or previous location
         * Parameters:
         * - trip : current trip object
         * - loc: current location
         * - rel_pos : relative position from current location (-1: prev, 1: next);
         * - options     : {}
         *   */
        this.getLocationRelative = function(trip,loc, rel_pos, options) {
            var locs = _.get(trip,'locations',[]);
            var index = _.findIndex(locs, ['key', _.get(loc,'key')]);
            if (index + rel_pos < 0 ){
                return {};
            } else if ( index + rel_pos > locs.length-1 ) {
                return {};
            }
            return locs[index + rel_pos]; 
        }


        /*****************************************************************
         * New empty trip
         * - options     : {name, 
         *                  firstLocation [true] if true an empty 
         *                          first location is added.
         *                  edit [false] it is added in edit mode
         *                  }
         *   */
        this.newTrip = function(options) {
            var o = typeof options !== 'undefined' ? options : {};
            _.defaults(o,{name:"",firstLocation:true, edit:false})
            var trip = {key: "new", name:o.name};
            if (o.firstLocation === true){
                self.newLocation(trip,{edit:o.edit});
            }
            self.trips['data'][trip.key] = trip;
            return self.trips['data'][trip.key];
        }

        /*****************************************************************
         * New empty trip
         * - options     : {name, 
         *                  first_location [true]
         *                  map [main map]}
         *                  addToTrip [true]
         *                  edit [false] open in edit mode
         *   */
        this.newLocation = function(trip, options) {
            $log.debug("[mapTrips:newLocation]: start")
            var o = typeof options !== 'undefined' ? options : {};
            _.defaults(o,{name:"", map: mapFn.getMap('main'),
                    addToTrip: true,
                    edit : false})
            if ( ! _.has(trip,'locations')){
                trip.locations = []
            }
            var len = trip.locations.length;
            var defaultTrans = wtTransport.list[0];
            if (len > 0){ // NOT first
                $log.debug("[nextLocation]: not first location");
                var prevLoc = trip.locations[len-1];
                $log.debug("[nextLocation]: previous location");
                $log.debug(prevLoc);
                // Take values from the last location
                var users = _.clone(prevLoc.fellow_travelers);
                var start_date = _.clone(prevLoc.end_datetime);
                start_date = moment(start_date).add(1, 'day')._d;        
                var map = _.cloneDeep(prevLoc.map);
                var trans_start = {
                        locationRaw: _.clone(_.get(prevLoc,'locationRaw')),
                        geo: _.clone(_.get(prevLoc,'geo')),
                        name: _.clone(_.get(prevLoc,'name')),
                        type: _.clone(_.get(prevLoc,['trans_start','type'],
                                defaultTrans.type))};
                var firstLocTrans = _.get(trip.locations[0],'trans_start');
                $log.debug("[nextLocation]: first location");
                $log.debug(firstLocTrans);
                var trans_end = {
                        locationRaw: _.clone(_.get(firstLocTrans,'locationRaw')),
                        geo: _.clone(_.get(firstLocTrans,'geo')),
                        name: _.clone(_.get(firstLocTrans,'name')),
                        type: _.clone(_.get(firstLocTrans,'type',
                                defaultTrans.type))};
                _.set(prevLoc,['trans_end'],{})
            } else { // FIRST
                var users = [gaAuthentication.user.fellow_traveler]
                var start_date = undefined
                var map = { zoom : _.clone(o.map.getZoom()),
                            center : _.clone(o.map.getCenter()),
                            defaults : {} }
                map.defaults.scrollWheelZoom = false;
                var trans_start = _.clone(defaultTrans)
                var trans_end = _.clone(defaultTrans);
            }
            var loc = {fellow_travelers:users,
                  start_datetime : start_date,
                  end_datetime : start_date,
                  //expenses:[{}],
                  expenses: [{amount:""}],
                  map : map,
                  trans_start: trans_start,
                  trans_end: trans_end,
                  edit : o.edit
            }
            if (o.addToTrip === true){
                trip.locations.push(loc)
            }   
            return loc;
        }


        this.editLocation = function(trip, loc) {
            var index = -1
            _.forEach(trip.locations,function(value,i,locs){
                if (_.isEqual(value, loc)){
                    locs[i].edit = true;
                    index = i
                } else {
                    locs[i].edit = false;
                }
            });
            return index
        }
    });

}());
