(function() {
    'use strict'

    angular
        .module('app.web')
        .service('comments', comments);

    function comments(ActiveAngular, users) {
        var options = {
            hydrate: {
                author: {
                    model: users
                }
            }
        };
        return new ActiveAngular('comments/:id', options);
    }
})();
