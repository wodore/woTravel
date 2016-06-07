(function() {
    'use strict';
    var module = angular.module('map');


    module.controller('mapController', function($scope, $mdSidenav, 
                    gaAuthentication, gaAppConfig, $http, $q, $location,
                    $interval, Restangular, gaToast, $timeout, $mdMedia,
                    $mdDialog, $log, mapTiles, moment, Upload, leafletData,
                    mapTrips, wtTransport
                    ) {
        
        // True if screen is greater than md
        $scope.screen_gt_md =  $mdMedia('gt-md'); 
        $scope.$watch(function() { return $mdMedia('gt-md'); }, function(gt_md) {
            $scope.screen_gt_md = gt_md;
          });

        var layers = {
          baselayers: mapTiles.baseLayers
        }

        // start loading trips
        mapTrips.load().then(function(){
            $log.debug("Markers:")
            $log.debug($scope.markers)
            $log.debug("Paths:")
            $log.debug($scope.paths)

        });
        $scope.markers = mapTrips.tripLocations
        $scope.paths = mapTrips.tripPaths
        $scope.trips = mapTrips.trips
        leafletData.getMap('mainMap').then(function(map) {
            $scope.mainMap = map;
            $timeout(function () {
                $log.info("Redraw main map");
                map.invalidateSize();
            });
        });
        angular.extend($scope, {
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
                layers: layers
            });
    $scope.transport = wtTransport;

    $scope.fitMarkers = function(markers,map) {
        $log.debug("[fitMarkers] markers:")
        $log.debug(markers)
        var markersArray = [];
        _.forEach(markers,function(value,key){
            markersArray.push(value);
            });
        $log.debug("[fitMarkers] markersArray:")
        $log.debug(markersArray)
        $log.debug("[fitMarkers] map:")
        $log.debug(map)
        var group = L.featureGroup(markersArray);
        $log.debug("[fitMarkers] group:")
        $log.debug(group)
        //var bounds = group.getBounds()
        var bounds = L.latLngBounds(markersArray);
        $log.debug("[fitMarkers] bounds:")
        $log.debug(bounds)
        map.fitBounds(bounds);
    }

    $scope.customFullscreen = $mdMedia('xs') || $mdMedia('sm');
    $scope.addTripDialog = function(ev,trip) {
        var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'))  && $scope.customFullscreen;
        $scope.viewTrip = trip ? trip : {};
        $log.debug("[addTripDialog] add or edit trip, existing trip:");
        $log.debug($scope.viewTrip);
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
    function addTripController($scope, $mdDialog) {
        $log.info("[addTripController] init");
        $scope.hide = function() {
          $mdDialog.hide();
        };
        $scope.cancel = function() {
          $mdDialog.cancel();
        };
        $scope.save = function() {
          $mdDialog.hide();
        };
        $scope.dialogMap
        leafletData.getMap('locationMapDialog').then(function(map) {
            $scope.dialogMap = map;
            $timeout(function () {
                $log.info("Redraw map");
                if (! _.isEmpty($scope.viewTrip)){
                    $scope.fitMarkers($scope.trip.markers,map);
                }
                map.invalidateSize();
            },500);
        });

        $scope.trip = _.extend({ zoom : _.clone($scope.zoom),
                        center : _.clone($scope.center),
                        defaults : _.clone($scope.defaults),
                        markers : {}
                    } , $scope.viewTrip)
        $scope.markerChange = function(name,marker, locIndex) {
            $log.debug("[markerChange] start");
            $scope.trip.markers[name] = marker;
            var map = $scope.dialogMap;
            map.panTo(marker);
            if (locIndex > 0){
                $log.debug("[markerChange] not the first, markerA:");
                var markerA = _.get($scope.locations,[locIndex-1,'locationRaw','marker'],false)
                $log.debug(markerA);
                if (markerA !== false){
                    $log.debug("[markerChange] startPolyline");
                    var markers = [marker,markerA];
                    var poly= L.polyline(_.cloneDeep(markers)).addTo(map);
                    poly.enableEdit();
                    _.set($scope.locations,[locIndex,'trans_to','waypoints'],poly._latlngs);
                    _.set($scope.locations,[locIndex,'trans_to','locationRaw'],
                    _.get($scope.locations,[locIndex-1,'locationRaw']));
                    //$log.debug(markers);
                    //map.editTools.startPolyline();
                } 
            }
        }

        if ( _.isEmpty($scope.viewTrip)){
            $log.info("New trip, add empty location");
            $scope.locations = [];
        } else {
            $scope.locations = $scope.viewTrip.locations;
            $log.info("View exisiting trip");
            $log.debug($scope.viewTrip);
        }
        $scope.nextLocation = function(input) {
            $log.debug("[nextLocation]: start")
            var len = $scope.locations.length;
            var defaultTrans = wtTransport.list[0];
            if (len > 0){ // NOT first
                $log.debug("[nextLocation]: not first location")
                // Take values from the last location
                var users = _.clone($scope.locations[len-1].fellow_travelers);
                var start_date = _.clone($scope.locations[len-1].end_datetime);
                start_date = moment(start_date).add(1, 'day')._d;        
                var map = _.cloneDeep($scope.locations[len-1].map);
                var trans_start = {locationRaw: _.cloneDeep($scope.locations[len-1].locationRaw),
                        name: _.clone(_.get($scope.locations[len-1],['trans_to','name'],
                                defaultTrans.name))};
                var trans_end = _.cloneDeep(_.get($scope.locations[0],['trans_to']));
                //var trans_to = _.cloneDeep(_.get($scope.locations[0],['trans_from']));
                //var trans_from = {locationRaw: _.cloneDeep($scope.locations[len-1].locationRaw),
                 //       name: _.clone(_.get($scope.locations[len-1],['trans_from','name'],
                  //              defaultTrans.name))};
                $log.debug("[nextLocation]: trans_end:")
                $log.debug(trans_start)
                $log.debug("[nextLocation]: trans_start:")
                $log.debug(trans_end)
                _.set($scope.locations[0],['trans_to',{}])
                //var trans_to_note = $scope.locations[len-1].trans_from.note;
                //var trans_from = wtTransport.list[0].name;
            } else { // FIRST
                $log.info(gaAuthentication.user)
                var users = [gaAuthentication.user.fellow_traveler]
                var start_date = undefined
                var map = { zoom : _.clone($scope.zoom),
                            center : _.clone($scope.center),
                            defaults : _.clone($scope.defaults)
                            }
                map.defaults.scrollWheelZoom = false;
                //map.defaults.zoomControl = false;
                    //zoomControl : false
                var trans_start = _.clone(defaultTrans)
                var trans_end = _.clone(defaultTrans);
                //var trans_to_note = "";
            }
            var mapMini = { zoom : 12,
                        center : map.center,
                        defaults : _.cloneDeep(map.defaults)
                   }
            mapMini.defaults.zoomControl = false;
            mapMini.defaults.attributionControl = false;
            _.set(mapMini,['defaults','controls','layers','visible'], false);
            
            $scope.locations.push({fellow_travelers:users,
                  start_datetime : start_date,
                  end_datetime : start_date,
                  expenses:[{}],
                  map : map,
                  mapMini : mapMini,
                  //trans_to_name : trans_to,
                  trans_to: trans_start,
                  //trans_from_name : trans_from,
                  trans_from: trans_end
              })
            $log.debug("Default location");
            $log.debug($scope.locations);
            $scope.editLocation(len);
        }
        $location.hash("");
        $scope.editLocation = function(index) {
            var len = $scope.locations.length
            if (index >= len){
                $log.warn("[editLocation] index out of range");
                return false
            }
            _.forEach($scope.locations,function(value,i,locs){
                if (i === index){
                    locs[i].edit = true;
                } else {
                    locs[i].edit = false;
                }
            });
            if ($location.hash() !== "editLocation"+index) {
                $location.hash( "editLocation"+index);
            } else {
                $anchorScroll();
            }
        }
        if ( _.isEmpty($scope.viewTrip)){
            $scope.nextLocation()
        }

        // loc - current location object
        // path - path name to add the new markers ( _.set(loc,path) )
        // mapID - id of the map
        // markers - object to add markers (which are shown on the map)
        $scope.addWaypoints = function(loc,path,mapID,markers,map) {
            $log.debug("[addWaypoints] start");
            if (_.get(loc,path,false) === false){
                $log.debug("[addWaypoints] waypoint does not exists yet");
                _.set(loc,'waypointsPoly',map.editTools.startPolyline(markers));
                var poly = _.get(loc,'waypointsPoly');
                $log.debug( poly );
                _.set(loc,path,poly._latlngs);
                $log.debug( _.get(loc,path));
            } else {
                $log.debug("[addWaypoints] waypoint does exists");
                var poly = _.get(loc,'waypointsPoly');
                poly.enableEdit();
                $log.debug( poly );
            }
        }
        $scope.stopDrawing = function(loc,path,mapID,markers,map) {
            $log.debug("[stopDrawing] start");
            //if (!_.get(loc,'waypointsPoly',false)){ _.set(loc,path,[]); }
            var poly = _.get(loc,'waypointsPoly');
            poly.disableEdit();
            $log.debug(poly);
            //map.editTools.stopDrawing();
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
        $scope.loadExpenseTypes = function(){
            if ( !$scope.expenseTypes ){
                Restangular.all('expense_types').getList({size:500}).then(function(types) {
                    $scope.expenseTypes = types;
                });
            } else {
                return true;
            }
        }
        $scope.loadExpenseTypes()

        $scope.sumExpenses = function(expenses) {
            return _.sumBy(expenses,'amount');
        }

        $scope.queryFellowTravelerSearch =  function(qry){
            var deferred = $q.defer();
            Restangular.all('fellow_travelers/suggestions').getList({q:qry,size:15}).then(function(users) {
                $log.debug("Suggestion result")
                $log.debug(users)
                if (users){
                    deferred.resolve(users);
                } else {
                    deferred.resolve([{name: qry}]);
                }
            });
            return deferred.promise;
        };
        $scope.imageSuggestions = {};
        $scope.loadUserImages =  function(qry){
            $log.debug("[loadUserImages] start");
            Restangular.one('fellow_travelers/social').one(qry)
                    .get({size:20})
                    .then(function(data) {
                $log.debug("[loadUserImages] result");
                $log.debug(data);
                $scope.imageSuggestions[qry] = data.images;
            },function(msg) {
                $log.warn("[loadUserImages] error");
                $log.warn(msg);
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
            if (_.has(expenses[expenses.length-1],'amount')){
                expenses.push({});
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
        $scope.fellowTravelFocus = function(ev,users){
            $log.debug(ev)
            var index = angular.element(ev.path[0]).controller('mdChips').selectedChip;
            $log.debug(users[index]);
            $scope.editUser = true;
            $scope.editUserIndex = index;
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
            trip = _.cloneDeep(trip);
            locs = _.cloneDeep(locs);
            $log.debug("[saveTrip] start");
            $log.debug("[saveTrip] trip info");
            $log.debug(trip);
            // prepare data for server
            _.forEach(locs,function(v,i){
                locs[i].name = _.get(locs,[i,'locationRaw','name'],"No Name");
                locs[i].country = _.get(locs,[i,'locationRaw','country'],"");
                locs[i].country_code = _.get(locs,[i,'locationRaw','country_code'],"");
                locs[i].lat = _.get(locs,[i,'locationRaw','marker','lat'],"");
                locs[i].lon = _.get(locs,[i,'locationRaw','marker','lng'],"");
                _.forEach(locs[i].expenses,function(V,I,C){
                    $log.debug(V);
                    C[I].type = _.get(V,['type','key'],null);
                });
                _.remove(locs[i].expenses,locs[i].expenses.length-2);
                // TODO
                //var trans_to = _.get(locs,[i,'trans_to_name'],"none");
                //_.set(locs[i],['trans_to','name'],trans_to) ;
                //_.set(locs[i],['trans_to','icon'],wtTransport.listNameKeys[trans_to].icon) ;
                //var trans_from = _.get(locs,[i,'trans_from_name'],"none");
                //_.set(locs[i],['trans_from','name'],trans_from) ;
                //_.set(locs[i],['trans_from','icon'],wtTransport.listNameKeys[trans_from].icon) ;
                var trans_to = _.cloneDeep(_.pick(_.get(locs[i],['trans_to']),['name','waypoints']));
                _.set(locs[i],['trans_to'],trans_to) ;
                var trans_from = _.cloneDeep(_.pick(_.get(locs[i],['trans_from']),['name','waypoints']));
                _.set(locs[i],['trans_from'],trans_from) ;
            });
            trip.locations = locs;
            if (!_.has(trip,"name")){
                if (_.has(locs,[0,"name"])){
                    var name = _.get(locs,[0,"name"]);
                    if (locs.length > 1){
                        var name = name+" to "+_.get(locs,[locs.length -1,"name"]);
                    }
                } else {
                    var name ="No Name";
                }
                trip.name = name;
            }
            $log.debug("[saveTrip] send the following data to the server");
            $log.debug(trip);
            Restangular.one('trips',_.get(trip,"key","new"))
                .customPUT(trip).then(function(res){
                    $log.debug("[saveTrip] SAVED");
                    mapTrips.load({newer:mapTrips.timestamp, offset:-40});
                    $mdDialog.hide();
                });
        }


    }


    });
}());
