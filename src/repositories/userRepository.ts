import { dynamoDb, TABLE_NAME } from '../config/db';
import { User, UserRole } from '../models/User';
import { PutCommand, QueryCommand, GetCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
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
                    ':entityValue': 'ENTITY',
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

    /**
     * Delete a user from the database
     * @param userId The ID of the user to delete
     * @returns True if successful
     * @throws AppError if operation fails
     */
    async deleteUser(userId: string): Promise<boolean> {
        try {
            if (!TABLE_NAME) {
                throw new AppError('Table name not configured', 500);
            }

            // First get the user to find their email
            const user = await this.getUserById(userId);
            if (!user) {
                throw new AppError('User not found', 404);
            }

            // Prepare batch delete for user records
            const deleteRequests = [
                // Delete primary user record
                {
                    DeleteRequest: {
                        Key: {
                            PK: `USER#${userId}`,
                            SK: 'ENTITY'
                        }
                    }
                }
            ];

            // Add email index record if available
            if (user.email) {
                deleteRequests.push({
                    DeleteRequest: {
                        Key: {
                            PK: `EMAIL#${user.email}`,
                            SK: 'ENTITY'
                        }
                    }
                });
            }

            // Execute batch delete
            const requestItems: Record<string, any> = {};
            requestItems[TABLE_NAME] = deleteRequests;

            await dynamoDb.send(
                new BatchWriteCommand({
                    RequestItems: requestItems
                })
            );

            return true;
        } catch (error: any) {
            throw new AppError(`Failed to delete user: ${error.message}`, 500);
        }
    }

    /**
  * Delete all organization memberships for a user
  * @param userId The ID of the user
  * @returns True if successful
  * @throws AppError if operation fails
  */
    async deleteUserOrganizationMemberships(userId: string): Promise<boolean> {
        try {
            // Make sure TABLE_NAME is defined
            if (!TABLE_NAME) {
                throw new AppError('Table name not configured', 500);
            }

            // First get all organizations the user is a member of
            const params = {
                TableName: TABLE_NAME,
                KeyConditionExpression: 'PK = :userId AND begins_with(SK, :orgPrefix)',
                ExpressionAttributeValues: {
                    ':userId': `USER#${userId}`,
                    ':orgPrefix': 'ORG#'
                }
            };

            const result = await dynamoDb.send(new QueryCommand(params));

            // No memberships found - consider it a success
            if (!result.Items || result.Items.length === 0) {
                return true;
            }

            // Prepare batch request for delete - DynamoDB can handle 25 at a time
            const chunks = [];
            for (let i = 0; i < result.Items.length; i += 25) {
                chunks.push(result.Items.slice(i, i + 25));
            }

            // Process each chunk as a batch
            for (const chunk of chunks) {
                const deleteRequests = chunk.map(item => ({
                    DeleteRequest: {
                        Key: {
                            PK: item.PK,
                            SK: item.SK
                        }
                    }
                }));

                const requestItems: Record<string, any> = {};
                requestItems[TABLE_NAME] = deleteRequests;

                await dynamoDb.send(
                    new BatchWriteCommand({
                        RequestItems: requestItems
                    })
                );
            }

            return true;
        } catch (error: any) {
            throw new AppError(`Failed to delete user memberships: ${error.message}`, 500);
        }
    }
}


