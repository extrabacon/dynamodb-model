var naiveCallback = function (err) {
    if (err) throw err;
};

var DynamoQuery = function (model, query) {
    this.params = {};
    if (model) {
        this.model = model;
        this.dynamodb = model.dynamodb;
        this.schema = model.schema;
    }
    if (typeof query === 'string') {
        this.execute = model.dynamodb[query].bind(model.dynamodb);
    } else if (typeof query === 'object') {
        for (var key in query) {
            if (key === 'execute') {
                this.execute = query[key].bind(this.dynamodb);
            } else {
                this[key] = query[key];
            }
        }
    }
};

DynamoQuery.prototype.use = function () {
    for (var i = 0, len = arguments.length; i < len; i++) {
        var name = arguments[i];
        this[name] = DynamoQuery.methods[name].bind(this);
    }
    return this;
};

DynamoQuery.methods = {
    consistentRead: function (enabled) {
        if (typeof enabled === 'undefined') enabled = true;
        this.params.ConsistentRead = enabled;
        return this;
    },
    returnConsumedCapacity: function (enabled) {
        if (typeof enabled === 'undefined') enabled = true;
        this.params.ReturnConsumedCapacity = enabled;
        return this;
    },
    returnItemCollectionMetrics: function (val) {
        if (typeof val === 'undefined' || val === true) {
            this.params.ReturnItemCollectionMetrics = 'SIZE';
        } else if (typeof val === 'string') {
            this.params.ReturnItemCollectionMetrics = val;
        } else {
            this.params.ReturnItemCollectionMetrics = 'NONE';
        }
        return this;
    },
    returnValues: function (val) {
        if (typeof val === 'undefined' || val === true) {
            this.params.ReturnValues = 'ALL_NEW';
        } else if (typeof val === 'string') {
            this.params.ReturnValues = val;
        } else {
            this.params.ReturnValues = 'NONE';
        }
        return this;
    },
    returnOldValues: function (enabled) {
        if (typeof enabled === 'undefined') enabled = true;
        return this.params.returnValues(enabled ? 'ALL_OLD' : 'NONE');
    },
    attributesToGet: function () {
        var attributes = [];
        for (var i = 0, len = arguments.length; i < len; i++) {
            if (Array.isArray(arguments[i])) {
                for (var j = 0, len2 = arguments[i].length; j < len2; j++) {
                    attributes.push(arguments[i][j]);
                }
            } else {
                attributes.push(arguments[i]);
            }
        }
        this.params.AttributesToGet = attributes;
        return this;
    },
    select: function () {
        if (arguments.length > 0) {
            this._attributesToGet(Array.prototype.slice(arguments, 0));
            this.params.Select = 'SPECIFIC_ATTRIBUTES';
        } else if (arguments.length === 1) {
            this.params.Select = arguments[0];
        } else {
            this.params.Select = 'ALL_ATTRIBUTES';
        }
        return this;
    },
    exclusiveStartKey: function (key) {
        this.params.ExclusiveStartKey = this.schema.mapToDb(key);
        return this;
    },
    indexName: function (indexName) {
        this.params.IndexName = indexName;
        return this;
    },
    scanIndexForward: function (enabled) {
        if (typeof enabled === 'undefined') enabled = true;
        this.params.ScanIndexForward = enabled;
        return this;
    },
    limit: function(count) {
        this.params.Limit = count;
        return this;
    },
    count: function (callback) {
        this.params.Select = 'COUNT';
        if (callback) return this.exec(callback);
        return this;
    },
    next: function(callback) {
        if (this.hasMoreData) {
            this.params.ExclusiveStartKey = this.lastEvaluatedKey;
        } else {
            throw new Error('there is no more data to retrieve, last execution did not yield a LastEvaluatedKey');
        }
        if (callback) return this.exec(callback);
        return this;
    }
}

DynamoQuery.prototype._consistentRead = function (enabled) {
    if (typeof enabled === 'undefined') enabled = true;
    this.params.ConsistentRead = enabled;
    return this;
};

DynamoQuery.prototype._returnConsumedCapacity = function (enabled) {
    if (typeof enabled === 'undefined') enabled = true;
    this.params.ReturnConsumedCapacity = enabled;
    return this;
};

DynamoQuery.prototype._returnItemCollectionMetrics = function (val) {
    if (typeof val === 'undefined' || val === true) {
        this.params.ReturnItemCollectionMetrics = 'SIZE';
    } else if (typeof val === 'string') {
        this.params.ReturnItemCollectionMetrics = val;
    } else {
        this.params.ReturnItemCollectionMetrics = 'NONE';
    }
    return this;
};

