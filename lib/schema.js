var DynamoSchema = function (schema) {

    this.keys = {};
    this.indexes = {};
    this.attributes = {};
    this.mappers = {};
    this.defaults = {};

    for (var key in schema) {
        var fieldType = schema[key];
        this.mappers[key] = resolve(key, fieldType) || DynamoSchema.mappers.default;
        this.attributes[key] = this.mappers[key].dynamoDbType || 'S';

        if (fieldType.key) {
            if (fieldType.key === true || fieldType.key === 'hash') {
                this.keys[key] = 'HASH';
            } else if (fieldType.key === 'range') {
                this.keys[key] = 'RANGE';
            }
        } else if (fieldType.index) {
            // TODO: indexes
        }

        if (fieldType.default) {
            this.defaults[key] = fieldType.default;
        }
    }

    function resolve(fieldName, fieldType) {
        if (!Array.isArray(fieldType) && typeof fieldType === 'object') {
            if (Object.keys(fieldType).length === 0) {
                // empty object "{}", suppose a JSON type
                fieldType = 'JSON';
            } else {
                if (fieldType.mapFromDb && fieldType.mapToDb) {
                    return fieldType;
                } else if (fieldType.type) {
                    fieldType = fieldType.type;
                } else {
                    throw new Error('DynamoSchema is unable to map field "' + fieldName + '": missing data type');
                }
            }
        }

        if (Array.isArray(fieldType) && fieldType.length > 0) {
            fieldType = fieldType[0];
            return DynamoSchema.mappers.Array[fieldType.name];
        } else {
            if (typeof fieldType === 'function') {
                fieldType = fieldType.name;
            }
            return DynamoSchema.mappers[fieldType];
        }

        throw new Error('DynamoSchema is unable to map field "' + fieldName + '": no mapper can handle this data type');
    }

    DynamoSchema.prototype.mapFromDb = function(doc) {
        if (!doc) return null;
        var mappedDoc = {};
        for (var key in this.mappers) {
            var mapper = this.mappers[key];
            if (mapper) {
                var val = doc[key];
                if (val) {
                    mappedDoc[key] = mapper.mapFromDb(val);
                } else if (this.defaults.hasOwnProperty(key)) {
                    if (typeof this.defaults[key] === 'function') {
                        mappedDoc[key] = this.defaults[key].call(this, doc);
                    } else {
                        mappedDoc[key] = this.defaults[key];
                    }

                } else {
                    mappedDoc[key] = null;
                }
            }
        }
        return mappedDoc;
    };

    DynamoSchema.prototype.mapToDb = function(doc) {
        if (!doc) return null;
        var mappedDoc = {};
        for (var key in doc) {
            if (this.mappers.hasOwnProperty(key)) {
                mappedDoc[key] = this.mappers[key].mapToDb(doc[key]);
            }
        }
        return mappedDoc;
    };

};

DynamoSchema.mappers = {
    default: {
        dynamoDbType: 'S',
        mapFromDb: function (val) {
            return val.S || val.N || val.B || val.SS || val.NS || val.BS;
        },
        mapToDb: function (val) {
            return { S: String(val) };
        }
    },
    'String': {
        dynamoDbType: 'S',
        mapFromDb: function (val) {
            return val.S;
        },
        mapToDb: function (val) {
            return { S: String(val) };
        }
    },
    'Number': {
        dynamoDbType: 'N',
        mapFromDb: function (val) {
            return +val.N;
        },
        mapToDb: function (val) {
            return { N: String(val) };
        }
    },
    'Buffer': {
        dynamoDbType: 'B',
        mapFromDb: function (value) {
            return new Buffer(String(value.B), 'base64');
        },
        mapToDb: function (value) {
            return { B: value.toString('base64') };
        }
    },
    'Boolean': {
        dynamoDbType: 'S',
        mapFromDb: function (value) {
            return value.S === 'Y' ? true : value.S === 'N' ? false : undefined;
        },
        mapToDb: function (value) {
            return { S: value ? 'Y' : 'N' };
        }
    },
    'Date': {
        dynamoDbType: 'N',
        mapFromDb: function (value) {
            return new Date(Number(value.N));
        },
        mapToDb: function (value) {
            return { N: String(value.getTime()) };
        }
    },
    'JSON': {
        dynamoDbType: 'S',
        mapFromDb: function (value) {
            return JSON.parse(value.S);
        },
        mapToDb: function (value) {
            return { S: JSON.stringify(value) };
        }
    },
    'Array': {
        'String': {
            dynamoDbType: 'SS',
            mapFromDb: function (value) {
                return value.SS;
            },
            mapToDb: function (value) {
                return { SS: value };
            }
        },
        'Number': {
            dynamoDbType: 'NS',
            mapFromDb: function (value) {
                return value.NS.map(Number);
            },
            mapToDb: function (value) {
                return { NS: value.map(String) };
            }
        },
        'Buffer': {
            dynamoDbType: 'BS',
            mapFromDb: function (value) {
                return value.BS.map(function (str) {
                    return new Buffer(str, 'base64');
                });
            },
            mapToDb: function (value) {
                return { BS: value.map(function (buf) {
                  return buf.toString('base64');
                }) };
            }
        }
    }
};

module.exports = DynamoSchema;
