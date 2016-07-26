(function() {
    'use strict';
    var module = angular.module('map');


    module.controller('mapController', function($scope, $mdSidenav, 
                    gaAuthentication, gaAppConfig, $http, $q, $location,
                    $interval, Restangular, gaToast, $timeout, $mdMedia,
                    $mdDialog, $log, mapTiles, moment, Upload, leafletData,
                    mapTrips, wtTransport, wtFellowTravelers, wtExpenseTypes,
                    mapFn, ISO3166
                    ) {
        
        // start loading trips
        mapTrips.load().then(function(){
            //$log.debug("Markers:")
            //$log.debug($scope.markers)
            //$log.debug("Paths:")
            //$log.debug($scope.paths)
        });
        $scope.markers = mapTrips.markers
        $scope.paths = mapTrips.tripPaths
        $scope.trips = mapTrips.trips
        leafletData.getMap('mainMap').then(function(map) {
            $scope.mainMap = map;
            mapFn.setMap('main', map);
            $timeout(function () {
                $log.info("Redraw main map");
                map.invalidateSize();
            });
        });
    // add map settings to the scope:
    // center, defaults, evenets, layers, watchOptions
    angular.extend($scope, mapTiles.settings);
    $scope.transport = wtTransport;
    $scope.mapFn = mapFn; // gives accesss to all map functions

    /////////////////////////////////////////////////////////////////
    /////                                                                 
    /////     D I A L O G
    /////
    /////////////////////////////////////////////////////////////////
    $scope.customFullscreen = $mdMedia('xs') || $mdMedia('sm');
    $scope.addTripDialog = function(ev,trip) {
        var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'))  && $scope.customFullscreen;
        $scope.viewTrip = trip ? trip : mapTrips.newTrip({edit:true});
        $log.debug("[addTripDialog] add or edit trip, existing trip:");
        //$log.debug($scope.viewTrip);
        $mdDialog.show({
          controller: addTripController,
          templateUrl: '/p/modules/map/layout/addTrip.client.dialog.html',
          parent: angular.element(document.body),
          targetEvent: ev,
          scope : $scope,
          clickOutsideToClose:false,
          preserveScope: true,
          fullscreen: useFullScreen
        })
        .then(function(answer) {
          $scope.status = 'You said the information was "' + answer + '".';
        }, function() {
          $scope.status = 'You cancelled the dialog.';
        });
        $scope.$watch(function() {
          return $mdMedia('xs') || $mdMedia('sm');
        }, function(wantsFullScreen) {
          $scope.customFullscreen = (wantsFullScreen === true);
        });
      };
      /////////////////////////////////
      //// DIALOG CONTROLLER
    function addTripController($scope, $mdDialog) {
        $log.info("[addTripController] init");
        $scope.dialogMap
        leafletData.getMap('locationMapDialog').then(function(map) {
            $scope.dialogMap = map;
            $timeout(function () {
                $log.info("Redraw dialog map");
                if ( _.has($scope,'viewTrip.markers.lat')){
                    $log.info("fit Markers");
                    $log.info($scope.viewTrip.markers);
                    // TODO does not work ??
                    mapFn.fitMarkers($scope.viewTrip.markers, $scope.dialogMap);
                }
                map.invalidateSize();
            },500);
        });
        $scope.trip = _.extend({ zoom : _.clone($scope.zoom),
                        center : _.clone($scope.center),
                        defaults : _.clone($scope.defaults),
                        markers : {}
                    } , $scope.viewTrip)
        $scope.locations = $scope.trip.locations;
        //$scope.markerChange = function(name,marker, locIndex) {
            //$log.debug("[markerChange] start");
            //if ( ! _.has(trip,'locations')){
            //$scope.trip.markers[name] = marker;
            //var map = $scope.dialogMap;
            //map.panTo(marker);
            //if (locIndex > 0){
                //$log.debug("[markerChange] not the first, markerA:");
                ////var markerA = _.get($scope.locations,[locIndex-1,'locationRaw','marker'],false)
                //$log.debug(markerA);
                //if (markerA !== false){
                    //$log.debug("[markerChange] startPolyline");
                    //var markers = [marker,markerA];
                    //var poly= L.polyline(_.cloneDeep(markers)).addTo(map);
                    //poly.enableEdit();
                    //_.set($scope.locations,[locIndex,'trans_start','waypoints'],poly._latlngs);
                    //_.set($scope.locations,[locIndex,'trans_start','locationRaw'],
                            //_.get($scope.locations,[locIndex-1,'locationRaw']));
                    //$log.debug(markers);
                    //map.editTools.startPolyline();
                //} 
            //}
        //}

        $scope.transportChange = function(loc, trans, options) {
            $log.debug("[transportChange] location changed");
            var o = typeof options !== 'undefined' ? options : {};
            _.defaults(o,{map: false,
                    setMarkerA : false,
                    setMarkerB : false,
                    updateLoc : false,
                    updateTrans : false})
            if (o.updateLoc){
                _.set(loc,'name',_.get(loc,['locationRaw','name'],
                    _.get(loc,'name',"")));
                _.set(loc,'country', _.get(loc,['locationRaw','country'],
                    _.get(loc,'country',"")));
                _.set(loc,'country_code', _.get(loc,['locationRaw','country_code'],
                    _.get(loc,'country_code',"")));
                $scope.destroyCountrycodes(loc);
                //_.set(loc,'lat', _.get(loc,['locationRaw','marker','lat'],
                    //_.get(loc,'lat',"")));
                //_.set(loc,'lon', _.get(loc,['locationRaw','marker','lng'],
                    //_.get(loc,'lon',"")));
                var oldMarkerA = _.get(loc,['geo'],false);
                _.set(loc,'geo', _.get(loc,['locationRaw','marker'],
                    _.get(loc,'geo',{})));
            }

            if (o.updateTrans){
                _.set(trans,'name',_.get(trans,['locationRaw','name'],
                    _.get(trans,'name',"")));
                var oldMarkerB = _.get(trans,['geo'],false);
                _.set(trans,'geo', _.get(trans,['locationRaw','marker'],
                    _.get(trans,'geo',{})));
            }

            var markerA = _.get(loc,['geo'],false);
            var markerB = _.get(trans,['geo'],false);
            if ( o.setMarkerA  && markerA  !== false){
                $scope.trip.markers[mapFn.nameFromMarker(markerA)] = markerA;
            }
            if ( o.setMarkerB  && markerB  !== false){
                $scope.trip.markers[mapFn.nameFromMarker(markerB)] = markerB;
            }
            if ( markerA === false || markerB === false){
                // nothing happens
                $log.warn("[transportChange] one of the marker is not set");
                $log.warn(markerA);
                $log.warn(markerB);
                if (_.get(o,'map') && markerA !== false){
                    o.map.panTo(markerA);
                }
                if (_.get(o,'map') && markerB !== false){
                    o.map.panTo(markerB);
                }
                return false
            } else {
                var markers = [markerA,markerB];
                var poly= L.polyline(markers)
                if (_.get(o,'map')){
                    if(_.get(trans,['poly'],false) !== false){
                        o.map.removeLayer(_.get(trans,['poly']));
                        $log.debug("[transportChange] remove old poly");
                        $log.debug(trans.poly);
                    }  
                    poly.addTo(o.map);
                    poly.enableEdit();
                    mapFn.fitMarkers(markers,o.map);
                }
                _.set(trans,['waypoints'],poly._latlngs);
                _.set(trans,['poly'],poly);
            }
        }
        $scope.loadCountrycodes = function(){
            $scope.countryCodes = ISO3166.countryCodes;
        } 
        $scope.destroyCountrycodes = function(loc){
            $scope.countryCodes = [_.get(loc,'country_code',"")];
        } 


        if ( _.isEmpty($scope.viewTrip)){
            $log.info("New trip, add empty location");
            //$scope.locations = [];
        } else {
            //$scope.locations = $scope.viewTrip.locations;
            $log.info("View exisiting trip");
            $log.debug($scope.viewTrip);
        }
        $scope.nextLocation = function(input) {
            var loc = mapTrips.newLocation($scope.trip) 
            $scope.editLocation($scope.trip,loc)
        }

        $location.hash("");
        $scope.editLocation = function(trip,loc) {
            var index = mapTrips.editLocation(trip,loc); 
            if ($location.hash() !== "editLocation"+index) {
                $location.hash( "editLocation"+index);
            } else {
                $anchorScroll();
            }
            // run it at least one time
            $scope.newExpense(loc.expenses);
        }

        $scope.moveLocation = function(index,step) {
            var indexA = index;
            var indexB = index+step;
            var tmp = _.cloneDeep($scope.locations[indexA]);
            _.assignDelete($scope.locations[indexA],$scope.locations[indexB]);
            _.assignDelete($scope.locations[indexB],tmp);
            if ($location.hash() !== "viewLocation"+indexB) {
                $location.hash( "viewLocation"+indexB);
            } else {
                $anchorScroll();
            }
        }
        $scope.expenseTypes = wtExpenseTypes.types;
        //$scope.loadExpenseTypes()

        $scope.sumExpenses = function(expenses) {
            return _.sumBy(expenses,'amount');
        }

        $scope.queryFellowTravelerSearch =  wtFellowTravelers.query
        $scope.imageSuggestions = {};
        $scope.loadUserImages =  function(qry){
            wtFellowTravelers.queryImages(qry).then(function(images) {
                $scope.imageSuggestions[qry] = images;
            });
        }

        $scope.uploadAvatar =  function(files,traveler){
            $log.debug("[uploadAvatar] files")
            var userKey = gaAuthentication.user.key
            var name = traveler.name;
            if (_.has(traveler,'key')){
                var uid = traveler.key
            } else {
                var uid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                        return v.toString(16); });
            }
            var upload = Upload.upload({
                    url: 'api/v1/upload/'+userKey+'/'+uid+'.jpg',
                    data: { file: files, //$scope.avatar, 
                            link: 'private',
                            type: 'image/jpeg'}
                });
                upload.then(function (response) {
                    $log.debug("[uploadAvatar] file uploaded");
                    $log.debug(response);
                    //var link = response.data.private_links[0];
                    traveler.avatar_url = _.cloneDeep(response.data.private_links[0]);
                }, function (response) {
                    if (response.status > 0) {
                        $scope.errorMsg = response.status + ': ' + response.data;
                    }
                }, function (evt) {
                    $log.info(evt) //TODO why does this not work?
                    $scope.avatarLoaded = evt.loaded;
                    //$scope.avatar.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
                });
        }

        $scope.newExpense = function(expenses){
            $log.debug(expenses)
            if ( _.get(expenses[expenses.length-1],'amount',"") !== ""){
                expenses.push({amount:""});
            }
        }
        $scope.removeExpense = function(expenses,index){
            _.remove(expenses, function(v,i) {
                return i === index;
            });
        }
        $scope.blurExpense = function(expenses,index){
            if (!_.get(expenses[index],'amount',false) && index !== expenses.length-1){
                $scope.removeExpense(expenses,index);
            }
        }
        $scope.editUserIndex = 0;
        $scope.fellowTravelerFocus = function(chip,users){
            $log.debug("Chip Focus");
            $log.debug(chip);
            //var index = angular.element(ev.path[0])
                        //.controller('mdChips').selectedChip;
            $scope.editUser = true;
            $scope.selectedTraveler = chip;
        }

        var oldTravelers = []
        $scope.fellowTravelerChanged = function(chip, newTravelers){
            $log.warn("Fellow traveler list changed");
            $log.debug(chip);
            $log.warn(newTravelers);
            $log.warn(oldTravelers);

            $scope.editUser=false
            oldTravelers = newTravelers;
            if (!_.has(chip,'key')){
                $log.debug("Update chip")
                $log.debug(chip)
                wtFellowTravelers.addOnline(chip)
                    .then(function(res){
                        $log.debug("New chip")
                        $log.debug(res)
               });
            } else {
                $log.debug("No update")
                $log.debug(chip)

            }
        }

        $scope.changeDate = function(loc){
            $log.debug("change start date");
            if (!loc.end_datetime){
                loc.end_datetime=loc.start_datetime;
            }
            if (!loc.start_datetime){
                loc.start_datetime=loc.end_datetime;
            }
        }

        $scope.saveTrip = function(trip,locs){
            //trip = _.cloneDeep(trip);
            //locs = _.cloneDeep(locs);
            $log.debug("[saveTrip] start");
            $log.debug("[saveTrip] trip info");
            $log.debug(trip);

            var locationProperties = ['name','description','avatar_url',
                'lat','lon','geo',
                'country','country_code', 'start_datetime','end_datetime',
                'pictures','fellow_travelers','key','id'];
            var newLocs = [];
            var newTrip = {};
            $mdDialog.hide();

            // prepare data for server
            _.forEach(locs,function(loc,i){
                newLocs[i] = _.pick(loc,locationProperties);
                newLocs[i].start_datetime = _.get(loc,'start_datetime',"").toJSON();
                newLocs[i].end_datetime = _.get(loc,'end_datetime',"").toJSON();
                //newLocs[i].name = _.get(loc,['locationRaw','name'],
                    //_.get(locs,'name','No Name'));
                //newLocs[i].country = _.get(loc,['locationRaw','country'],
                    //_.get(locs,'country',""));
                //newLocs[i].country_code = _.get(loc,['locationRaw','country_code'],
                    //_.get(locs,'country_code',""));
                //newLocs[i].lat = _.get(loc,['locationRaw','marker','lat'],"");
                //newLocs[i].lon = _.get(loc,['locationRaw','marker','lng'],"");
                //_.remove(locs[i].expenses,locs[i].expenses.length-2);
                //delete loc.expenses[loc.expenses.length-2];
                //newLocs[i].expenses = _.cloneDeep(loc.expenses);
                newLocs[i].expenses = []
                _.forEach(loc.expenses,function(exp,expKey,exps){
                    var expNew = _.pick(exp,['name','note','amount']);
                    if (expNew.amount !== ""){
                        expNew.type = _.get(expNew,['type','key'],null);
                        newLocs[i].expenses.push(expNew);
                    }

                });

                // TODO
                var trans_start = _.pick(_.get(loc,['trans_start']),['type', 'name','note']);
                var trans_start_waypoints = [];
                _.forEach(_.get(loc,['trans_start','waypoints'],[]),
                    function(marker,mKey,transTo){
                    trans_start_waypoints.push({lat:_.clone(marker.lat),
                                lng:_.clone(marker.lng)});
                    });
                trans_start.waypoints = trans_start_waypoints;
                //trans_start.name = _.get(trans_start,'name','');
                _.set(newLocs[i],['trans_start'],trans_start) ;

                var trans_end = _.pick(_.get(loc,['trans_end']),['type','name','note']);
                var trans_end_waypoints = [];
                _.forEach(_.get(loc,['trans_end','waypoints'],[]),
                    function(marker,mKey,transFrom){
                    trans_end_waypoints.push({lat:_.clone(marker.lat),
                                            lng:_.clone(marker.lng)});
                    });
                //trans_end.name = _.get(trans_end,'name','');
                trans_end.waypoints = trans_end_waypoints;
                _.set(newLocs[i],['trans_end'],trans_end) ;

            });
            newTrip.locations = newLocs;

            newTrip.key = _.get(trip,'key','new');

            if (_.get(trip,"name","") === ""){
                if (_.has(newLocs,[0,"name"])){
                    var name = _.get(newLocs,[0,"name"]);
                    if (newLocs.length > 1){
                        var name = name+" to "+_.get(newLocs,[newLocs.length -1,"name"]);
                    }
                } else {
                    var name ="No Name";
                }
                newTrip.name = name;
            } else {
                newTrip.name = trip.name;
            }
            // TODO sort locaton
            // TODO save date to trip
            $log.debug("[saveTrip] send the following data to the server");
            $log.debug(newTrip);
            Restangular.one('trips',_.get(trip,"key","new"))
                .customPUT(newTrip).then(function(res){
                    $log.debug("[saveTrip] SAVED");
                    //mapTrips.load({newer:mapTrips.timestamp, offset:-40});
                    $mdDialog.hide();
                    mapTrips.update().then(function(){
                        $log.debug("[saveTrip]: trip update from server, remove 'new' from trips");
                        _.remove(mapTrips.trips.data['new'])
                    });
                });
        }


        $scope.cancelTrip = function(){
            delete $scope.trip;
            $mdDialog.hide();
        }


    }


    });
}());
