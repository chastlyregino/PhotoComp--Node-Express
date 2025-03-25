import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient();
export const dynamoDb = DynamoDBDocumentClient.from(client);
export const tableName = process.env.TABLE_NAME;