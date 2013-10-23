# dynamodb-model

A simple and lightweight object mapper for Amazon DynamoDB, influenced by MongoDB and the Mongoose API. This library allows mapping of DynamoDB tables to Javascript objects using schemas while providing a comfortable high-level API for maximum productivity. It also enables a smooth transition to DynamoDB if you already know MongoDB or Mongoose.

## Objectives

+ Support for the full DynamoDB feature set
+ Models use the official AWS SDK module
+ Independant schemas free of dependencies
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

Schemas describe attributes, keys, and indexes for a table. A schema instance allows mapping of Javascript objects to DynamoDB items and vice-versa.

Example:

```javascript
var DynamoDBModel = require('dynamodb-model');

var productSchema = new DynamoDBModel.Schema('my-dynamodb-table', {
  productId: {
    type: Number,
    key: true       // indicates a Hash key
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
* Date (using Date.getTime as a number)
* JSON or objects (using JSON.stringify and JSON.parse), using an empty object: {}

It is also possible to implement you own mapping if necessary:

```javascript
var DynamoDBModel = require('dynamodb-model');

var schema = new DynamoDBModel.Schema('my-dynamodb-table', {
  ...
  customField: {
    dynamoDbType: 'S',
    mapFromDb: function(value) { /* your implementation */ },
    mapToDb: function(value) { /* your implementation */ }
  }
});
```

#### Keys

To specify a Hash or Range key, define a `key` attribute on the field.

* Set to `true` or `"hash"` to specify a Hash key
* Set to `"range"` to sepcify a Range key

#### Local Secondary Indexes

Local secondary indexes are not yet supported.

#### Default values

The specify a default value, define a `default` attribute on the field. Defaults can be a static value or a function returning a value.

Example:

```javascript
var DynamoDBModel = require('dynamodb-model');

var schema = new DynamoDBModel.Schema('my-dynamodb-table', {
  ...
  active: {
    type: Boolean,
    default: true
  }
});
```

Default values replace missing attributes when reading items from DynamoDB.

#### Mapping objects manually

Schemas are independant from the AWS SDK and can be used with any other DynamoDB client. To map an object to a DynamoDB structure manually, use `schema.mapToDb`. Likewise, to map a DynamoDB structure to an object, use `schema.mapFromDb`.

Example:

```javascript
var DynamoDBModel = require('dynamodb-model');

var schema = new DynamoDBModel.Schema({
  id: {
    type: Number,
    key: true
  },
  message: String
});

schema.mapToDb({ id: 1, message: 'some text' });
// returns { id: { N: '1' }, message: { 'S': 'some text' } };

schema.mapFromDb({ id: { N: '1' }, message: { 'S': 'some text' } });
// returns { id: 1, message: 'some text' };
```

### Using a model to interact with a DynamoDB table

Using a model allows you to interact with a DynamoDB table represented by a `Schema`.

Example:

```javascript
var DynamoDBModel = require('dynamodb-model');

var productSchema = new DynamoDBModel.Schema('my-dynamodb-table', {
  productId: {
    type: Number,
    key: true       // indicates a Hash key
  },
  sku: String,
  inStock: Boolean, // will be stored as a "Y" or "N" string
  properties: {},   // will be converted to a JSON string
  created: Date     // will be converted to a number with Date.getTime
});

var productTable = new DynamoDBModel.Model(productSchema);

productTable.putItem(/* ... */);
productTable.getItem(/* ... */);
productTable.updateItem(/* ... */);
productTable.deleteItem(/* ... */);
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
var mytable = new DynamoDBModel.Model(schema, {
  maxRetries: 1000,
  sslEnabled: true
});
```

#### Model.batchGetItem

This method is not yet implemented.
[AWS Documentation for BatchGetItem](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchGetItem.html)

#### Model.batchWriteItem

This method is not yet implemented.
[AWS Documentation for BatchWriteItem](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html)

#### Model.createTable

Creates the DynamoDB table represented by the schema and returns the AWS service response.

```javascript
var mytable = new DynamoDBModel.Model(schema);
mytable.createTable(function (err, response) {
  // table creation started
})
```

[AWS Documentation for CreateTable](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_CreateTable.html)

#### Model.deleteItem

Deletes a single item in a table by primary key and returns the AWS service response.

```javascript
var mytable = new DynamoDBModel.Model(schema);
mytable.deleteItem({ id: 1 }, function (err, response) {
  // item removed
})
```

[AWS Documentation for Deleteitem](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Deleteitem.html)

Note: conditional deletes are not yet implemented.

#### Model.deleteTable

Removes the table represented by the schema, as well as all items in the table, then returns the AWS service response.

```javascript
var mytable = new DynamoDBModel.Model(schema);
mytable.deleteTable(function (err, response) {
  // table removal started
})
```

[AWS Documentation for DeleteTable](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_DeleteTable.html)

#### Model.describeTable

Returns information about the table represented by the schema, including the current status of the table, when it was created, the primary key schema, and any indexes on the table. The table description is the AWS service response.

```javascript
var mytable = new DynamoDBModel.Model(schema);
mytable.describeTable(function (err, response) {
  // response contains the table description, see AWS docs for more details
})
```

[AWS Documentation for DescribeTable](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_DescribeTable.html)

#### Model.getItem

Retrieves a specific item based on its primary key, returning the mapped item as well as the AWS service response.

```javascript
var mytable = new DynamoDBModel.Model(schema);
mytable.getItem({ id: 1 }, function (err, item, response) {
  // item represents the DynamoDB item mapped to an object using the schema
})
```

[AWS Documentation for GetItem](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_GetItem.html)

#### Model.listTables

This method is not yet implemented.
[AWS Documentation for ListTables](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_ListTables.html)

#### Model.putItem

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
* Add parallel suport to `Scan` operation
* Improve API to be closer to Mongoose, using aliases for common methods

## Changelog

* 0.0.1: initial version

## Compatibility

+ Tested with Node 0.10.x
+ Tested on Mac OS X 10.8

## Dependencies

+ [aws-sdk](https://github.com/aws/aws-sdk-js)

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
