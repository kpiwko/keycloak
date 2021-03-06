module.controller('OAuthClientCredentialsCtrl', function($scope, $location, realm, oauth, OAuthClientCredentials, Notifications) {
    $scope.realm = realm;
    $scope.oauth = oauth;

    var required = realm.requiredOAuthClientCredentials;

    for (var i = 0; i < required.length; i++) {
        if (required[i] == 'password') {
            $scope.passwordRequired = true;
        } else if (required[i] == 'totp') {
            $scope.totpRequired = true;
        } else if (required[i] == 'cert') {
            $scope.certRequired = true;
        }
    }

    function randomString(len) {
        var charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var randomString = '';
        for (var i = 0; i < len; i++) {
            var randomPoz = Math.floor(Math.random() * charSet.length);
            randomString += charSet.substring(randomPoz,randomPoz+1);
        }
        return randomString;
    }

    $scope.generateTotp = function() {
        $scope.totp = randomString(5) + '-' + randomString(5) + '-' + randomString(5);
    }

    $scope.changePassword = function() {
        if ($scope.password != $scope.confirmPassword) {
            Notifications.error("Password and confirmation does not match.");
            $scope.password = "";
            $scope.confirmPassword = "";
            return;
        }
        var creds = [
            {
                type : "password",
                value : $scope.password
            }
        ];

        OAuthClientCredentials.update({ realm : realm.id, oauth : oauth.id }, creds,
            function() {
                Notifications.success('The password has been changed.');
                $scope.password = null;
                $scope.confirmPassword = null;
            },
            function() {
                Notifications.error("The password was not changed due to a problem.");
                $scope.password = null;
                $scope.confirmPassword = null;
            }
        );
    };

    $scope.changeTotp = function() {
        var creds = [
            {
                type : "totp",
                value : $scope.totp
            }
        ];

        OAuthClientCredentials.update({ realm : realm.id, oauth : oauth.id }, creds,
            function() {
                Notifications.success('The totp was changed.');
                $scope.totp = null;
            },
            function() {
                Notifications.error("The totp was not changed due to a problem.");
                $scope.totp = null;
            }
        );
    };
    $scope.$watch(function() {
        return $location.path();
    }, function() {
        $scope.path = $location.path().substring(1).split("/");
    });
});

module.controller('OAuthClientListCtrl', function($scope, realm, oauthClients, OAuthClient, $location) {
    $scope.realm = realm;
    $scope.oauthClients = oauthClients;
    $scope.$watch(function() {
        return $location.path();
    }, function() {
        $scope.path = $location.path().substring(1).split("/");
    });
});

module.controller('OAuthClientDetailCtrl', function($scope, realm, oauth, OAuthClient, $location, Dialog, Notifications) {
    $scope.realm = realm;
    $scope.create = !oauth.id;
    if (!$scope.create) {
        $scope.oauth= angular.copy(oauth);
    } else {
        $scope.oauth = {};
        $scope.oauth.webOrigins = [];
        $scope.oauth.redirectUris = [];
    }

    $scope.$watch(function() {
        return $location.path();
    }, function() {
        $scope.path = $location.path().substring(1).split("/");
    });

    $scope.$watch('oauth', function() {
        if (!angular.equals($scope.oauth, oauth)) {
            $scope.changed = true;
        }
    }, true);

    $scope.deleteWebOrigin = function(index) {
        $scope.oauth.webOrigins.splice(index, 1);
    }
    $scope.addWebOrigin = function() {
        $scope.oauth.webOrigins.push($scope.newWebOrigin);
        $scope.newWebOrigin = "";
    }
    $scope.deleteRedirectUri = function(index) {
        $scope.oauth.redirectUris.splice(index, 1);
    }
    $scope.addRedirectUri = function() {
        $scope.oauth.redirectUris.push($scope.newRedirectUri);
        $scope.newRedirectUri = "";
    }

    $scope.save = function() {
        if ($scope.create) {
            OAuthClient.save({
                realm: realm.id
            }, $scope.oauth, function (data, headers) {
                $scope.changed = false;
                var l = headers().location;
                var id = l.substring(l.lastIndexOf("/") + 1);
                $location.url("/realms/" + realm.id + "/oauth-clients/" + id);
                Notifications.success("The oauth client has been created.");
            });
        } else {
            OAuthClient.update({
                realm : realm.id,
                id : oauth.id
            }, $scope.oauth, function() {
                $scope.changed = false;
                oauth = angular.copy($scope.oauth);
                Notifications.success("Your changes have been saved to the oauth client.");
            });
        }
    };

    $scope.reset = function() {
        $scope.oauth = angular.copy(oauth);
        $scope.changed = false;
    };

    $scope.cancel = function() {
        $location.url("/realms/" + realm.id + "/oauth-clients");
    };

    $scope.remove = function() {
        Dialog.confirmDelete($scope.oauth.name, 'oauth', function() {
            $scope.oauth.$remove({
                realm : realm.id,
                id : $scope.oauth.id
            }, function() {
                $location.url("/realms/" + realm.id + "/oauth-clients");
                Notifications.success("The oauth client has been deleted.");
            });
        });
    };


});

