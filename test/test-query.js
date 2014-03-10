var DynamoSchema = require('..').Schema;
var DynamoModel = require('..').Model;
var DynamoQuery = require('..').Query;
var chai = require('chai');
var expect = chai.expect;

describe('DynamoQuery', function () {

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
    // a sample model
    var model = new DynamoModel('my-table', schema);

    it('should set ConsistentRead', function () {
        var query = new DynamoQuery();
        query._consistentRead();
        expect(query.params).to.have.property('ConsistentRead', true);
        query._consistentRead(false);
        expect(query.params).to.have.property('ConsistentRead', false);
    });

    it('should set ReturnConsumedCapacity', function () {
        var query = new DynamoQuery();
        query._returnConsumedCapacity();
        expect(query.params).to.have.property('ReturnConsumedCapacity', true);
        query._returnConsumedCapacity(false);
        expect(query.params).to.have.property('ReturnConsumedCapacity', false);
    });

    it('should set ReturnItemCollectionMetrics', function () {
        var query = new DynamoQuery();
        query._returnItemCollectionMetrics();
        expect(query.params).to.have.property('ReturnItemCollectionMetrics', 'SIZE');
        query._returnItemCollectionMetrics(false);
        expect(query.params).to.have.property('ReturnItemCollectionMetrics', 'NONE');
        query._returnItemCollectionMetrics('SOMETHING');
        expect(query.params).to.have.property('ReturnItemCollectionMetrics', 'SOMETHING');
    });

    it('should set ReturnValues', function () {
        var query = new DynamoQuery();
        query._returnValues();
        expect(query.params).to.have.property('ReturnValues', 'ALL_NEW');
        query._returnValues(false);
        expect(query.params).to.have.property('ReturnValues', 'NONE');
        query._returnValues('SOMETHING');
        expect(query.params).to.have.property('ReturnValues', 'SOMETHING');
    });


});
