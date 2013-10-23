var DynamoSchema = require('..').Schema;
var DynamoModel = require('..').Model;
var DynamoQuery = require('..').Query;
var chai = require('chai');
var expect = chai.expect;

describe('DynamoModel', function () {

    // a sample schema for all our tests
    var schema = new DynamoSchema({
        id: {
            type: String,
            key: true
        },
        range: {
            type: Number,
            key: 'range'
        },
        attribute1: String,
        attribute2: Number
    });

    describe('SDK method', function () {

        describe('GetItem', function () {
            it('should provide required parameters', function () {
                var model = new DynamoModel('my-table', schema);
                model.dynamodb.getItem = function (params, callback) {
                    expect(params).to.have.property('TableName', 'my-table');
                    expect(params).to.have.property('Key');
                    expect(params.Key).to.have.property('id');
                    expect(params.Key.id).to.have.property('S', 'test');
                };
                model.getItem({ id: 'test' });
            });
            it('should allow custom parameters', function () {
                var model = new DynamoModel('my-table', schema);
                model.dynamodb.getItem = function (params, callback) {
                    expect(params).to.have.property('CustomParameter', 'value');
                };
                model.getItem({ id: 'test' }, { CustomParameter: 'value' });
            });
            it('should map resulting item', function () {
                var model = new DynamoModel('my-table', schema);
                model.dynamodb.getItem = function (params, callback) {
                    callback(null, {
                        Item: schema.mapToDb({ id: 'test', range: 1 })
                    });
                };
                model.getItem({ id: 'test' }, function (err, item) {
                    expect(item).to.have.property('id', 'test');
                    expect(item).to.have.property('range', 1);
                });
            });
            it('should throw if missing key', function () {
                var model = new DynamoModel('my-table', schema);
                expect(function () {
                    model.getItem();
                }).to.throw('key is required');
            });
        });

        describe('PutItem', function () {
            it('should provide required parameters', function () {
                var model = new DynamoModel('my-table', schema);
                model.dynamodb.putItem = function (params, callback) {
                    expect(params).to.have.property('TableName', 'my-table');
                    expect(params).to.have.property('Item');
                    expect(params.Item).to.have.property('id');
                    expect(params.Item.id).to.have.property('S', 'test');
                };
                model.putItem({ id: 'test' });
            });
            it('should allow custom parameters', function () {
                var model = new DynamoModel('my-table', schema);
                model.dynamodb.putItem = function (params, callback) {
                    expect(params).to.have.property('CustomParameter', 'value');
                };
                model.putItem({ id: 'test' }, { CustomParameter: 'value' });
            });
            it('should throw if missing item', function () {
                var model = new DynamoModel('my-table', schema);
                expect(function () {
                    model.putItem();
                }).to.throw('item is required');
            });
        });

        describe('UpdateItem', function () {
            it('should provide required parameters', function () {
                var model = new DynamoModel('my-table', schema);
                model.dynamodb.updateItem = function (params, callback) {
                    expect(params).to.have.property('TableName', 'my-table');
                    expect(params).to.have.property('Key');
                    expect(params.Key).to.have.property('id');
                    expect(params.Key.id).to.have.property('S', 'test');
                    expect(params.Key).to.have.property('range');
                    expect(params.Key.range).to.have.property('N', '1');
                    expect(params).to.have.property('AttributeUpdates');
                    expect(params.AttributeUpdates).to.have.property('attribute1');
                    expect(params.AttributeUpdates.attribute1).to.have.property('Action', 'PUT');
                    expect(params.AttributeUpdates.attribute1).to.have.property('Value');
                    expect(params.AttributeUpdates.attribute1.Value).to.have.property('S', 'abc');
                };
                model.updateItem({ id: 'test', range: 1 }, { attribute1: 'abc' });
            });
            it('should allow custom parameters', function () {
                var model = new DynamoModel('my-table', schema);
                model.dynamodb.updateItem = function (params, callback) {
                    expect(params).to.have.property('CustomParameter', 'value');
                };
                model.updateItem({}, {}, { CustomParameter: 'value' });
            });
            it('should throw if missing key', function () {
                var model = new DynamoModel('my-table', schema);
                expect(function () {
                    model.updateItem();
                }).to.throw('key is required');
            });
            it('should throw if missing updates', function () {
                var model = new DynamoModel('my-table', schema);
                expect(function () {
                    model.updateItem({});
                }).to.throw('updates is required');
            });
        });

        describe('DeleteItem', function () {
            it('should provide required parameters', function () {
                var model = new DynamoModel('my-table', schema);
                model.dynamodb.deleteItem = function (params, callback) {
                    expect(params).to.have.property('TableName', 'my-table');
                    expect(params).to.have.property('Key');
                    expect(params.Key).to.have.property('id');
                    expect(params.Key.id).to.have.property('S', 'test');
                };
                model.deleteItem({ id: 'test', range: 1 }, { attribute1: 'abc' });
            });
            it('should allow custom parameters', function () {
                var model = new DynamoModel('my-table', schema);
                model.dynamodb.deleteItem = function (params, callback) {
                    expect(params).to.have.property('CustomParameter', 'value');
                };
                model.deleteItem({}, { CustomParameter: 'value' });
            });
            it('should throw if missing key', function () {
                var model = new DynamoModel('my-table', schema);
                expect(function () {
                    model.deleteItem();
                }).to.throw('key is required');
            });
        });

        describe('Query', function () {
            it('should provide required parameters', function () {
                var model = new DynamoModel('my-table', schema);
                model.dynamodb.query = function (params, callback) {
                    expect(params).to.have.property('TableName', 'my-table');
                    expect(params).to.have.property('KeyConditions');
                    expect(params.KeyConditions).to.have.property('id');
                    expect(params.KeyConditions.id).to.have.property('S', 'test');
                };
                model.query({ id: 'test', range: 1 });
            });
            it('should allow custom parameters', function () {
                var model = new DynamoModel('my-table', schema);
                model.dynamodb.query = function (params, callback) {
                    expect(params).to.have.property('CustomParameter', 'value');
                };
                model.query({}, { CustomParameter: 'value' });
            });
            it('should throw if missing key', function () {
                var model = new DynamoModel('my-table', schema);
                expect(function () {
                    model.query();
                }).to.throw('key is required');
            });
            it('should return a Query instance', function () {
                var model = new DynamoModel('my-table', schema);
                var query = model.query({ id: 'test', range: 1 });
                expect(query).to.be.an.instanceOf(DynamoQuery);
            });
        });

        describe('Scan', function () {
            it('should provide required parameters', function () {
                var model = new DynamoModel('my-table', schema);
                model.dynamodb.scan = function (params, callback) {
                    expect(params).to.have.property('TableName', 'my-table');
                    expect(params).to.have.property('KeyConditions');
                    expect(params.KeyConditions).to.have.property('id');
                    expect(params.KeyConditions.id).to.have.property('S', 'test');
                };
                model.scan({ id: 'test', range: 1 }, { attribute1: 'abc' });
            });
            it('should allow custom parameters', function () {
                var model = new DynamoModel('my-table', schema);
                model.dynamodb.scan = function (params, callback) {
                    expect(params).to.have.property('CustomParameter', 'value');
                };
                model.scan({}, { CustomParameter: 'value' });
            });
        });

        describe('DescribeTable', function () {
            it('should provide required parameters', function () {
                var model = new DynamoModel('my-table', schema);
                model.dynamodb.describeTable = function (params, callback) {
                    expect(params).to.have.property('TableName', 'my-table');
                };
                model.describeTable();
            });
        });

        describe('CreateTable', function () {
            it('should provide required parameters', function () {
                var model = new DynamoModel('my-table', schema);
                model.dynamodb.createTable = function (params, callback) {
                    expect(params).to.have.property('TableName', 'my-table');
                    expect(params).to.have.property('KeySchema');
                    expect(params.KeySchema).to.have.length(2);
                    expect(params.KeySchema[0]).to.have.property('AttributeName', 'id');
                    expect(params.KeySchema[0]).to.have.property('KeyType', 'HASH');
                    expect(params.KeySchema[1]).to.have.property('AttributeName', 'range');
                    expect(params.KeySchema[1]).to.have.property('KeyType', 'RANGE');
                    expect(params).to.have.property('AttributeDefinitions');
                    expect(params.AttributeDefinitions).to.have.length(2);
                    expect(params.AttributeDefinitions[0]).to.have.property('AttributeName', 'id');
                    expect(params.AttributeDefinitions[0]).to.have.property('AttributeType', 'S');
                    expect(params.AttributeDefinitions[1]).to.have.property('AttributeName', 'range');
                    expect(params.AttributeDefinitions[1]).to.have.property('AttributeType', 'N');
                    expect(params).to.have.property('ProvisionedThroughput');
                    expect(params.ProvisionedThroughput).to.have.property('ReadCapacityUnits',
                                                                          model.defaultThroughput.ReadCapacityUnits);
                    expect(params.ProvisionedThroughput).to.have.property('WriteCapacityUnits',
                                                                          model.defaultThroughput.WriteCapacityUnits);
                };
                model.createTable();
            });
            it('should allow custom parameters', function () {
                var model = new DynamoModel('my-table', schema);
                model.dynamodb.createTable = function (params, callback) {
                    expect(params).to.have.property('CustomParameter', 'value');
                };
                model.createTable({ CustomParameter: 'value' });
            });
            it('should honor model.defaultThroughput ', function () {
                var model = new DynamoModel('my-table', schema);
                model.defaultThroughput = { ReadCapacityUnits: 999, WriteCapacityUnits: 999 };
                model.dynamodb.createTable = function (params, callback) {
                    expect(params.ProvisionedThroughput).to.have.property('ReadCapacityUnits', 999);
                    expect(params.ProvisionedThroughput).to.have.property('WriteCapacityUnits', 999);
                };
                model.createTable({ CustomParameter: 'value' });
            });
        });

        describe('UpdateTable', function () {
            it('should provide required parameters', function () {
                var model = new DynamoModel('my-table', schema);
                model.dynamodb.updateTable = function (params, callback) {
                    expect(params).to.have.property('TableName', 'my-table');
                    expect(params).to.have.property('ProvisionedThroughput');
                };
                model.updateTable();
            });
            it('should allow custom parameters', function () {
                var model = new DynamoModel('my-table', schema);
                model.dynamodb.updateTable = function (params, callback) {
                    expect(params).to.have.property('CustomParameter', 'value');
                };
                model.updateTable({ CustomParameter: 'value' });
            });
        });

        describe('DeleteTable', function () {
            it('should provide required parameters', function () {
                var model = new DynamoModel('my-table', schema);
                model.dynamodb.deleteTable = function (params, callback) {
                    expect(params).to.have.property('TableName', 'my-table');
                };
                model.deleteTable();
            });
            it('should allow custom parameters', function () {
                var model = new DynamoModel('my-table', schema);
                model.dynamodb.deleteTable = function (params, callback) {
                    expect(params).to.have.property('CustomParameter', 'value');
                };
                model.deleteTable({ CustomParameter: 'value' });
            });
        });

    });

    describe('Update operators', function () {
        var model = new DynamoModel('my-table', schema);
        it('should map plain values to the PUT operator', function () {
            var updates = model.parseUpdates({ attribute1: 'value'});
            expect(updates).to.have.property('attribute1');
            expect(updates.attribute1).to.have.property('Action', 'PUT');
            expect(updates.attribute1).to.have.property('Value');
            expect(updates.attribute1.Value).to.have.property('S', 'value');
        });
        it('should map values with native operators', function () {
            var updates = model.parseUpdates({ attribute2: { ADD: 1 } });
            expect(updates).to.have.property('attribute2');
            expect(updates.attribute2).to.have.property('Action', 'ADD');
            expect(updates.attribute2).to.have.property('Value');
            expect(updates.attribute2.Value).to.have.property('N', '1');
        });
        it('should map values with MongoDB-like operators', function () {
            var updates = model.parseUpdates({ $inc: { attribute2: 1 } });
            expect(updates).to.have.property('attribute2');
            expect(updates.attribute2).to.have.property('Action', 'ADD');
            expect(updates.attribute2).to.have.property('Value');
            expect(updates.attribute2.Value).to.have.property('N', '1');
        });
        it('should throw when using unsupported MongoDB operators', function () {
            expect(function () {
                model.parseUpdates({ $rename: { attribute1: 'attributeA' } });
            }).to.throw(/not supported/);
        });
    });

    describe('Conditional operators', function () {
        var model = new DynamoModel('my-table', schema);
        it('should map plain values to the EQ operator', function () {
            var conditions = model.parseConditions({ id: 'abc'});
            expect(conditions).to.have.property('id');
            expect(conditions.id).to.have.property('AttributeValueList');
            expect(conditions.id.AttributeValueList).to.have.length(1);
            expect(conditions.id.AttributeValueList[0]).to.have.property('S', 'abc');
            expect(conditions.id).to.have.property('ComparisonOperator', 'EQ');
        });
        it('should map values with native operators', function () {
            var conditions = model.parseConditions({ range: { GT: 1 }});
            expect(conditions).to.have.property('range');
            expect(conditions.range).to.have.property('AttributeValueList');
            expect(conditions.range.AttributeValueList).to.have.length(1);
            expect(conditions.range.AttributeValueList[0]).to.have.property('N', '1');
            expect(conditions.range).to.have.property('ComparisonOperator', 'GT');
        });
        it('should map values with MongoDB-like operators', function () {
            var conditions = model.parseConditions({ range: { $gte: 1 }});
            expect(conditions).to.have.property('range');
            expect(conditions.range).to.have.property('AttributeValueList');
            expect(conditions.range.AttributeValueList).to.have.length(1);
            expect(conditions.range.AttributeValueList[0]).to.have.property('N', '1');
            expect(conditions.range).to.have.property('ComparisonOperator', 'GE');
        });
        it('should throw when using unsupported MongoDB operators', function () {
            expect(function () {
                model.parseConditions({ range: { $ne: 1 }});
            }).to.throw(/not supported/);
        });
        it('should map values with the BETWEEN operator', function () {
            var conditions = model.parseConditions({ range: { $between: [1, 10] }});
            expect(conditions).to.have.property('range');
            expect(conditions.range).to.have.property('AttributeValueList');
            expect(conditions.range.AttributeValueList).to.have.length(2);
            expect(conditions.range.AttributeValueList[0]).to.have.property('N', '1');
            expect(conditions.range.AttributeValueList[1]).to.have.property('N', '10');
            expect(conditions.range).to.have.property('ComparisonOperator', 'BETWEEN');
        });
    });



});
