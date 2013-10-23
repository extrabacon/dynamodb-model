var DynamoSchema = require('..').Schema;
var chai = require('chai');
var expect = chai.expect;

describe('DynamoSchema', function () {

    it('should map simple schemas', function () {
        var schema = new DynamoSchema({
            id: String,
            value: Number
        });
        expect(Object.keys(schema.attributes)).to.have.length(2);
        expect(schema.mappers.id.dynamoDbType).to.equal('S');
        expect(schema.mappers.value.dynamoDbType).to.equal('N');
    });

    it('should map strings', function () {
        var schema = new DynamoSchema({ text: String });
        expect(schema.mappers.text).to.equal(DynamoSchema.mappers.String);

        var doc = { text: 'hello' };
        var outboundDoc = schema.mapToDb(doc);
        expect(outboundDoc).to.have.property('text');
        expect(outboundDoc.text).to.have.property('S', 'hello');

        var inboundDoc = schema.mapFromDb(outboundDoc);
        expect(inboundDoc).to.have.property('text', 'hello');
    });

    it('should map numbers', function () {
        var schema = new DynamoSchema({ number: Number });
        expect(schema.mappers.number).to.equal(DynamoSchema.mappers.Number);

        var doc = { number: 123.45 };
        var outboundDoc = schema.mapToDb(doc);
        expect(outboundDoc).to.have.property('number');
        expect(outboundDoc.number).to.have.property('N', '123.45');

        var inboundDoc = schema.mapFromDb(outboundDoc);
        expect(inboundDoc).to.have.property('number', 123.45);
    });

    it('should map booleans', function () {
        var schema = new DynamoSchema({ toggleOn: Boolean, toggleOff: Boolean });
        expect(schema.mappers.toggleOn).to.equal(DynamoSchema.mappers.Boolean);
        expect(schema.mappers.toggleOff).to.equal(DynamoSchema.mappers.Boolean);

        var doc = { toggleOn: true, toggleOff: false };
        var outboundDoc = schema.mapToDb(doc);
        expect(outboundDoc).to.have.property('toggleOn');
        expect(outboundDoc).to.have.property('toggleOff');
        expect(outboundDoc.toggleOn).to.have.property('S', 'Y');
        expect(outboundDoc.toggleOff).to.have.property('S', 'N');

        var inboundDoc = schema.mapFromDb(outboundDoc);
        expect(inboundDoc).to.have.property('toggleOn', true);
        expect(inboundDoc).to.have.property('toggleOff', false);
    });

    it('should map dates', function () {
        var schema = new DynamoSchema({ date: Date });
        expect(schema.mappers.date).to.equal(DynamoSchema.mappers.Date);

        var now = new Date(Date.now());
        var doc = { date: now };
        var outboundDoc = schema.mapToDb(doc);
        expect(outboundDoc).to.have.property('date');
        expect(outboundDoc.date).to.have.property('N', String(+now));

        var inboundDoc = schema.mapFromDb(outboundDoc);
        expect(inboundDoc).to.have.property('date');
        expect(+inboundDoc.date).to.equal(+now);
    });

    it('should map JSON', function () {
        var schema = new DynamoSchema({ subdocument: {} });
        expect(schema.mappers.subdocument).to.equal(DynamoSchema.mappers.JSON);

        var doc = { subdocument: { a: 1, b: 2, c: 3 } };
        var outboundDoc = schema.mapToDb(doc);
        expect(outboundDoc).to.have.property('subdocument');
        expect(outboundDoc.subdocument).to.have.property('S');

        var inboundDoc = schema.mapFromDb(outboundDoc);
        expect(inboundDoc).to.have.property('subdocument');
        expect(inboundDoc.subdocument).to.have.property('a', 1);
        expect(inboundDoc.subdocument).to.have.property('b', 2);
        expect(inboundDoc.subdocument).to.have.property('c', 3);
    });

    it('should map buffers', function () {
        var schema = new DynamoSchema({ binaryData: Buffer });
        expect(schema.mappers.binaryData).to.equal(DynamoSchema.mappers.Buffer);

        var buffer = new Buffer('hello world');
        var doc = { binaryData: buffer };
        var outboundDoc = schema.mapToDb(doc);
        expect(outboundDoc).to.have.property('binaryData');
        expect(outboundDoc.binaryData).to.have.property('B', buffer.toString('base64'));

        var inboundDoc = schema.mapFromDb(outboundDoc);
        expect(inboundDoc).to.have.property('binaryData');
        expect(inboundDoc.binaryData.toString('utf8')).to.equal('hello world');
    });

    it('should map arrays of strings', function () {
        var schema = new DynamoSchema({ lines: [String] });
        expect(schema.mappers.lines).to.equal(DynamoSchema.mappers.Array.String);

        var doc = { lines: ['hello', 'world', '!'] };
        var outboundDoc = schema.mapToDb(doc);
        expect(outboundDoc).to.have.property('lines');
        expect(outboundDoc.lines).to.have.property('SS');
        expect(outboundDoc.lines.SS).to.be.an.Array;
        expect(outboundDoc.lines.SS).to.have.length(3);

        var inboundDoc = schema.mapFromDb(outboundDoc);
        expect(inboundDoc).to.have.property('lines');
        expect(inboundDoc.lines).to.be.an.Array;
        expect(inboundDoc.lines).to.have.length(3);
    });

    it('should map arrays of numbers', function () {
        var schema = new DynamoSchema({ amounts: [Number] });
        expect(schema.mappers.amounts).to.equal(DynamoSchema.mappers.Array.Number);

        var doc = { amounts: [0, 1, 2] };
        var outboundDoc = schema.mapToDb(doc);
        expect(outboundDoc).to.have.property('amounts');
        expect(outboundDoc.amounts).to.have.property('NS');
        expect(outboundDoc.amounts.NS).to.be.an.Array;
        expect(outboundDoc.amounts.NS).to.have.length(3);

        var inboundDoc = schema.mapFromDb(outboundDoc);
        expect(inboundDoc).to.have.property('amounts');
        expect(inboundDoc.amounts).to.be.an.Array;
        expect(inboundDoc.amounts).to.have.length(3);
    });

    it('should map arrays of buffers', function () {
        var schema = new DynamoSchema({ data: [Buffer] });
        expect(schema.mappers.data).to.equal(DynamoSchema.mappers.Array.Buffer);

        var doc = { data: [new Buffer('abc'), new Buffer('123'), new Buffer('_~|')] };
        var outboundDoc = schema.mapToDb(doc);
        expect(outboundDoc).to.have.property('data');
        expect(outboundDoc.data).to.have.property('BS');
        expect(outboundDoc.data.BS).to.be.an.Array;
        expect(outboundDoc.data.BS).to.have.length(3);

        var inboundDoc = schema.mapFromDb(outboundDoc);
        expect(inboundDoc).to.have.property('data');
        expect(inboundDoc.data).to.be.an.Array;
        expect(inboundDoc.data).to.have.length(3);
    });

    it('should map with custom mappers', function () {
        var schema = new DynamoSchema({
            customField: {
                mapFromDb: function (val) {
                    return 'fromDB';
                },
                mapToDb: function (val) {
                    return 'toDB';
                }
            }
        });

        var doc = { customField: true };
        var outboundDoc = schema.mapToDb(doc);
        expect(outboundDoc).to.have.property('customField', 'toDB');

        var inboundDoc = schema.mapFromDb(outboundDoc);
        expect(inboundDoc).to.have.property('customField', 'fromDB');
    });

    it('should map keys', function () {
        var schema = new DynamoSchema({
            id: {
                type: String,
                key: true
            },
            hash: {
                type: String,
                key: 'hash'
            },
            range: {
                type: String,
                key: 'range'
            },
            value: Number
        });
        expect(Object.keys(schema.keys)).to.have.length(3);
        expect(Object.keys(schema.attributes)).to.have.length(4);
        expect(schema.keys.id).to.equal('HASH');
        expect(schema.keys.hash).to.equal('HASH');
        expect(schema.keys.range).to.equal('RANGE');
    });

    it('should map with default values as fallback', function () {
        var schema = new DynamoSchema({
            no_default: String,
            with_static_default: {
                type: String,
                default: 'hello world'
            },
            with_dynamic_default: {
                type: Number,
                default: function () { return Date.now(); }
            }
        });
        expect(schema.defaults).to.have.property('with_static_default', 'hello world');
        expect(schema.defaults).to.have.property('with_dynamic_default');
        var outboundDoc = schema.mapFromDb({});
        expect(outboundDoc).to.have.property('no_default', null);
        expect(outboundDoc).to.have.property('with_static_default', 'hello world');
        expect(outboundDoc).to.have.property('with_dynamic_default');
        expect(outboundDoc.with_dynamic_default).to.be.a.Number;
    });

});
