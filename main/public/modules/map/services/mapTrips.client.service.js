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
                $q,$timeout,gaAuthentication , wtTransport) {

        var self = this;

        /*****************************************************************
         * loading is true if something is loading
         */
        this.loading = false;

        /*****************************************************************
         * Saves all waypoints: [CACHE]
         * waypoints.collection_key.data = {id1:waypoint1, id2: ...]
         *                         .meta = {nextCursor, more, and so on}
         */
        this.trips = {data:{}}; 
        this.tripLocations = {};  // all markers in one list
        this.tripPaths = {};  // all markers in one list

        /*****************************************************************
         * Waypoint available (and possible displayed) to the user
         * current_waypoints = {id1: waypoint1, id2: ...}
         */
        this.current_trip = {}; 

        /*****************************************************************
         * Save the timestamp when it was last updated
         */
        this.timestamp = null;

        // TODO make service! 
        /*****************************************************************
         * Load new waypoints every 5 seconds as long the user is active
         */
        $timeout(function(){
            $log.info("[ifvisible] Start loading");
            ifvisible.onEvery(60.0, function(){
                // time in seconds
                $log.info("[ifvisible] Load newest data");
                $log.info("[ifvisible] timestamp: "+self.timestamp);
                if (gaAuthentication.isLogged()){
                    self.load({newer:self.timestamp, offset:-40});
                }
            });
        },10000)


        /*****************************************************************
         * Load async 'waypoints' from the server.
         * If a waypoint is already available offline it is updated with the server
         * version
         *
         * Parameters:
         * - collection  : collection urlsafe key, default is the seleceted
         *                 collection
         * - options     : {}
         *     page_size : how much to load per page (default:20)
         *     pages     : how many pages to load (default:500 -> 10'000 waypoints)
         *     newer     : date string, if given only newer waypoints are loaded (Y-m-d H:M:S)
         *
         * Returns:
         * - more        : true if more data is available (as promise)
         */
        this.load = function(options) {
            $log.debug("[load] ---------------- ")
            self = this;
            options = typeof options !== 'undefined' ? options : {};
            _.defaults(options,{page_size:20,
                                pages:1000,
                                newer:null,
                                offset:null})
            $log.debug("[load] options: ")
            $log.debug(options)

            var defaultArguments = {
                    orderBy:"-modified",
                    locations:true,
                    travelers:true, // TODO dont do it this way, create a service
                    expenses:true}

            var page_size = options.page_size;
            var pages = options.pages ;
            var newer = options.newer;
            var offset = options.offset;
            var TS = new Date().toJSON();
            //self.timestamp[collection] = TS.slice(0,10)+" "+TS.slice(11,19);
            //
            $log.debug("[load] Going to load trips from server:")
            var deferred = $q.defer();
            self.loading = true;
            //if (!self.trips.hasOwnProperty('meta'+newer)){
                //self.trips['meta'+newer] = {nextCursor:null,more:true}
            //}
            //_.set(self.trips,['meta'+newer], {nextCursor:null,more:true})
            Restangular.all('trips')
                .getList(
                    _.merge({size:page_size,total:false,
                    cursor : _.get(self.trips,['meta'+newer,'nextCursor'],null),
                    newer:newer, offset:offset},
                    defaultArguments)
                )
                .then(function(trips) {
                    $log.debug("[load] Got trips from server:")
                    $log.debug(trips)
                    self.timestamp = TS.slice(0,10)+" "+TS.slice(11,19);
                    _.set(self.trips,['meta'+newer], trips.meta)
                    if (pages > 0 && trips.meta.more){
                        $log.debug("[load] load MORE trips from the server ...")
                        self.load(_.merge({page_size:page_size,pages:pages-1,
                                    newer:newer,offset:offset},
                                    defaultArguments)).then(function(){
                            $log.debug("[load] RESOLVE, all trips:")
                            $log.info(self.trips);
                            deferred.resolve(_.get(self.trips,['meta'+newer,'more'],true));
                        });
                    } else { // TODO is this correct? 
                            //Is the following for executed for the last batch?
                        $log.debug("[load] NO more trips (more=false).")
                        deferred.resolve(_.get(self.trips,['meta'+newer,'more'],true));
                    }
                    // prepare and update data
                    for (var i = 0; i < trips.length; i++) { 
                        var wp = trips[i];
                        self.trips['data'][wp.id] = wp;
                        if (_.has(wp,'locations')){
                            $log.debug("Add location, if geo point exists, for trip:")
                            $log.debug(wp);
                            var path = [];
                            var markerCircles = {} ;
                            var markers = {} ;
                            var prevMarker = false;
                            _.forEach(wp.locations,function(val,ind,col){
                                // set marker options
                                if (_.get(val,'geo',false)){
                                    markers[wp.id+val.id]=val.geo;
                                    markers[wp.id+val.id].message = val.name+" ("+wp.name+")";
                                    var mainID = "Tid"+wp.id+"Lid"+val.id;
                                    // Calculate Radius
                                    var minR = 5, maxR = 20 - minR;
                                    var tau = 15; // 100% / 3 (eg. 30/3 = 10)
                                    var dur = _.get(val,'duration',3);
                                    dur = dur > 1 ? dur : 1; // no negative values
                                    var R = maxR * ( 1 - Math.exp(-dur/tau)) + minR;
                                    markerCircles[mainID+"C"]= {
                                                weight: 2,
                                                color: '#ff612f',
                                                latlngs: val.geo,
                                                radius: R,
                                                //type: 'circle',
                                                type: 'circleMarker',
                                                message : val.name+" ("+wp.name+")" // TODO open view
                                            };
                                    val.locationRaw = {
                                        name : val.name,
                                        country : val.country,
                                        country_code : val.country_code,
                                        marker : val.geo
                                        }
                                    //val.trans_to_name = _.get(val,['trans_to','name'],'none');
                                    //val.trans_from_name = _.get(val,['trans_from','name'],'none');
                                    val.start_datetime = new Date(val.start_datetime);
                                    val.end_datetime = new Date(val.end_datetime);
                                    val.map = {zoom : 10, center : val.geo, defaults: {}}


                                    //var style = wtTransport.listNameKeys[_.get(val,"trans_to.name"],'other')]
                                    // TODO needs to create a multi poliline, or multiple ployline if style is not possible
                                    path.push(val.geo);
                                    if (prevMarker !== false){
                                        var style = _.get(val,"trans_to.name",'other')
                                        self.tripPaths[mainID+"P"]=_.defaults(
                                                {latlngs: [prevMarker, val.geo], 
                                                // TODO replace with val.waypoints
                                                    type: "polyline",
                                                    message : style
                                                    
                                                },wtTransport.getStyle(style))
                                        //_.merge(self.tripPaths[wp.id+val.id],wtTransport.getStyle(style)); // TODO
                                    }
                                    prevMarker = val.geo;

                                    // EXPENSES EDIT
                                    _.forEach(val.expenses,function(exp){
                                        exp.showNote = _.get(exp,'note',false) ? true : false;
                                        // TODO get icon and name from Service
                                    });

                                }
                            });
                            wp.markers = markers;
                            //self.tripPaths[wp.id]={latlngs: path, 
                                                    //type: "polyline",
                                                    //message : wp.name
                                                //}
                            //_.merge(self.tripPaths[wp.id],wtTransport.getStyle(style)); // TODO
                            _.merge(self.tripPaths,markerCircles);

                        }
                        //self.trips['data'][wp.id]['message'] = "<h4>"+wp.name+"</h4><p>"+wp.tags+"</p>"
                        //self.trips['data'][wp.id]['group'] = "markercluster"
                    }
                });
            return deferred.promise;
        }


        /*****************************************************************
         * TODO collections as list
         * set the current waypoints, collections is either a list of
         * collections or just one collection.
         * Default is the current selected collection
         *
         * This function does not load the waypoints! 
         * Use load() for this.
         *
         * Parameters:
         * - collections : a list or string (keys)
         *
         * Returns:
         * - ref to current waypoints
         */
        //this.set_current_waypoints = function(collections){
            //collection = typeof collection !== 'undefined' ? collection : self.current_collections;
            //var collection = collections // TODO for loop
            //if (!self.waypoints.hasOwnProperty(collection)){
                //self.waypoints[collection] = {}
                //self.waypoints[collection]['meta'+null] = {nextCursor:null,more:true}
                //self.waypoints[collection]['data'] = {}
            //}
            //self.current_waypoints = self.waypoints[collections]['data'];
            //return self.current_waypoints;
        //}
        //
        //
        //################################################################
        //################################################################
        //################################################################
        //################################################################
        //
        //              N O T   U S E D   A N Y M O R E
        //              

        /*****************************************************************
         * Returns a promies which resolves tag details for the given tags.
         * If a tag is not already available offline it gets it from the
         * server.
         *
         * Parameters:
         * - tags        : a list or comma separated string with tags
         * - collection  : collection urlsafe key, default is the seleceted
         *                 collection
         *
         * Returns:
         * - tag_details : a list with tag details: 
         *                     [{name:"tag1",icon_url:"..."},{...},...]
         */
        this.get_async = function(tags,collection){
            $log.debug("[get_async] ---------------- ")
            self = this;
            tags = typeof tags !== 'undefined' ? self.check_tag_list(tags) : [];
            var deferred = $q.defer();
            var tag_details = []
            var tags_to_load = []
            var tags_to_load_i = []
            collection = typeof collection !== 'undefined' ? collection : self.current_collections;
            $log.debug("[get_async] Collection key: "+collection)
            if (self.tags.hasOwnProperty(collection)){
                for (var i = 0; i < tags.length; i++) { 
                    var tag = tags[i]
                    if (self.tags[collection].hasOwnProperty(tag)){
                        tag_details[i] = self.tags[collection][tag]
                    } else{
                        $log.debug("[get_async] Not downloaded yet: "+tag+" ("+i+")")
                        if (tag){
                            tags_to_load.push(tag);
                            tags_to_load_i.push(i);
                        } else {
                            tag_details[i] = ""
                        }
                    }
                }
                if (tags_to_load.length > 0 ){
                    self.load(tags_to_load,collection).then(function(tags){
                        for (var i = 0; i < tags.length; i++) { 
                            tag_details[tags_to_load_i[i]] = tags[i]; 
                        }
                        $log.debug("[get_async] RESOLVE 1")
                        deferred.resolve(tag_details);
                    });
                } else {
                    $log.debug("[get_async] RESOLVE 2")
                    deferred.resolve(tag_details);
                }
            } else {
                if (tags.length > 0 ){
                    self.load(tags,collection).then(function(tags){
                        $log.debug("[get_async] RESOLVE 3")
                        deferred.resolve(tags);
                    });
                }
            }
            return deferred.promise;
        }

        /*****************************************************************
         * Returns a list of tag details for a given query.
         * The function can be used for autocomplete.
         * It is automatically only every 800ms executed (throttled).
         * 
         * Parameters:
         * - query       : partial tag name
         * - size        : max size of returned array
         *
         * Returns:
         * - tag_details : a list with tag details: 
         *                     [{name:"tag1",icon_url:"..."},{...},...]
         */
        this.tagSuggestions = _.throttle(function(query,size) {
            size = typeof size !== 'undefined' ? size : 20;
            return $q(function(resolve, reject) {
                 Restangular.one('tags',self.current_collections)
                    .all('suggestions')
                    .all(query)
                    .getList({size:size,only_names:true})
                    .then(function(tags){
                            var tag_details = self.get_async(tags);
                            resolve(tag_details);
                    });
            });
        }, 800,{trailing: true, leading:true}); 


        /*****************************************************************
         * Returns a list with tags already stored offline.
         * The function does not get new tags, for this
         * you should user get_async!
         * 
         * Parameters:
         * - tags        : a list or comma separated string with tags
         * - collection  : collection urlsafe key, default is the seleceted
         *                 collection
         *
         * Returns:
         * - tag_details : a list with tag details: 
         *                     [{name:"tag1",icon_url:"..."},{...},...]
         */
        this.get = function(tags,collection) {
            $log.debug("[get] ---------------- ")
            tags = typeof tags !== 'undefined' ? self.check_tag_list(tags) : [];
            //collection = typeof collection !== 'undefined' ? collection : wdCollections.get_collection().key;
            self = this;
            var tag_details = []
            if (self.tags.hasOwnProperty(collection)){
                for (var i = 0; i < tags.length; i++) { 
                    var tag = tags[i]
                    if (self.tags[collection].hasOwnProperty(tag)){
                        tag_details[i] = self.tags[collection][tag]
                    } else {
                        tag_details[i] = null
                    }
                }
            }
            return tag_details 
        }

        /*****************************************************************
         * TODO not tested yet, not sure if it is used!
         * TODO same goes for the tag_api side
         * Returns a list with tags already stored offline.
         * The function does not get new tags, for this
         * you should user get_async!
         * 
         * Parameters:
         * - tags        : a list or comma separated string with tags
         * - collection  : collection urlsafe key, default is the seleceted
         *                 collection
         *
         * Returns:
         * - tag_details : a list with tag details: 
         *                     [{name:"tag1",icon_url:"..."},{...},...]
         */
        this.add_async = function(collection,waypoint) {
            $log.debug("[add_async] ---------------- ")
            collection = typeof collection !== 'undefined' ? collection : self.current_collections;
            var wp = typeof waypoint !== 'undefined' ? waypoint : {};
            //collection = typeof collection !== 'undefined' ? collection : wdCollections.get_collection().key;
            self = this;


            //self.waypoints[collection]['data']['temp'] = _.cloneDeep(wp);

            Restangular.one('waypoints',collection)
                .customPUT({collection:collection, 
                            key : null,
                            name:wp.name,
                            description:wp.description,
                            urls:wp.urls,
                            tags: wp.tags,
                            geo :wp.geo
                            })
                .then(function(answer){
                    self.waypoints[collection]['data'][answer.id] = wp;
                    self.waypoints[collection]['data'][answer.id]['message'] = "<h4>"+wp.name+"</h4><p>"+wp.tags+"</p>";
                    self.waypoints[collection]['data'][answer.id]['group'] = "markercluster";
                    //delete self.waypoints[collection]['data']['temp'];
                },
                function(msg){
                    $log.error("[add waypoint]: ")
                    $log.error(msg)
                    //delete self.waypoints[collection]['data']['temp'];
                });
        }
    });

}());
