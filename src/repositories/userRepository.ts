import { dynamoDb, TABLE_NAME } from '../config/db';
import { User, UserRole, UserStatus } from '../models/User';
import { PutCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { AppError } from '../middleware/errorHandler';

export class UserRepository {
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

    async findUserByEmail(email: string): Promise<User | null> {
        try {
            const params = {
                TableName: TABLE_NAME,
                IndexName: 'EmailIndex',
                KeyConditionExpression: 'GSI1PK = :emailKey',
                ExpressionAttributeValues: {
                    ':emailKey': `EMAIL#${email}`,
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

    async getUserById(userId: string): Promise<User | null> {
        try {
            const result = await dynamoDb.send(
                new GetCommand({
                    TableName: TABLE_NAME,
                    Key: {
                        PK: `USER#${userId}`,
                        SK: `PROFILE#${userId}`,
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
