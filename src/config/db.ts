import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';



const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);

export const TABLE_NAME = process.env.TABLE_NAME;

export { dynamoDb };