module.controller('OAuthClientScopeMappingCtrl', function($scope, $http, realm, oauth, roles, applications, OAuthClientRealmScopeMapping, OAuthClientApplicationScopeMapping, ApplicationRole) {
    $scope.realm = realm;
    $scope.oauth = oauth;
    $scope.realmRoles = angular.copy(roles);
    $scope.selectedRealmRoles = [];
    $scope.selectedRealmMappings = [];
    $scope.realmMappings = [];
    $scope.applications = applications;
    $scope.applicationRoles = [];
    $scope.selectedApplicationRoles = [];
    $scope.selectedApplicationMappings = [];
    $scope.applicationMappings = [];



    $scope.realmMappings = OAuthClientRealmScopeMapping.query({realm : realm.id, oauth : oauth.id}, function(){
        for (var i = 0; i < $scope.realmMappings.length; i++) {
            var role = $scope.realmMappings[i];
            for (var j = 0; j < $scope.realmRoles.length; j++) {
                var realmRole = $scope.realmRoles[j];
                if (realmRole.id == role.id) {
                    var idx = $scope.realmRoles.indexOf(realmRole);
                    if (idx != -1) {
                        $scope.realmRoles.splice(idx, 1);
                        break;
                    }
                }
            }
        }
    });

    $scope.addRealmRole = function() {
        $http.post('/auth-server/rest/saas/admin/realms/' + realm.id + '/oauth-clients/' + oauth.id + '/scope-mappings/realm',
                $scope.selectedRealmRoles).success(function() {
                for (var i = 0; i < $scope.selectedRealmRoles.length; i++) {
                    var role = $scope.selectedRealmRoles[i];
                    var idx = $scope.realmRoles.indexOf($scope.selectedRealmRoles[i]);
                    if (idx != -1) {
                        $scope.realmRoles.splice(idx, 1);
                        $scope.realmMappings.push(role);
                    }
                }
                $scope.selectRealmRoles = [];
            });
    };

    $scope.deleteRealmRole = function() {
        $http.delete('/auth-server/rest/saas/admin/realms/' + realm.id + '/oauth-clients/' + oauth.id +  '/scope-mappings/realm',
            {data : $scope.selectedRealmMappings, headers : {"content-type" : "application/json"}}).success(function() {
                for (var i = 0; i < $scope.selectedRealmMappings.length; i++) {
                    var role = $scope.selectedRealmMappings[i];
                    var idx = $scope.realmMappings.indexOf($scope.selectedRealmMappings[i]);
                    if (idx != -1) {
                        $scope.realmMappings.splice(idx, 1);
                        $scope.realmRoles.push(role);
                    }
                }
                $scope.selectedRealmMappings = [];
            });
    };

    $scope.addApplicationRole = function() {
        $http.post('/auth-server/rest/saas/admin/realms/' + realm.id + '/oauth-clients/' + oauth.id +  '/scope-mappings/applications/' + $scope.targetApp.id,
                $scope.selectedApplicationRoles).success(function() {
                for (var i = 0; i < $scope.selectedApplicationRoles.length; i++) {
                    var role = $scope.selectedApplicationRoles[i];
                    var idx = $scope.applicationRoles.indexOf($scope.selectedApplicationRoles[i]);
                    if (idx != -1) {
                        $scope.applicationRoles.splice(idx, 1);
                        $scope.applicationMappings.push(role);
                    }
                }
                $scope.selectedApplicationRoles = [];
            });
    };

    $scope.deleteApplicationRole = function() {
        $http.delete('/auth-server/rest/saas/admin/realms/' + realm.id + '/oauth-clients/' + oauth.id +  '/scope-mappings/applications/' + $scope.targetApp.id,
            {data : $scope.selectedApplicationMappings, headers : {"content-type" : "application/json"}}).success(function() {
                for (var i = 0; i < $scope.selectedApplicationMappings.length; i++) {
                    var role = $scope.selectedApplicationMappings[i];
                    var idx = $scope.applicationMappings.indexOf($scope.selectedApplicationMappings[i]);
                    if (idx != -1) {
                        $scope.applicationMappings.splice(idx, 1);
                        $scope.applicationRoles.push(role);
                    }
                }
                $scope.selectedApplicationMappings = [];
            });
    };


    $scope.changeApplication = function() {
        $scope.applicationRoles = ApplicationRole.query({realm : realm.id, application : $scope.targetApp.id}, function() {
                $scope.applicationMappings = OAuthClientApplicationScopeMapping.query({realm : realm.id, oauth : oauth.id, targetApp : $scope.targetApp.id}, function(){
                    for (var i = 0; i < $scope.applicationMappings.length; i++) {
                        var role = $scope.applicationMappings[i];
                        for (var j = 0; j < $scope.applicationRoles.length; j++) {
                            var realmRole = $scope.applicationRoles[j];
                            if (realmRole.id == role.id) {
                                var idx = $scope.applicationRoles.indexOf(realmRole);
                                if (idx != -1) {
                                    $scope.applicationRoles.splice(idx, 1);
                                    break;
                                }
                            }
                        }
                    }
                });

            }
        );
    };



});
