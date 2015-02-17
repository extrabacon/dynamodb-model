var async = require('async');
var AWS = require('aws-sdk');
var DynamoQuery = require('./query');
var defaultThroughput = { read: 10, write: 5 };
var tableCache = {};

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

    this.dynamodb = new AWS.DynamoDB(options || {});
    this.tableName = tableName;
    this.schema = schema;
};

DynamoModel.prototype.getItem = function (key, callback) {
    if (!key) throw new Error('key is required');

    var query = new DynamoQuery(this, {
        params: {
            TableName: this.tableName,
            Key: this.schema.mapToDb(key)
        },
        waitForActiveTable: true,
        execute: this.dynamodb.getItem
    }).use('select', 'attributesToGet', 'consistentRead', 'returnConsumedCapacity');

    return callback ? query.exec(callback) : query;
};

DynamoModel.prototype.putItem = function (conditions, item, callback) {
    if (!conditions || typeof conditions === 'function') throw new Error('item is required');
    if (!item) {
        item = conditions;
        conditions = null;
    } else if (typeof item === 'function') {
        callback = item;
        item = conditions;
        conditions = null;
    }

    var query = new DynamoQuery(this, {
        params: {
            TableName: this.tableName,
            Expected: this.parseExpectations(conditions),
            Item: this.schema.mapToDb(item)
        },
        waitForActiveTable: true,
        execute: this.dynamodb.putItem
    }).use('returnConsumedCapacity', 'returnItemCollectionMetrics');
    query.returnValues = DynamoQuery.methods.returnOldValues;

    return callback ? query.exec(callback) : query;
};

DynamoModel.prototype.updateItem = function (key, conditions, updates, callback) {
    if (!key || typeof conditions === 'function') throw new Error('key is required');
    if (!conditions || typeof conditions === 'function') throw new Error('updates is required');
    if (!updates) {
        updates = conditions;
        conditions = null;
    } else if (typeof updates === 'function') {
        callback = updates;
        updates = conditions;
        conditions = null;
    }

    var query = new DynamoQuery(this, {
        params: {
            TableName: this.tableName,
            Key: this.schema.mapToDb(key),
            AttributeUpdates: this.parseUpdates(updates),
            Expected: this.parseExpectations(conditions)
        },
        waitForActiveTable: true,
        execute: this.dynamodb.updateItem
    }).use('returnConsumedCapacity', 'returnItemCollectionMetrics', 'returnValues');

    return callback ? query.exec(callback) : query;
};

DynamoModel.prototype.deleteItem = function (key, conditions, callback) {
    if (!key || typeof conditions === 'function') throw new Error('key is required');
    if (typeof conditions === 'function') {
        callback = conditions;
        conditions = null;
    }

    var query = new DynamoQuery(this, {
        params: {
            TableName: this.tableName,
            Key: this.schema.mapToDb(key),
            Expected: this.parseExpectations(conditions)
        },
        waitForActiveTable: true,
        execute: this.dynamodb.deleteItem
    }).use('returnConsumedCapacity', 'returnItemCollectionMetrics', 'returnValues');

    return callback ? query.exec(callback) : query;
};

DynamoModel.prototype.query = function (key, callback) {
    if (!key || typeof key === 'function') throw new Error('key is required');

    var query = new DynamoQuery(this, {
        params: {
            TableName: this.tableName,
            KeyConditions: this.parseConditions(key)
        },
        waitForActiveTable: true,
        execute: this.dynamodb.query
    }).use(
        'attributesToGet', 'consistentRead', 'exclusiveStartKey', 'indexName', 'limit', 'returnConsumedCapacity',
        'scanIndexForward', 'select', 'next'
    );

    return callback ? query.exec(callback) : query;
};

DynamoModel.prototype.scan = function (conditions, callback) {
    if (typeof conditions === 'function') {
        callback = conditions;
        conditions = null;
    }

    var query = new DynamoQuery(this, {
        params: {
            TableName: this.tableName,
            ScanFilter: this.parseConditions(conditions)
        },
        waitForActiveTable: true,
        execute: this.dynamodb.scan
    }).use('attributesToGet', 'exclusiveStartKey', 'limit', 'returnConsumedCapacity', 'select', 'next');

    return callback ? query.exec(callback) : query;
};

DynamoModel.prototype.describeTable = function (callback) {
    var query = new DynamoQuery(this, {
        params: { TableName: this.tableName },
        execute: this.dynamodb.describeTable
    });
    return callback ? query.exec(callback) : query;
};

DynamoModel.prototype.createTable = function(throughput, callback) {
    if (typeof throughput == 'function') {
        callback = throughput;
        throughput = null;
    }
    var schema = this.schema;
    var query = new DynamoQuery(this, {
        params: {
            TableName: this.tableName,
            KeySchema: mapToArray(schema.keys, function (name, val) {
                return { AttributeName: name, KeyType: val };
            }),
            AttributeDefinitions: mapToArray(schema.keys, function (name, val) {
                return { AttributeName: name, AttributeType: schema.attributes[name] };
            }),
            ProvisionedThroughput: {
                ReadCapacityUnits: (throughput || defaultThroughput).read,
                WriteCapacityUnits: (throughput || defaultThroughput).write
            }
        },
        execute: this.dynamodb.createTable
    });
    return callback ? query.exec(callback) : query;
};

