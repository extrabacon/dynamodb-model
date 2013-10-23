var DynamoSchema = require('..').Schema;
var DynamoModel = require('..').Model;
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

    it('should execute with "exec"', function () {
        var model = new DynamoModel('my-table', schema);
        model.dynamodb.query = function (params, callback) {
            expect(params).to.have.property('TableName', 'my-table');
            expect(params).to.have.property('KeyConditions');
        };
        var query = model.query({ id: 'text' });
        query.exec();
    });

    it('should allow the selection of fields to return with "select"', function () {
        var model = new DynamoModel('my-table', schema);
        model.dynamodb.query = function (params, callback) {
            expect(params).to.have.property('Select', 'SPECIFIC_ATTRIBUTES');
            expect(params).to.have.property('AttributesToGet');
            expect(params.AttributesToGet).to.have.length(3);
            expect(params.AttributesToGet).to.contain('field1');
            expect(params.AttributesToGet).to.contain('field2');
            expect(params.AttributesToGet).to.contain('field3');
        };
        var query = model.query({ id: 'text' });
        query.select('field1', 'field2', 'field3').exec();
    });

    it('should return the consumed capacity with "returnConsumedCapacity"', function () {
        var model = new DynamoModel('my-table', schema);
        model.dynamodb.query = function (params, callback) {
            expect(params).to.have.property('ReturnConsumedCapacity', true);
        };
        var query = model.query({ id: 'text' });
        query.returnConsumedCapacity().exec();
    });

    it('should limit the number of items with "limit"', function () {
        var model = new DynamoModel('my-table', schema);
        model.dynamodb.query = function (params, callback) {
            expect(params).to.have.property('Limit', 10);
        };
        var query = model.query({ id: 'text' });
        query.limit(10).exec();
    });

    it('should count number of items with "count"', function () {
        var model = new DynamoModel('my-table', schema);
        model.dynamodb.query = function (params, callback) {
            expect(params).to.have.property('Select', 'COUNT');
        };
        var query = model.query({ id: 'text' });
        query.count().exec();
    });

    it('should allow paging with "next"', function () {
        var model = new DynamoModel('my-table', schema);
        var count = 0;
        model.dynamodb.query = function (params, callback) {
            // simulate 3 pages of data
            if (++count < 3) {
                callback(null, { Items: [], LastEvaluatedKey: 'last_key' });
            } else {
                callback(null, { Items: [], LastEvaluatedKey: null });
            }
        };
        var query = model.query({ id: 'text' });
        expect(query.hasMoreData).to.be.true;
        query.exec(function (err, items, response) {
            // got page 1
            expect(query.hasMoreData).to.be.true;
            query.next(function (err, items, response) {
                // got page 2
                expect(query.hasMoreData).to.be.true;
                query.next(function (err, items, response) {
                    // got page 3
                    expect(query.hasMoreData).to.be.false;
                    expect(function () { query.next(function () {}); }).to.throw(/no more data to retrieve/);
                });
            });
        });
    });

});
