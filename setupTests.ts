// Set up environment variables for tests
process.env.JWT_SECRET = 'test-secret-key';
process.env.TABLE_NAME = 'test-table';

// Mock the DynamoDB client and commands
jest.mock('@aws-sdk/lib-dynamodb', () => {
  return {
    DynamoDBDocumentClient: {
      from: jest.fn().mockReturnValue({
        send: jest.fn()
      })
    },
    PutCommand: jest.fn(),
    QueryCommand: jest.fn(),
    GetCommand: jest.fn()
  };
});

// Mock the dynamoDb import - Fix the path
jest.mock('./src/config/db', () => {
  return {
    dynamoDb: {
      send: jest.fn()
    },
    TABLE_NAME: 'test-table'
  };
});