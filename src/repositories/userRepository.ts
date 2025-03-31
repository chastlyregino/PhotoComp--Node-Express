import { dynamoDb, TABLE_NAME } from '../config/db';
import { User, UserRole } from '../models/User';
import { PutCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { AppError } from '../middleware/errorHandler';

/**
 * Repository class for User-related database operations
 * Handles CRUD operations for user data in DynamoDB
 */
export class UserRepository {
    /**
     * Create a new user in the database
     * @param user The user object to create
     * @returns The created user
     * @throws AppError if user already exists or operation fails
     */
    async createUser(user: User): Promise<User> {
        try {
            await dynamoDb.send(
                new PutCommand({
                    TableName: TABLE_NAME,
                    Item: user,
                    ConditionExpression: 'attribute_not_exists(PK)',
                })
            );
            return user;
        } catch (error: any) {
            if (error.name === 'ConditionalCheckFailedException') {
                throw new AppError('User already exists', 409);
            }
            throw new AppError(`Failed to create user: ${error.message}`, 500);
        }
    }

    /**
     * Find a user by email address
     * @param email Email address to search for
     * @returns The user object or null if not found
     * @throws AppError if operation fails
     */
    async findUserByEmail(email: string): Promise<User | null> {
        try {
            const params = {
                TableName: TABLE_NAME,
                IndexName: 'GSI1PK-GSI1SK-INDEX',
                KeyConditionExpression: 'GSI1PK = :emailKey AND GSI1SK = :entityValue',
                ExpressionAttributeValues: {
                    ':emailKey': `EMAIL#${email}`,
                    ':entityValue': 'ENTITY'
                },
            };

            const result = await dynamoDb.send(new QueryCommand(params));

            if (!result.Items || result.Items.length === 0) {
                return null;
            }

            return result.Items[0] as User;
        } catch (error: any) {
            throw new AppError(`Failed to find user by email: ${error.message}`, 500);
        }
    }

    /**
     * Get a user by their ID
     * @param userId The user ID to look up
     * @returns The user object or null if not found
     * @throws AppError if operation fails
     */
    async getUserById(userId: string): Promise<User | null> {
        try {
            const result = await dynamoDb.send(
                new GetCommand({
                    TableName: TABLE_NAME,
                    Key: {
                        PK: `USER#${userId}`,
                        SK: `ENTITY`,
                    },
                })
            );

            if (!result.Item) {
                return null;
            }

            return result.Item as User;
        } catch (error: any) {
            throw new AppError(`Failed to get user by ID: ${error.message}`, 500);
        }
    }
}