DynamoQuery.prototype._returnValues = function (val) {
    if (typeof val === 'undefined' || val === true) {
        this.params.ReturnValues = 'ALL_NEW';
    } else if (typeof val === 'string') {
        this.params.ReturnValues = val;
    } else {
        this.params.ReturnValues = 'NONE';
    }
    return this;
};

DynamoQuery.prototype._returnOldValues = function (enabled) {
    if (typeof enabled === 'undefined') enabled = true;
    return this.params.returnValues(enabled ? 'ALL_OLD' : 'NONE');
};

DynamoQuery.prototype._attributesToGet = function () {
    var attributes = [];
    for (var i = 0, len = arguments.length; i < len; i++) {
        if (Array.isArray(arguments[i])) {
            for (var j = 0, len2 = arguments[i].length; j < len2; j++) {
                attributes.push(arguments[i][j]);
            }
        } else {
            attributes.push(arguments[i]);
        }
    }
    this.params.AttributesToGet = attributes;
    return this;
};

DynamoQuery.prototype._select = function () {
    if (arguments.length > 0) {
        this._attributesToGet(Array.prototype.slice(arguments, 0));
        this.params.Select = 'SPECIFIC_ATTRIBUTES';
    } else if (arguments.length === 1) {
        this.params.Select = arguments[0];
    } else {
        this.params.Select = 'ALL_ATTRIBUTES';
    }
    return this;
};

DynamoQuery.prototype._exclusiveStartKey = function (key) {
    this.params.ExclusiveStartKey = this.schema.mapToDb(key);
    return this;
};

DynamoQuery.prototype._indexName = function (indexName) {
    this.params.IndexName = indexName;
    return this;
};

DynamoQuery.prototype._scanIndexForward = function (enabled) {
    if (typeof enabled === 'undefined') enabled = true;
    this.params.ScanIndexForward = enabled;
    return this;
};

DynamoQuery.prototype._limit = function(count) {
    this.params.Limit = count;
    return this;
};

DynamoQuery.prototype._count = function (callback) {
    this.params.Select = 'COUNT';
    if (callback) return this.exec(callback);
    return this;
};

DynamoQuery.prototype._next = function(callback) {
    if (this.hasMoreData) {
        this.params.ExclusiveStartKey = this.lastEvaluatedKey;
    } else {
        throw new Error('there is no more data to retrieve, last execution did not yield a LastEvaluatedKey');
    }
    if (callback) return this.exec(callback);
    return this;
};

/*DynamoQuery.prototype.parallel = function (numberOfSegments) {
    if (isNaN(+numberOfSegments)) throw new Error('invalid value for numberOfSegments');
    this.parallelSegments = numberOfSegments;
    this.params.TotalSegments = numberOfSegments;
};*/

DynamoQuery.prototype.exec = function(callback) {
    if (!this.execute) throw new Error('execute delegate is not set');
    var query = this;
    callback = callback || naiveCallback;

    function execute() {
        query.execute(query.params, function (err, response) {
            if (err) return callback(err);
            if (query.next) {
                // this query supports paging
                query.lastEvaluatedKey = response.LastEvaluatedKey;
                query.hasMoreData = query.lastEvaluatedKey !== null;
            }
            if (typeof query.mapResponse === 'function') {
                callback(null, query.mapResponse(response));
            } else if (query.rawResponse) {
                callback(null, response);
            }
            callback(null, mapResponse(response));
        });
    }

    function mapResponse(response) {
        var result = { response: response };
        var mapFromDb = query.schema.mapFromDb.bind(query.schema);
        if (response.Attributes) {
            result.attributes = mapFromDb(response.Attributes);
        }
        if (response.Count) {
            result.count = response.Count;
        }
        if (response.Item) {
            result.item = mapFromDb(response.Item);
        }
        if (response.Items) {
            result.items = response.Items.map(mapFromDb);
        }
        if (response.LastEvaluatedKey) {
            result.lastEvaluatedKey = mapFromDb(response.LastEvaluatedKey);
        }
        return result;
    }

    if (this.waitForActiveTable) {
        this.model.waitForActiveTable(function (err) {
            if (err) return callback(err);
            execute(callback);
        });
    } else {
        execute(callback);
    }

    return this;
};

module.exports = DynamoQuery;
