const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient();

const dynamoDb = DynamoDBDocumentClient.from(client);

module.exports = {
  dynamoDb,
  tableName: process.env.TABLE_NAME
};