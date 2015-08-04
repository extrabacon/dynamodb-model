var DynamoQuery = function (mode, schema, model, params) {

    var lastEvaluatedKey;
    var execute = model.dynamodb[mode].bind(model.dynamodb);
    this.hasMoreData = true;

    DynamoQuery.prototype.select = function() {
        if (arguments.length > 0) {
            params.AttributesToGet = Array.prototype.slice.call(arguments, 0);
            params.Select = 'SPECIFIC_ATTRIBUTES';
        } else {
            params.Select = 'ALL_ATTRIBUTES';
        }
        return this;
    };

    DynamoQuery.prototype.returnConsumedCapacity = function(enabled) {
        if (typeof enabled === 'undefined') enabled = true;
        params.ReturnConsumedCapacity = enabled;
        return this;
    };

    DynamoQuery.prototype.limit = function(count) {
        params.Limit = count;
        return this;
    };

    DynamoQuery.prototype.count = function(callback) {
        params.Select = 'COUNT';
        if (callback) return this.exec(callback);
        return this;
    };

    DynamoQuery.prototype.next = function(callback) {
        if (this.hasMoreData) {
            params.ExclusiveStartKey = lastEvaluatedKey;
        } else {
            throw new Error('there is no more data to retrieve, last execution did not yield a LastEvaluatedKey');
        }
        if (callback) return this.exec(callback);
        return this;
    };

    DynamoQuery.prototype.exec = function(callback) {
        if (!callback) throw new Error('callback required');
        var query = this;
        model.ensureActiveTable(function (err) {
            if (err) return callback(err);
            execute(params, function (err, response) {
                if (err) return callback(err);
                var items = response.Items.map(schema.mapFromDb.bind(schema));
                lastEvaluatedKey = response.LastEvaluatedKey;
                query.hasMoreData = lastEvaluatedKey !== null;
                callback(null, items, response);
            });
        });
        return this;
    };

    if (mode === 'scan') {
        DynamoQuery.prototype.scan = function(callback) {
            throw new Error('not yet supported');
        };
    }

};

module.exports = DynamoQuery;