DynamoModel.prototype.updateTable = function (throughput, callback) {
    if (typeof throughput == 'function') {
        callback = throughput;
        throughput = null;
    }
    var query = new DynamoQuery(this, {
        params: {
            TableName: this.tableName,
            ProvisionedThroughput: {
                ReadCapacityUnits: (throughput || defaultThroughput).read,
                WriteCapacityUnits: (throughput || defaultThroughput).write
            }
        },
        waitForActiveTable: true,
        execute: this.dynamodb.updateTable
    });
    return callback ? query.exec(callback) : query;
};

DynamoModel.prototype.deleteTable = function (callback) {
    var query = new DynamoQuery(this, {
        params: { TableName: this.tableName },
        waitForActiveTable: true,
        execute: this.dynamodb.deleteTable
    });
    return callback ? query.exec(callback) : query;
};

DynamoModel.prototype.waitForActiveTable = function (pollingTimeout, callback) {
    if (typeof pollingTimeout === 'function') {
        callback = pollingTimeout;
        pollingTimeout = null;
    }
    pollingTimeout = pollingTimeout || 3000;
    callback = callback || function () {};

    var self = this;

    function getTableDescription(callback) {
        self.describeTable(function (err, res) {
            if (err) {
                if (err.code === 'ResourceNotFoundException') {
                    return callback();
                } else {
                    return callback(err);
                }
            } else {
                callback(null, res.response.Table);
            }
        });
    }

    function createTableOnce(callback) {
        getTableDescription(function (err, tableDescription) {
            if (err) return callback(err);
            if (!tableDescription) {
                self.createTable(function (err, res) {
                    if (err) return callback(err);
                    callback(null, res.response.TableDescription);
                });
            } else {
                callback(null, tableDescription);
            }
        });
    }

    function waitUntilActive(tableDescription, callback) {
        async.until(function () {
            return tableDescription.TableStatus === 'ACTIVE';
        }, function (done) {
            setTimeout(function () {
                self.describeTable(function (err, res) {
                    if (err) return callback(err);
                    tableDescription = res.response.Table;
                    done();
                });
            }, pollingTimeout);
        }, callback);
    }

    var table = tableCache[self.tableName];

    if (!table) {
        table = { status: 'querying', pendingCallbacks: [callback] };
        tableCache[self.tableName] = table;
        async.waterfall([createTableOnce, waitUntilActive], function (err) {
            table.status = 'finished';
            table.error = err;
            // fire pending callbacks
            for (var i = 0, len = table.pendingCallbacks.length; i < len; i++) {
                table.pendingCallbacks[i](err);
            }
            delete table.pendingCallbacks;
        });
    } else if (table.status === 'finished') {
        return callback(table.error);
    } else {
        table.pendingCallbacks.push(callback);
    }
};

DynamoModel.prototype.parseExpectations = function (conditions) {
    if (!conditions) return null;
    var result = {};
    var mappedConditions = this.schema.mapToDb(conditions);

    pairs(conditions).forEach(function (pair) {
        var key = pair[0];
        var value = pair[1];
        var operator;

        if (typeof value === 'object') {
            var val = pairs(value);
            if (val.length === 1) {
                operator = val[0][0];
                value = val[0][1];
            }
            if (operator === '$exists') {
                result[key] = {
                    Exists: value ? 'true' : 'false'
                };
            } else if (operator) {
                throw new Error('element query operator "' + operator + '" is not supported');
            } else {
                throw new Error('element query operator is missing');
            }
        } else {
            result[key] = { Value: mappedConditions[key] };
        }
    });
    return result;
};

DynamoModel.prototype.parseConditions = function (conditions) {
    if (!conditions) return null;
    var result = {};
    var schema = this.schema;

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
         } else if (operator === '$in') {
            operator = 'IN';
        } else if (/^\$/.test(operator)) {
            throw new Error('conditional operator "' + operator + '" is not supported');
        }

        var values = [];

        if (operator === 'BETWEEN') {
            if (!(Array.isArray(value) && value.length === 2)) {
                throw new Error('BETWEEN operator must have an array of two elements as the comparison value');
            }
            values.push(schema.mappers[key].mapToDb(value[0]));
            values.push(schema.mappers[key].mapToDb(value[1]));
        } else if (operator === 'IN' && Array.isArray(value)) {
            for (var i = 0; i < value.length; i++) {
                values.push(schema.mappers[key].mapToDb(value[i]));
            };
        } else if (Array.isArray(value)) {
            throw new Error('this operator does not support array values');
        } else {
            values.push(schema.mappers[key].mapToDb(value));
        }

        result[key] = {
            AttributeValueList: values,
            ComparisonOperator: operator
        };
    });
    return result;
};

DynamoModel.prototype.parseUpdates = function (updates) {
    if (!updates) return null;
    var schema = this.schema;

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
                if (!schema.mappers.hasOwnProperty(pair[0])) {
                    throw new Error('unknown field: ' + pair[0]);
                }
                mapper = schema.mappers[pair[0]];
                result[pair[0]] = {
                    Action: action,
                    Value: mapper.mapToDb(pair[1])
                };
            });
            return result;
        }

        if (!schema.mappers.hasOwnProperty(key)) {
            throw new Error('unknown field: ' + key);
        }
        mapper = schema.mappers[key];

        if (typeof value === 'object' && !(value instanceof Array)) {
            var val = pairs(value);
            if (val.length === 1) {
                result[key] = {
                    Action: val[0][0],
                    Value: mapper.mapToDb(val[0][1])
                };
            } else {
                throw new Error('value is expected to contain only one key');
            }
        } else {
            result[key] = {
                Action: 'PUT',
                Value: schema.mappers[key].mapToDb(value)
            };
        }

        return result;
    });
};

module.exports = DynamoModel;
