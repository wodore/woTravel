(function() {
    'use strict';
    var module = angular.module('admin');

    module.controller('AdminAppConfigController', function($scope, Restangular, _, gaToast, gaAppConfig,$log) {
        Restangular.one('config').get().then(function(cfg) {
            $scope.cfg = cfg;
            var opt = _.pickBy(cfg, function(prop, name) {
                return _.startsWith(name, 'auth_');
            });
            $scope.authOptions = {};
            _.map(opt,function(value,key){
                var type = propertyType(key);
                var name = $scope.getAuthName(key);
                _.set($scope.authOptions,[name,type,'value'],value);
                _.set($scope.authOptions,[name,type,'name'],name);
                _.set($scope.authOptions,[name,type,'title'],propertyTypeText(key));
                _.set($scope.authOptions,[name,'title'],_.capitalize(name));
                _.set($scope.authOptions,[name,type,'key'],key);
            });
            $log.debug($scope.authOptions);

        });

        var propertyType= function(key) {
            if ( _.endsWith(key, '_secret')){
                return "secret"
            }
            if ( _.endsWith(key, '_id')){
                return "id"
            }
            if ( _.endsWith(key, '_icon')){
                return "icon"
            }
            return ""
        };

        var propertyTypeText = function(key) {
            var type = propertyType(key);
            if ( type === 'secret'){
                return "Secret Key"
            }
            if ( type === 'id'){
                return "Public ID"
            }
            if ( type === 'icon'){
                return "Icon"
            }
            return ""
        };

        $scope.getAuthName = function(str) {
            return str.replace('_id', '').replace('_secret', '').replace('auth_', '').replace('_icon', '');
        };

        $scope.save = function() {
            $scope.cfg.save().then(function() {
                _.extend(gaAppConfig, $scope.cfg);
                gaToast.show('Application configuration was successfully saved.');
                $scope.appConfigForm.$setPristine();
            });

            $log.debug("[appConfig:save] expenseTypes:")
            var newTypes = _.differenceWith($scope.expenseTypes,
                    expenseTypesOld,
                    function(newVal,oldVal){
                        return (newVal.name === oldVal.name
                            && newVal.description === oldVal.description
                            && newVal.icon_url === oldVal.icon_url
                            && newVal.icon_name === oldVal.icon_name);
                    });
            //var newTypes = _.differenceWith(expenseTypesOld,$scope.expenseTypes,
             //                               _.isEqual);
            $log.debug(newTypes);
            _.forEach(newTypes, function(value, key) {
                value.save();
            });
            //$scope.expenseTypes.save()
        };

        //======================================================
        // EXPENSE TYPES

        var expenseTypesOld;
        Restangular.all('expense_types').getList({size:500}).then(function(types) {
            $log.debug("[appConfig:epense_types] results:")
            $log.debug(types)
            $scope.expenseTypes = types;
            expenseTypesOld = _.cloneDeep(types);
        });

        $scope.addExpenseType = function() {
            var newType = $scope.expenseTypes[0].clone();
            newType.name = "";
            newType.description = "";
            newType.icon_name = "";
            newType.icon_url = "";
            newType.id = "";
            newType.key = false;
            $scope.expenseTypes.push(newType);
        }
        $scope.removeExpenseType = function(type) {
            type.remove();
            type.name = false
        }

    });

}());
