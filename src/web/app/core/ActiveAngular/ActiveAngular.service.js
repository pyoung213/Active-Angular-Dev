(function() {
    angular
        .module('activeAngular')
        .provider('ActiveAngular', ActiveAngularBase);

    function ActiveAngularBase() {
        var baseUrl = '';
        var collectionKey = 'items';

        this.setBaseUrl = function(base) {
            baseUrl = base;
        }

        this.setCollectionKey = function(key) {
            collectionKey = key;
        }

        this.$get = function($http, $log, $httpParamSerializerJQLike, activeAngularCache, ActiveArray, ActiveObject, activeAngularConstant, ActiveAngularUtilities) {
            function ActiveAngular(url, options) {
                options = options || {};
                var self = this;


                self.$cache = activeAngularCache.create(options);
                self.$hydrate = options.hydrate;
                self.$edge = $edge;
                self.$get = $get;
                self.$forceGet = $forceGet;
                self.$query = $query;
                self.$forceQuery = $forceQuery;
                self.$expireQueries = $expireQueries;
                self.$save = $save;
                self.$update = $update;
                self.$remove = $remove;
                self.$create = $create;
                self._http = _http;
                self.url = url;
                self._edgeUrl = '';
                self._formatResponse = options.formatResponse;
                self._collectionKey = options.collectionKey || collectionKey;
                self._edges = options.edges;
                self._get = _get;
                self._hydrateCollection = _hydrateCollection;
                self._hideMetadata = _hideMetadata;
                self._hydyrateData = _hydyrateData;
                self._logMismatchError = _logMismatchError;

                function $query(options, reference) {
                    reference = reference || '';
                    if (options) {
                        reference = $httpParamSerializerJQLike(options) + reference
                    }
                    return _get.call(this, options, reference, true);
                }

                function $forceQuery(options, reference) {
                    var self = this;

                    reference = reference || '';
                    if (options) {
                        reference = $httpParamSerializerJQLike(options) + reference
                    }

                    //cleanup options
                    options = ActiveAngularUtilities.stringToObject(options);
                    options = ActiveAngularUtilities.undefinedToObject(options);

                    //create key
                    var key = _valueOrEmpty(self._edgeUrl || options.id) + _valueOrEmpty(options.url) + _valueOrEmpty(reference);
                    key = _.toLower(key);

                    //caching check
                    var cachedItem = self.$cache.get(key);

                    if (!cachedItem) {
                        cachedItem = ActiveArray.decorateArray([], self);
                    }

                    //reference creation.
                    self.$cache.set(key, cachedItem);
                    asyncGetRequest(options, cachedItem, true);
                    return cachedItem;
                }

                function $edge(key, id) {
                    var item = this;
                    if (this instanceof(ActiveObject)) {
                        id = this.id;
                        item = self;
                    }
                    var edge = item._edges[key];
                    var model = edge.model;
                    var url = ActiveAngularUtilities.replaceUrlIdWithOptionsId(item.url, id);
                    model._edgeUrl = url + "/" + ActiveAngularUtilities.removeIdParam(model.url);
                    return model;
                }

                function $get(options, reference) {
                    return _get.call(this, options, reference, false);
                }

                function $forceGet(options, reference) {
                    var self = this;
                    //cleanup options
                    options = ActiveAngularUtilities.stringToObject(options);
                    options = ActiveAngularUtilities.undefinedToObject(options);

                    //create key
                    var key = _valueOrEmpty(self._edgeUrl || options.id) + _valueOrEmpty(options.url) + _valueOrEmpty(reference);
                    key = _.toLower(key);

                    //caching check
                    var cachedItem = self.$cache.get(key);

                    if (!cachedItem) {
                        cachedItem = new ActiveObject({}, self);
                    }

                    //reference creation.
                    self.$cache.set(key, cachedItem);
                    asyncGetRequest(options, cachedItem, false);
                    return cachedItem;
                }

                function $expireQueries() {
                    self.$cache.expireQueries();
                }

                function _get(options, reference, isArray) {
                    var self = this;
                    //cleanup options
                    options = ActiveAngularUtilities.stringToObject(options);
                    options = ActiveAngularUtilities.undefinedToObject(options);

                    //create key
                    var key = _valueOrEmpty(self._edgeUrl || options.id) + _valueOrEmpty(options.url) + _valueOrEmpty(reference);
                    key = _.toLower(key);

                    //caching check
                    var cachedItem = self.$cache.get(key);

                    if (cachedItem && !cachedItem.$isExpired) {
                        cachedItem.$deferPromise.resolve(cachedItem);
                        self._edgeUrl = "";
                        return cachedItem;
                    }
                    if (!cachedItem) {
                        cachedItem = isArray ? ActiveArray.decorateArray([], self) : new ActiveObject({}, self);
                    }

                    //reference creation.
                    self.$cache.set(key, cachedItem);
                    asyncGetRequest(options, cachedItem, isArray);
                    return cachedItem;
                }

                function asyncGetRequest(options, cachedItem, isArray) {
                    self._http('GET', options)
                        .then(function(response) {
                            var data = response.data;

                            var isDataArray = angular.isArray(data);

                            if (isDataArray != isArray) {
                                if (!data[self._collectionKey]) {
                                    return _logMismatchError(response, isDataArray);
                                }
                                cachedItem = _hideMetadata(cachedItem, data);
                                data = _hydrateCollection(data);
                            }

                            data = ActiveAngularUtilities.inheritActiveClass(data, self);

                            if (isDataArray) {
                                _.forEach(data, function(value, key) {
                                    data[key] = _hydyrateData(value);
                                });
                                data = self.$cache.setArray(data);
                            } else {
                                data = _hydyrateData(data);
                            }
                            _.assign(cachedItem, _.omit(data, '$promise', '$deferPromise'));

                            _.forEach(cachedItem, function(item) {
                                if (item.$deferPromise) {
                                    item.$deferPromise.resolve(item);
                                }
                            });
                            cachedItem.$deferPromise.resolve(cachedItem);
                        });
                }

                function $save(options) {
                    var item = this;

                    if (!options) {
                        options = item;
                    }

                    if (options && !options.id) {
                        options.id = item.id;
                    }

                    var oldCopy = angular.copy(item);
                    var savedChanges = _.extend(item, options);
                    self.$cache.set(savedChanges.id, savedChanges);

                    return self._http('PUT', options)
                        .catch(function() {
                            self.$cache.set(oldCopy.id, oldCopy);
                        });
                }

                function $update(options) {
                    var item = this;

                    if (!options) {
                        return;
                    }

                    if (options && !options.id) {
                        options.id = item.id;
                    }

                    var oldCopy = angular.copy(item);
                    var savedChanges = _.extend(item, options);
                    self.$cache.set(savedChanges.id, savedChanges);

                    return self._http('PATCH', options)
                        .catch(function() {
                            self.$cache.set(oldCopy.id, oldCopy);
                        });
                }

                function $remove(options) {
                    var item = this;

                    options = ActiveAngularUtilities.stringToObject(options);
                    options = ActiveAngularUtilities.undefinedToObject(options, item);

                    return self._http('DELETE', options)
                        .then(function(response) {
                            self.$cache.remove(response.data.id);
                            //remove object binding from view.
                            if (!item.$array) {
                                _.forOwn(item, function(_value, key) {
                                    delete item[key]
                                });
                            }
                        });
                }

                function $create(options) {
                    return self._http('POST', options)
                        .then(function(response) {
                            var data = response.data;

                            data = ActiveAngularUtilities.inheritActiveClass(data, self);
                            data = _hydyrateData(data);
                            return data;
                        });
                }

                function _http(method, options) {
                    var self = this;
                    var id = options.id;
                    var edgeUrl = options.url;
                    if (self._edgeUrl) {
                        edgeUrl = self._edgeUrl;
                        self._edgeUrl = "";
                    }
                    options = {
                        method: method,
                        url: edgeUrl || self.url,
                        id: id,
                        data: _.omit(options, 'id', 'url')
                    }

                    //if no id, strip instances of :id
                    if (!options.id || options.id === activeAngularConstant.NO_ID) {
                        options.url = ActiveAngularUtilities.removeIdParam(options.url);
                        delete options.id;
                    }

                    options.url = ActiveAngularUtilities.replaceUrlIdWithOptionsId(options.url, options.id);
                    delete options.id;

                    if (options.method === 'GET' && Object.keys(options.data).length) {
                        options.url += options.url.indexOf('?') == -1 ? '?' : '&';
                        options.url += $httpParamSerializerJQLike(options.data);
                    }

                    options.url = baseUrl + '/' + options.url;

                    return $http(options)
                        .then(function(response) {
                            if (self._formatResponse) {
                                response.data = self._formatResponse(response.data);
                            }
                            return response;
                        });
                }

                function _logMismatchError(response, isArray) {
                    if (isArray) {
                        $log.error(response.config.url + ' Expected an Object and got an Array from server.');
                        return;
                    }
                    $log.error(response.config.url + ' Expected an Array and got an Object from server with collection key ' + self._collectionKey + ' not set.');
                }

                function _hydyrateData(data) {
                    if (!self.$hydrate) {
                        return data;
                    }
                    _.forEach(self.$hydrate, function(value, key) {
                        var edges = self._edges;
                        if (value.key && !data[value.key]) {
                            return;
                        }
                        var valueKey = value.key || key;
                        if (edges && edges[key]) {
                            var model = edges[key].model;
                            data[key] = model.$edge.call(self, valueKey, data.id).$query();
                            return;
                        }
                        data[key] = value.model.$get(data[valueKey]);
                    });
                    return data;
                }

                function _hydrateCollection(collection) {
                    return collection[self._collectionKey];
                }

                function _hideMetadata(ref, data) {
                    _.forEach(data, function(value, key) {
                        if (key !== self._collectionKey) {
                            Object.defineProperty(ref, key, {
                                enumerable: false,
                                value: value
                            });
                        }
                    });
                    return ref;
                }

                function _valueOrEmpty(string) {
                    return string || "";
                }
            }

            return ActiveAngular;
        }
    }
})();
