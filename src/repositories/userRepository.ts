import { PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDb, TABLE_NAME } from '../utils/db';
import { User } from '../models/User';
import { AppError } from '../middlewares/errorHandler';

export class UserRepository {
  /**
   * Create a new user in the database
   */
  async createUser(user: User): Promise<User> {
    try {
      await dynamoDb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: user,
          ConditionExpression: 'attribute_not_exists(PK)'
        })
      );
      
      return user;
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new AppError('User already exists', 409);
      }
      throw new AppError(`Error creating user: ${error.message}`, 500);
    }
  }

  /**
   * Find a user by their ID
   */
  async findUserById(userId: string): Promise<User | null> {
    try {
      const response = await dynamoDb.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `USER#${userId}`,
            SK: `PROFILE#${userId}`
          }
        })
      );
      
      return response.Item as User || null;
    } catch (error: any) {
      throw new AppError(`Error fetching user: ${error.message}`, 500);
    }
  }

  /**
   * Find a user by their email address
   */
  async findUserByEmail(email: string): Promise<User | null> {
    try {
      const response = await dynamoDb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: 'EmailIndex',
          KeyConditionExpression: 'email = :email',
          ExpressionAttributeValues: {
            ':email': email,
          },
          FilterExpression: 'begins_with(PK, :pk) AND type = :type',
        })
      );
      
      if (response.Items && response.Items.length > 0) {
        return response.Items[0] as User;
      }
      
      return null;
    } catch (error: any) {
      throw new AppError(`Error finding user by email: ${error.message}`, 500);
    }
  }
}