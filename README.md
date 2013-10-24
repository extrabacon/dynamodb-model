# dynamodb-model

A simple and lightweight object mapper for Amazon DynamoDB, influenced by MongoDB and the Mongoose API. This library allows mapping of DynamoDB tables to Javascript objects using schemas while providing a comfortable high-level API for maximum productivity. It also enables a smooth transition to DynamoDB if you already know MongoDB or Mongoose.

## Objectives

+ Support for the full DynamoDB feature set
+ Models use the official AWS SDK module
+ Independent schemas, free of dependencies
+ Automatic table creation
+ Transparent support for MongoDB operators, such as "$gt", "$set" or "$inc"
+ API conventions based on [Mongoose](https://github.com/LearnBoost/mongoose)
+ Good documentation
+ Good unit test coverage
+ Fast and lightweight

## Installation

```bash
npm install dynamodb-model
```

To run the tests:

```bash
npm test
```

## Documentation

### Defining a schema to describe a DynamoDB table

A schema describes attributes, keys, and indexes for a DynamoDB table. A schema instance allows mapping of Javascript objects to DynamoDB items and vice-versa.

```javascript
var DynamoDBModel = require('dynamodb-model');

var productSchema = new DynamoDBModel.Schema({
  productId: {
    type: Number,
    key: 'hash'     // indicates a Hash key
  },
  sku: String,
  inStock: Boolean, // will be stored as a "Y" or "N" string
  properties: {},   // will be converted to a JSON string
  created: Date     // will be converted to a number with Date.getTime
});
```

#### Schema Types

Schemas support the following data types native to DynamoDB:

* String
* Number
* Blob (via Node.js [Buffer](http://nodejs.org/api/buffer.html))
* Array of strings
* Array of numbers
* Array of blobs (buffers)

In addition, schemas also support the following data types with some transformations:

* Boolean (as a "Y" or "N" string)
* Date (via `Date.getTime` as a number)
* JSON or objects (via `JSON.stringify` and `JSON.parse`), defined using an empty object `{}`

It is also possible to implement you own mapping if necessary:

```javascript
var DynamoDBModel = require('dynamodb-model');

var schema = new DynamoDBModel.Schema({
  ...
  customField: {
    dynamoDbType: 'S', // the native DynamoDB type, either S, N, B, SS, NS or BS
    mapFromDb: function(value) {
      /* your implementation */
    },
    mapToDb: function(value) {
      /* your implementation, must return a string */
    }
  }
});
```

#### Keys

To specify a Hash or Range key, define a `key` attribute on the field.

* Set to `"hash"` to specify a **Hash** key
* Set to `"range"` to specify a **Range** key

#### Local Secondary Indexes

Local secondary indexes are not yet supported.

#### Default values

The specify a default value, use `default` to specify a static value or a function returning a value.

```javascript
var DynamoDBModel = require('dynamodb-model');

var schema = new DynamoDBModel.Schema({
  ...
  active: {
    type: Boolean,
    default: true
  }
});
```

Default values replace missing attributes when reading items from DynamoDB.

#### Mapping objects manually

Schemas are independent from the AWS SDK and can be used with any other DynamoDB client. To map an object to a DynamoDB structure manually, use `schema.mapToDb`. Likewise, to map a DynamoDB structure to an object, use `schema.mapFromDb`.

```javascript
var DynamoDBModel = require('dynamodb-model');

var schema = new DynamoDBModel.Schema({
  id: {
    type: Number,
    key: 'hash'
  },
  message: String
});

schema.mapToDb({ id: 1, message: 'some text' });
// returns { id: { N: '1' }, message: { 'S': 'some text' } };

schema.mapFromDb({ id: { N: '1' }, message: { 'S': 'some text' } });
// returns { id: 1, message: 'some text' };
```

### Using a model to interact with a DynamoDB table

The `Model` class provides the high-level API you use to interact with the table, such as reading and writing data. The model class uses the official AWS SDK which already implement most of the best practices, such as automatic retries on a "HTTP 400: Capacity Exceeded" error.

Models also create the table automatically if required. There is no need to validate table existence or the "active" status. Operations performed while the table is not ready are queued until the table becomes active.

```javascript
var DynamoDBModel = require('dynamodb-model');

var productSchema = new DynamoDBModel.Schema({
  productId: {
    type: Number,
    key: 'hash'
  },
  sku: String,
  inStock: Boolean,
  properties: {},
  created: Date
});

// create a model using the name of the DynamoDB table and a schema
var productTable = new DynamoDBModel.Model('dynamo-products', productSchema);

// the model provides methods for all DynamoDB operations
// no need to check for table status, we can start using it right away
productTable.putItem(/* ... */);
productTable.getItem(/* ... */);
productTable.updateItem(/* ... */);
productTable.deleteItem(/* ... */);

// but some of them return intermediate objects in order to provide a better API
var query = productTable.query(/* ... */);
query.select(/* ... */).limit(100).exec(callback);
```

#### About AWS connectivity and credentials

The `dynamodb-model` module uses the official AWS SDK module for low-level operations. To properly connect to your DynamoDB table, make sure you configure the AWS SDK first. More details on the official AWS website [here](http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/configuring.html).

```javascript
var AWS = require('aws-sdk');

// setup region and credentials
AWS.config.update({
    accessKeyId: /* Your acess key */,
    secretAccessKey: /* Your secret key */,
    region: 'us-east-1'
});

// specify the API version (optional)
AWS.config.apiVersions = {
    dynamodb: '2012-08-10'
};
```

Additionally, if you need to specify options for the `AWS.DynamoDB` constructor, pass them to the `Model` constructor like this:

```javascript
var myTable = new DynamoDBModel.Model(tableName, schema, {
  maxRetries: 1000,
  sslEnabled: true
});
```

#### About table status

When creating a model instance, a `describeTable` call is immediately performed to check for table existence. If the table does not exist, a `createTable` call follows immediately.

If the table is not yet active (table status is not `"ACTIVE"`), all operations are queued and will not be executed until the table is ready. When the table becomes active, operations from the queue are executed in sequential order. This means that you can create a model instance and start writing data immediately, even if the table does not exist.

If you wish to wait for the table to become available before performing an action, use the `waitForActiveTable` method, which invokes `describeTable` repeatedly until the status switches to `"ACTIVE"`.

**WARNING:** the queue is not durable and should not be used in a production environment, since changes will be lost if the application terminates before the table becomes active. Instead, create your table beforehand, or use the `waitForActiveTable` method to make sure the table is ready.

#### Model.batchGetItem

This method is not yet implemented.

[AWS Documentation for BatchGetItem](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchGetItem.html)

#### Model.batchWriteItem

This method is not yet implemented.

[AWS Documentation for BatchWriteItem](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html)

#### Model.createTable(options, callback)

Creates the DynamoDB table represented by the schema and returns the AWS service response.

+ options: attributes to add to the AWS.Request instance (optional)
+ callback: the callback function to invoke with the AWS response (optional)

```javascript
var myTable = new DynamoDBModel.Model(tableName, schema);
myTable.createTable(function (err, response) {
  // table creation started
})
```

Note: table creation in DynamoDB is asynchronous. The table is not ready until its status property is set to "ACTIVE". If you need to wait for the table to become active, use the `waitForActiveTable` method.

[AWS Documentation for CreateTable](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_CreateTable.html)

#### Model.deleteItem(key, options, callback)

Deletes a single item in a table by primary key and returns the AWS service response.

+ key: an object representing the primary key of the item to remove
+ options: attributes to add to the AWS.Request instance (optional)
+ callback: the callback function to invoke with the AWS response (optional)

```javascript
var myTable = new DynamoDBModel.Model(tableName, schema);
myTable.deleteItem({ id: 1 }, function (err, response) {
  // item removed
})
```

[AWS Documentation for DeleteItem](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_DeleteItem.html)

Note: conditional deletes are not yet implemented.

#### Model.deleteTable(options, callback)

Removes the table represented by the schema, as well as all items in the table, then returns the AWS service response.

+ options: attributes to add to the AWS.Request instance (optional)
+ callback: the callback function to invoke with the AWS response

```javascript
var myTable = new DynamoDBModel.Model(tableName, schema);
myTable.deleteTable(function (err, response) {
  // table removal started
})
```

[AWS Documentation for DeleteTable](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_DeleteTable.html)

#### Model.describeTable(options, callback)

Returns information about the table represented by the schema, including the current status of the table, when it was created, the primary key schema, and any indexes on the table. The table description is the AWS service response.

+ options: attributes to add to the AWS.Request instance (optional)
+ callback: the callback function to invoke with the AWS response

```javascript
var myTable = new DynamoDBModel.Model(tableName, schema);
myTable.describeTable(function (err, response) {
  // response contains the table description, see AWS docs for more details
})
```

#### Model.waitForActiveTable(pollingInterval, callback)

Invokes `describeTable` repeatedly until the table status is `"ACTIVE"`.

+ pollingInterval: the delay in milliseconds between each invocation of `describeTable` (optional, default value is 3000)
+ callback: the callback function to invoke with the AWS response from `describeTable` (optional)

```javascript
var myTable = new DynamoDBModel.Model(tableName, schema);
var pollingInterval = 5000; // 5 seconds
myTable.waitForActiveTable(pollingInterval, function (err, response) {
  // response contains the table description, with an "ACTIVE" status
})
```

#### Model.getItem(key, options, callback)

Retrieves a specific item based on its primary key, returning the mapped item as well as the AWS service response.

+ key: an object representing the primary key of the item to retrieve
+ options: attributes to add to the AWS.Request instance (optional)
+ callback: the callback function to invoke with the AWS response

```javascript
var myTable = new DynamoDBModel.Model(tableName, schema);
myTable.getItem({ id: 1 }, function (err, item, response) {
  // item represents the DynamoDB item mapped to an object using the schema
})
```

[AWS Documentation for GetItem](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_GetItem.html)

#### Model.listTables(options, callback)

This method is not yet implemented.

+ options: attributes to add to the AWS.Request instance (optional)
+ callback: the callback function to invoke with the AWS response

[AWS Documentation for ListTables](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_ListTables.html)

#### Model.putItem(item, options, callback)

TBD

[AWS Documentation for PutItem](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html)

#### Model.query

TBD

[AWS Documentation for Query](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html)

#### Model.scan

TBD

[AWS Documentation for Scan](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html)

#### Model.updateItem

TBD

[AWS Documentation for UpdateItem](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html)

#### Model.updateTable

TBD

[AWS Documentation for UpdateTable](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateTable.html)

### Reading results with DynamoDBModel.Query

TBD

## Stability

This is the initial release of `dynamodb-model` and should not be considered production-ready yet. Some features are also missing (see TODO section).

## TODO

* Complete documentation
* Implement local secondary indexes
* Implement `BatchGetItem` operation
* Implement `BatchWriteItem` operation
* Add conditional support for `DeleteItem` operation
* Add parallel support for `Scan` operation
* Improve API to be closer to Mongoose, using aliases for common methods
* Check for table key changes, which are unsupported by DynamoDB

## Compatibility

+ Tested with Node 0.10.x
+ Tested on Mac OS X 10.8

## Dependencies

+ [async](http://github.com/caolan/async)
+ [aws-sdk](http://github.com/aws/aws-sdk-js)

## License

The MIT License (MIT)

Copyright (c) 2013, Nicolas Mercier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
