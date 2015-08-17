var async = require('async');
// var AWS = require('aws-sdk');
var DynamoQuery = require('./query');

function mapToArray(source, fn) {
    var result = [];
    for (var key in source) {
        result.push(fn(key, source[key], source));
    }
    return result;
}

function mapToObject(source, fn) {
    var result = {};
    for (var key in source) {
        var r = fn(key, source[key], source);
        for (var resultKey in r) {
            result[resultKey] = r[resultKey];
        }
    }
    return result;
}

function pairs(source) {
    var result = [];
    for (var key in source) {
        result.push([key, source[key]]);
    }
    return result;
}

var DynamoModel = function (tableName, schema, options) {

    if (!tableName) throw new Error('tableName is required');
    if (!schema) throw new Error('schema is required');

    var instance = this;
    var tableStatus = 'undefined';
    var tableStatusPendingCallbacks = [];

    options = options || {};
    this.dynamodb = new AWS.DynamoDB(options);
    this.consistentRead = false;
    this.defaultThroughput = {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 5
    };

    this.tableName = tableName;
    this.schema = schema;
    this.options = options;

    modelInstances[tableName] = this; 

    // a default callback making sure errors are not lost
    function defaultCallback(err) {
        if (err) throw err;
    }

    DynamoModel.prototype.changeAWSObject = function (_AWS, options) {
        options = options || {};

        this.dynamodb = new _AWS.DynamoDB(options);
    }

    DynamoModel.prototype.getItem = function (key, options, callback) {
        if (!key) throw new Error('key is required');
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        callback = callback || defaultCallback;

        var params = options || {};
        params.TableName = this.tableName;
        params.Key = this.schema.mapToDb(key);
        if (this.consistentRead) params.ConsistentRead = true;
        var privateSchema = this.schema;

        this.ensureActiveTable(function (err) {
            if (err) return callback(err);
            return instance.dynamodb.getItem(params, function (err, response) {
                if (err) return callback(err);
                return callback(null, privateSchema.mapFromDb(response.Item), response);
            });
        });
    };

    DynamoModel.prototype.putItem = function (item, options, callback) {
        if (!item) throw new Error('item is required');
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        callback = callback || defaultCallback;

        var params = options || {};
        params.TableName = this.tableName;
        params.Item = this.schema.mapToDb(item);
        var privateSchema = this.schema;

        this.ensureActiveTable(function (err) {
            if (err) return callback(err);
            instance.dynamodb.putItem(params, function (err, response) {
                if (err) return callback(err);
                callback(null, privateSchema.mapFromDb(response.Attributes), response);
            });
        });
    };

    DynamoModel.prototype.updateItem = function (key, updates, options, callback) {
        if (!key) throw new Error('key is required');
        if (!updates) throw new Error('updates is required');
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        callback = callback || defaultCallback;

        var params = options || {};
        params.TableName = this.tableName;
        params.Key = this.schema.mapToDb(key);
        params.AttributeUpdates = this.parseUpdates(updates);

        this.ensureActiveTable(function (err) {
            if (err) return callback(err);
            instance.dynamodb.updateItem(params, callback);
        });
    };

    DynamoModel.prototype.deleteItem = function (key, options, callback) {
        if (!key) throw new Error('key is required');
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        callback = callback || defaultCallback;

        var params = options || {};
        params.TableName = this.tableName;
        params.Key = this.schema.mapToDb(key);

        this.ensureActiveTable(function (err) {
            if (err) return callback(err);
            instance.dynamodb.deleteItem(params, callback);
        });
    };

    DynamoModel.prototype.query = function (key, options, callback) {
        if (!key) throw new Error('key is required');
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        var params = options || {};
        params.TableName = this.tableName;
        params.KeyConditions = this.parseConditions(key);
        if (this.consistentRead) params.ConsistentRead = true;

        var query = new DynamoQuery('query', this.schema, this, params);
        if (callback) return query.exec(callback);
        return query;
    };

    DynamoModel.prototype.scan = function (filter, options, callback) {
        if (typeof filter === 'function') {
            callback = filter;
            options = {};
            filter = null;
        }
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        var params = options || {};
        params.TableName = this.tableName;
        if (filter) {
            params.ScanFilter = this.parseConditions(filter);
        }

        var query = new DynamoQuery('scan', this.schema, this, params);
        if (callback) return query.exec(callback);
        return query;
    };

    DynamoModel.prototype.describeTable = function (options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        var params = options || {};
        params.TableName = this.tableName;
        return this.dynamodb.describeTable(params, callback);
    };

    DynamoModel.prototype.createTable = function(options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        var privateSchema = this.schema;
        var params = options || {};
        params.TableName = this.tableName;
        params.KeySchema = mapToArray(this.schema.keys, function (name, val) {
            return { AttributeName: name, KeyType: val };
        });
        params.AttributeDefinitions = mapToArray(this.schema.keys, function (name, val) {
            return { AttributeName: name, AttributeType: privateSchema.attributes[name] };
        });
        params.ProvisionedThroughput = params.ProvisionedThroughput || this.defaultThroughput;

        return this.dynamodb.createTable(params, callback);
    };

    DynamoModel.prototype.updateTable = function (options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        var params = options || {};
        params.TableName = this.tableName;
        params.ProvisionedThroughput = params.ProvisionedThroughput || this.defaultThroughput;
        return this.dynamodb.updateTable(params, callback);
    };

    DynamoModel.prototype.deleteTable = function (options, callback) {
        var params = options || {};
        params.TableName = this.tableName;
        return this.dynamodb.deleteTable(params, callback);
    };

    DynamoModel.prototype.ensureActiveTable = function (callback) {
        if (tableStatus === 'undefined') {
            tableStatus = 'querying';
            if (callback) tableStatusPendingCallbacks.push(callback);
            this.waitForActiveTable(function (err, response) {
                tableStatus = { error: err, response: response };
                // fire all pending callbacks
                for (var i = 0; i < tableStatusPendingCallbacks.length; i++) {
                    tableStatusPendingCallbacks[i](err);
                }
                tableStatusPendingCallbacks = [];
            });
        } else if (tableStatus === 'querying' && callback) {
            // already querying table status, add callback to queue
            tableStatusPendingCallbacks.push(callback);
        } else {
            return callback(tableStatus.error);
        }
    };

    DynamoModel.prototype.waitForActiveTable = function (pollingTimeout, callback) {
        if (typeof pollingTimeout === 'function') {
            callback = pollingTimeout;
            pollingTimeout = null;
        }
        callback = callback || function () {};
        pollingTimeout = pollingTimeout || 3000;

        async.waterfall([
            function getTableDescription(callback) {
                instance.describeTable(function (err, response) {
                    if (err) {
                        if (err.code === 'ResourceNotFoundException') {
                            // table does not exist, create it now
                            instance.createTable(function (err, response) {
                                if (err) return callback(err);
                                callback(null, response.TableDescription);
                            });
                        } else {
                            return callback(err);
                        }
                    } else {
                       callback(null, response.Table);
                    }
                });
            },
            function pollUntilActive(tableDescription, callback) {
                async.until(function () {
                    return tableDescription.TableStatus === 'ACTIVE';
                }, function (callback) {
                    setTimeout(function () {
                        instance.describeTable(function (err, response) {
                            if (err) return callback(err);
                            tableDescription = response.Table;
                            callback();
                        });
                    }, pollingTimeout);
                }, function (err) {
                    if (err) return callback(err);
                    callback(null, tableDescription);
                });
            }
        ], callback);
    };

    DynamoModel.prototype.parseConditions = function(conditions) {
        var inst = this;
        var result = {};

        pairs(conditions).forEach(function (pair) {

            var key = pair[0];
            var value = pair[1];
            var operator = 'EQ';

            if (typeof value === 'object') {
                var val = pairs(value);
                if (val.length === 1) {
                    operator = val[0][0];
                    value = val[0][1];
                }
            }

            if (operator === '$gt') {
                operator = 'GT';
            } else if (operator === '$gte') {
                operator = 'GE';
            } else if (operator === '$lt') {
                operator = 'LT';
            } else if (operator === '$lte') {
                operator = 'LE';
            } else if (operator === '$begins') {
                operator = 'BEGINS_WITH';
            } else if (operator === '$between') {
                operator = 'BETWEEN';
            } else if (/^\$/.test(operator)) {
                throw new Error('conditional operator "' + operator + '" is not supported');
            }

            console.log(operator + ', ' + key + ', ' + value);

            var values = [];

            if (operator === 'BETWEEN') {
                if (!(Array.isArray(value) && value.length === 2)) {
                    throw new Error('BETWEEN operator must have an array of two elements as the comparison value');
                }
                values.push(inst.schema.mappers[key].mapToDb(value[0]));
                values.push(inst.schema.mappers[key].mapToDb(value[1]));
            } else if (Array.isArray(value)) {
                throw new Error('this operator does not support array values');
            } else {
                values.push(inst.schema.mappers[key].mapToDb(value));
            }

            result[key] = {
                AttributeValueList: values,
                ComparisonOperator: operator
            };

        });
        return result;
    }

    DynamoModel.prototype.parseUpdates = function(updates) {
        var inst = this;

        return mapToObject(updates, function (key, value) {

            var result = {};
            var mapper;

            // look for a MongoDB-like operator and translate to its DynamoDB equivalent
            if (/^\$/.test(key)) {
                var action;
                if (key === '$set') action = 'PUT';
                if (key === '$unset') action = 'DELETE';
                if (key === '$inc') action = 'ADD';
                if (!action) {
                    throw new Error('update operator "' + key + '" is not supported');
                }
                pairs(value).forEach(function (pair) {
                    if (!inst.schema.mappers.hasOwnProperty(pair[0])) {
                        throw new Error('unknown field: ' + pair[0]);
                    }
                    mapper = inst.schema.mappers[pair[0]];
                    if (action == 'DELETE') {
                        result[pair[0]] = {
                            Action: action
                        };
                    } else {
                        result[pair[0]] = {
                            Action: action,
                            Value: mapper.mapToDb(pair[1])
                        };
                    }
                });
                
                return result;
            }

            if (!inst.schema.mappers.hasOwnProperty(key)) {
                throw new Error('unknown field: ' + key);
            }
            mapper = inst.schema.mappers[key];

            if (typeof value === 'object' && typeof value.getTime != 'function' && !(value instanceof Array)) {
                var val = pairs(value);
                if (val.length === 1) {
                    result[key] = {
                        Action: val[0][0],
                        Value: mapper.mapToDb(val[0][1])
                    };
                } else {
                    result[key] = {
                        Action: 'PUT',
                        Value: inst.schema.mappers[key].mapToDb(value)
                    };
                }
            } else {
                result[key] = {
                    Action: 'PUT',
                    Value: inst.schema.mappers[key].mapToDb(value)
                };
            }

            return result;
        });
    }

    // make sure the table is available as soon as possible
    this.ensureActiveTable();

};

module.exports = DynamoModel;