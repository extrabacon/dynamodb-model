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
        attribute2: Number,
        attribute3: [Number],
        attribute4: [String]
    });

    // mock the "waitForActiveTable" method
    DynamoModel.prototype.waitForActiveTable = function (callback) {
        this.waitedForActiveTable = true;
        callback && callback();
    };

    function createTestModel() {
        var model = new DynamoModel('my-table', schema);
        // mock AWS functionality
        function mockedMethod(params, callback) {
            // simply callback with an empty reponse
            return callback(null, {});
        }
        model.dynamodb = {
            getItem: mockedMethod,
            putItem: mockedMethod,
            updateItem: mockedMethod,
            deleteItem: mockedMethod,
            query: mockedMethod,
            scan: mockedMethod,
            describeTable: mockedMethod,
            createTable: mockedMethod,
            updateTable: mockedMethod,
            deleteTable: mockedMethod
        };
        return model;
    }

    describe('DynamoModel.getItem(key)', function () {
        it('should generate a valid AWS request', function (done) {
            var model = createTestModel();
            model.dynamodb.getItem = function (params, callback) {
                expect(params).to.have.property('TableName', 'my-table');
                expect(params).to.have.property('Key');
                expect(params.Key).to.have.property('id');
                expect(params.Key.id).to.have.property('S', 'test');
                done();
            };
            model.getItem({ id: 'test' }).exec();
        });
        it('should return a valid query', function () {
            var query = createTestModel().getItem({ id: 'test' });
            expect(query).to.be.an.instanceof(DynamoQuery);
            expect(query).to.respondTo('select');
            expect(query).to.respondTo('attributesToGet');
            expect(query).to.respondTo('consistentRead');
            expect(query).to.respondTo('returnConsumedCapacity');
        });
        it('should map resulting item', function (done) {
            var model = createTestModel();
            model.dynamodb.getItem = function (params, callback) {
                callback(null, {
                    Item: schema.mapToDb({ id: 'test', range: 1 })
                });
            };
            model.getItem({ id: 'test' }, function (err, result) {
                expect(result).to.have.property('item');
                expect(result.item).to.have.property('id', 'test');
                expect(result.item).to.have.property('range', 1);
                done();
            });
        });
        it('should throw if missing key', function () {
            var model = createTestModel();
            expect(function () {
                model.getItem();
            }).to.throw('key is required');
        });
        it('should have checked for an active table', function () {
            var model = createTestModel();
            model.getItem({ id: 'test' }).exec();
            expect(model).to.have.property('waitedForActiveTable', true);
        });
    });

    describe('DynamoModel.putItem(conditions, item)', function () {
        it('should generate a valid AWS request', function (done) {
            var model = createTestModel();
            model.dynamodb.putItem = function (params, callback) {
                expect(params).to.have.property('TableName', 'my-table');
                expect(params).to.have.property('Item');
                expect(params.Item).to.have.property('id');
                expect(params.Item.id).to.have.property('S', 'test');
                expect(params).to.have.property('Expected');
                expect(params.Expected).to.have.property('attribute1');
                expect(params.Expected.attribute1).to.have.property('Value');
                expect(params.Expected.attribute1.Value).to.have.property('S', 'some value');
                done();
            };
            model.putItem({ attribute1: 'some value' }, { id: 'test' }).exec();
        });
        it('should work without conditions', function (done) {
            var model = createTestModel();
            model.dynamodb.putItem = function (params, callback) {
                expect(params).to.have.property('Item');
                expect(params.Item).to.have.property('id');
                expect(params.Item.id).to.have.property('S', 'test');
                expect(params).to.have.property('Expected', null);
                done();
            };
            model.putItem({ id: 'test' }).exec();
        });
        it('should return a valid query', function () {
            var query = createTestModel().putItem({ id: 'test' });
            expect(query).to.be.an.instanceof(DynamoQuery);
            expect(query).to.respondTo('returnConsumedCapacity');
            expect(query).to.respondTo('returnItemCollectionMetrics');
            expect(query).to.respondTo('returnValues');
        });
        it('should throw if missing item', function () {
            var model = createTestModel();
            expect(function () {
                model.putItem();
            }).to.throw('item is required');
        });
        it('should have checked for an active table', function () {
            var model = createTestModel();
            model.putItem({ id: 'test' }).exec();
            expect(model).to.have.property('waitedForActiveTable', true);
        });

        describe('Conditional operators', function () {

        });
    });

    describe('DynamoModel.updateItem(key, conditions, updates)', function () {
        it('should generate a valid AWS request', function (done) {
            var model = createTestModel();
            model.dynamodb.updateItem = function (params, callback) {
                expect(params).to.have.property('TableName', 'my-table');
                expect(params).to.have.property('Key');
                expect(params.Key).to.have.property('id');
                expect(params.Key.id).to.have.property('S', 'test');
                expect(params).to.have.property('Expected');
                expect(params.Expected).to.have.property('attribute1');
                expect(params.Expected.attribute1).to.have.property('Value');
                expect(params.Expected.attribute1.Value).to.have.property('S', 'abc');
                expect(params).to.have.property('AttributeUpdates');
                expect(params.AttributeUpdates).to.have.property('attribute1');
                expect(params.AttributeUpdates.attribute1).to.have.property('Action', 'PUT');
                expect(params.AttributeUpdates.attribute1).to.have.property('Value');
                expect(params.AttributeUpdates.attribute1.Value).to.have.property('S', 'def');
                done();
            };
            model.updateItem({ id: 'test' }, { attribute1: 'abc' }, { attribute1: 'def' }).exec();
        });
        it('should work without conditions', function (done) {
            var model = createTestModel();
            model.dynamodb.updateItem = function (params, callback) {
                expect(params).to.have.property('Key');
                expect(params).to.have.property('Expected', null);
                expect(params).to.have.property('AttributeUpdates');
                done();
            };
            model.updateItem({ id: 'test' }, { attribute1: 'def' }).exec();
        });
        it('should return a valid query', function () {
            var query = createTestModel().updateItem({ id: 'test' }, { attribute1: 'test' });
            expect(query).to.be.an.instanceof(DynamoQuery);
            expect(query).to.respondTo('returnConsumedCapacity');
            expect(query).to.respondTo('returnItemCollectionMetrics');
            expect(query).to.respondTo('returnValues');
        });
        it('should throw if missing key', function () {
            var model = createTestModel();
            expect(function () {
                model.updateItem();
            }).to.throw('key is required');
        });
        it('should throw if missing updates', function () {
            var model = createTestModel();
            expect(function () {
                model.updateItem({});
            }).to.throw('updates is required');
        });
        it('should have checked for an active table', function () {
            var model = createTestModel();
            model.updateItem({ id: 'test' }, { attribute1: 'def' }).exec();
            expect(model).to.have.property('waitedForActiveTable', true);
        });

        describe('Conditional operators', function () {

        });

        describe('Update operators', function () {
            var model = createTestModel();
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
            it('should map NS array value to the PUT operator', function () {
                var updates = model.parseUpdates({ attribute3: ['value']});
                expect(updates).to.have.property('attribute3');
                expect(updates.attribute3).to.have.property('Action', 'PUT');
                expect(updates.attribute3).to.have.property('Value');
                expect(updates.attribute3.Value).to.have.property('NS').that.is.an('array');
            });
            it('should map SS array value to the PUT operator', function () {
                var updates = model.parseUpdates({ attribute4: ['value']});
                expect(updates).to.have.property('attribute4');
                expect(updates.attribute4).to.have.property('Action', 'PUT');
                expect(updates.attribute4).to.have.property('Value');
                expect(updates.attribute4.Value).to.have.property('SS').that.is.an('array');
            });
        });
    });

    describe('DynamoModel.deleteItem(key, conditions)', function () {
        it('should generate a valid AWS request', function (done) {
            var model = createTestModel();
            model.dynamodb.deleteItem = function (params, callback) {
                expect(params).to.have.property('TableName', 'my-table');
                expect(params).to.have.property('Key');
                expect(params.Key).to.have.property('id');
                expect(params.Key.id).to.have.property('S', 'test');
                expect(params).to.have.property('Expected');
                expect(params.Expected).to.have.property('attribute1');
                expect(params.Expected.attribute1).to.have.property('Value');
                expect(params.Expected.attribute1.Value).to.have.property('S', 'abc');
                done();
            };
            model.deleteItem({ id: 'test' }, { attribute1: 'abc' }).exec();
        });
        it('should work without conditions', function (done) {
            var model = createTestModel();
            model.dynamodb.deleteItem = function (params, callback) {
                expect(params).to.have.property('Key');
                expect(params).to.have.property('Expected', null);
                done();
            };
            model.deleteItem({ id: 'test'}).exec();
        });
        it('should return a valid query', function () {
            var query = createTestModel().deleteItem({ id: 'test' });
            expect(query).to.be.an.instanceof(DynamoQuery);
            expect(query).to.respondTo('returnConsumedCapacity');
            expect(query).to.respondTo('returnItemCollectionMetrics');
            expect(query).to.respondTo('returnValues');
        });
        it('should throw if missing key', function () {
            var model = createTestModel();
            expect(function () {
                model.deleteItem();
            }).to.throw('key is required');
        });
        it('should have checked for an active table', function () {
            var model = createTestModel();
            model.deleteItem({ id: 'test' }).exec();
            expect(model).to.have.property('waitedForActiveTable', true);
        });

        describe('Conditional operators', function () {

        });
    });

    describe('DynamoModel.query(key)', function () {
        it('should generate a valid AWS request', function (done) {
            var model = createTestModel();
            model.dynamodb.query = function (params, callback) {
                expect(params).to.have.property('TableName', 'my-table');
                expect(params).to.have.property('KeyConditions');
                expect(params.KeyConditions).to.have.property('id');
                expect(params.KeyConditions.id).to.have.property('AttributeValueList');
                expect(params.KeyConditions.id.AttributeValueList).to.have.length(1);
                expect(params.KeyConditions.id.AttributeValueList[0]).to.have.property('S', 'test');
                expect(params.KeyConditions.id).to.have.property('ComparisonOperator', 'EQ');
                done();
            };
            model.query({ id: 'test' }).exec();
        });
        it('should return a valid query', function () {
            var query = createTestModel().query({ id: 'test' });
            expect(query).to.be.an.instanceof(DynamoQuery);
            ['attributesToGet', 'consistentRead', 'exclusiveStartKey', 'indexName', 'limit',
            'returnConsumedCapacity', 'scanIndexForward', 'select', 'next'].forEach(function (method) {
                expect(query).to.respondTo(method);
            });
        });
        it('should throw if missing key', function () {
            var model = createTestModel();
            expect(function () {
                model.query();
            }).to.throw('key is required');
        });
        it('should return a Query instance', function () {
            var model = createTestModel();
            var query = model.query({ id: 'test', range: 1 });
            expect(query).to.be.an.instanceOf(DynamoQuery);
        });
        it('should have checked for an active table', function () {
            var model = createTestModel();
            model.query({ id: 'test' }).exec();
            expect(model).to.have.property('waitedForActiveTable', true);
        });

        describe('Conditional operators', function () {
            var model = createTestModel();
            it('should map plain values to the EQ operator', function (done) {
                model.dynamodb.query = function (params, callback) {
                    var conditions = params.KeyConditions;
                    expect(conditions).to.have.property('id');
                    expect(conditions.id).to.have.property('AttributeValueList');
                    expect(conditions.id.AttributeValueList).to.have.length(1);
                    expect(conditions.id.AttributeValueList[0]).to.have.property('S', 'abc');
                    expect(conditions.id).to.have.property('ComparisonOperator', 'EQ');
                    done();
                };
                model.query({ id: 'abc'}).exec();
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

    describe('DynamoModel.scan(conditions)', function () {
        it('should generate a valid AWS request', function (done) {
            var model = createTestModel();
            model.dynamodb.scan = function (params, callback) {
                expect(params).to.have.property('TableName', 'my-table');
                expect(params).to.have.property('ScanFilter');
                expect(params.ScanFilter).to.have.property('id');
                expect(params.ScanFilter.id).to.have.property('AttributeValueList');
                expect(params.ScanFilter.id.AttributeValueList).to.have.length(1);
                expect(params.ScanFilter.id.AttributeValueList[0]).to.have.property('S', 'test');
                expect(params.ScanFilter.id).to.have.property('ComparisonOperator', 'EQ');
                done();
            };
            model.scan({ id: 'test' }).exec();
        });
        it('should work without conditions', function (done) {
            var model = createTestModel();
            model.dynamodb.scan = function (params, callback) {
                expect(params).to.have.property('ScanFilter', null);
                done();
            };
            model.scan().exec();
        });
        it('should return a valid query', function () {
            var query = createTestModel().query({ id: 'test' });
            expect(query).to.be.an.instanceof(DynamoQuery);
            expect(query).to.respondTo('attributesToGet');
            expect(query).to.respondTo('exclusiveStartKey');
            expect(query).to.respondTo('limit');
            expect(query).to.respondTo('returnConsumedCapacity');
            expect(query).to.respondTo('select');
            expect(query).to.respondTo('next');
        });
        it('should have checked for an active table', function () {
            var model = createTestModel();
            model.scan().exec();
            expect(model).to.have.property('waitedForActiveTable', true);
        });

        describe('Conditional operators', function () {

        });
    });

    describe('DynamoModel.describeTable()', function () {
        it('should generate a valid AWS request', function (done) {
            var model = createTestModel();
            model.dynamodb.describeTable = function (params, callback) {
                expect(params).to.have.property('TableName', 'my-table');
                done();
            };
            model.describeTable().exec();
        });
        it('should return a valid query', function () {
            var query = createTestModel().describeTable();
            expect(query).to.be.an.instanceof(DynamoQuery);
        });
        it('should not have checked for an active table', function () {
            var model = createTestModel();
            model.describeTable().exec();
            expect(model).to.not.have.property('waitedForActiveTable');
        });
    });

    describe('DynamoModel.createTable(throughtput)', function () {
        it('should generate a valid AWS request', function (done) {
            var model = createTestModel();
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
                expect(params.ProvisionedThroughput).to.have.property('ReadCapacityUnits', 50);
                expect(params.ProvisionedThroughput).to.have.property('WriteCapacityUnits', 10);
                done();
            };
            model.createTable({ read: 50, write: 10 }).exec();
        });
        it('should work with default throughput values', function () {
            var model = createTestModel();
            model.dynamodb.createTable = function (params, callback) {
                expect(params.ProvisionedThroughput).to.have.property('ReadCapacityUnits', 10);
                expect(params.ProvisionedThroughput).to.have.property('WriteCapacityUnits', 5);
            };
            model.createTable().exec();
        });
        it('should return a valid query', function () {
            var query = createTestModel().createTable();
            expect(query).to.be.an.instanceof(DynamoQuery);
        });
        it('should not have checked for an active table', function () {
            var model = createTestModel();
            model.createTable().exec();
            expect(model).to.not.have.property('waitedForActiveTable');
        });
    });

    describe('DynamoModel.updateTable(throughtput)', function () {
        it('should generate a valid AWS request', function (done) {
            var model = createTestModel();
            model.dynamodb.updateTable = function (params, callback) {
                expect(params).to.have.property('TableName', 'my-table');
                expect(params).to.have.property('ProvisionedThroughput');
                expect(params.ProvisionedThroughput).to.have.property('ReadCapacityUnits', 200);
                expect(params.ProvisionedThroughput).to.have.property('WriteCapacityUnits', 100);
                done();
            };
            model.updateTable({ read: 200, write: 100 }).exec();
        });
        it('should work with default throughput values', function () {
            var model = createTestModel();
            model.dynamodb.updateTable = function (params, callback) {
                expect(params.ProvisionedThroughput).to.have.property('ReadCapacityUnits', 10);
                expect(params.ProvisionedThroughput).to.have.property('WriteCapacityUnits', 5);
            };
            model.updateTable().exec();
        });
        it('should return a valid query', function () {
            var query = createTestModel().createTable();
            expect(query).to.be.an.instanceof(DynamoQuery);
        });
        it('should have checked for an active table', function () {
            var model = createTestModel();
            model.updateTable().exec();
            expect(model).to.have.property('waitedForActiveTable', true);
        });
    });

    describe('DynamoModel.deleteTable()', function () {
        it('should generate a valid AWS request', function (done) {
            var model = createTestModel();
            model.dynamodb.deleteTable = function (params, callback) {
                expect(params).to.have.property('TableName', 'my-table');
                done();
            };
            model.deleteTable().exec();
        });
        it('should return a valid query', function () {
            var query = createTestModel().createTable();
            expect(query).to.be.an.instanceof(DynamoQuery);
        });
        it('should have checked for an active table', function () {
            var model = createTestModel();
            model.deleteTable().exec();
            expect(model).to.have.property('waitedForActiveTable', true);
        });
    });

});
