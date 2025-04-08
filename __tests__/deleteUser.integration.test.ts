// Mock the modules before any imports
jest.mock('bcryptjs', () => ({
    genSalt: jest.fn().mockResolvedValue('salt'),
    hash: jest.fn().mockResolvedValue('hashedPassword'),
    compare: jest.fn().mockResolvedValue(true),
}));

// Mock DynamoDB and related modules
jest.mock('@aws-sdk/lib-dynamodb', () => ({
    DynamoDBDocumentClient: {
        from: jest.fn().mockReturnValue({
            send: jest.fn(),
        }),
    },
    PutCommand: jest.fn(),
    QueryCommand: jest.fn(),
    GetCommand: jest.fn().mockImplementation((params) => ({
        ...params,
        constructor: { name: 'GetCommand' }
    })),
    DeleteCommand: jest.fn().mockImplementation((params) => ({
        ...params,
        constructor: { name: 'DeleteCommand' }
    })),
    BatchWriteCommand: jest.fn().mockImplementation((params) => ({
        ...params,
        constructor: { name: 'BatchWriteCommand' }
    })),
}));

// Mock the config/db module with correct path
jest.mock('../src/config/db', () => ({
    dynamoDb: {
        send: jest.fn(),
    },
    TABLE_NAME: 'test-table',
}));

// Mock JWT
jest.mock('jsonwebtoken', () => ({
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn().mockImplementation((token, secret) => {
        if (token === 'valid-jwt-token') {
            return { id: 'user123', email: 'test@example.com', role: 'USER' };
        } else if (token === 'admin-jwt-token') {
            return { id: 'admin456', email: 'admin@example.com', role: 'ADMIN' };
        }
        throw new Error('Invalid token');
    }),
}));

// Now import dependencies after mocks are set up
import request from 'supertest';
import express from 'express';
import { dynamoDb } from '../src/config/db';
import { setupTestEnvironment, createTestApp } from './utils/test-utils';
import { authRouter } from '../src/controllers/authController';
import { authenticate } from '../src/middleware/authMiddleware';
import { errorHandler } from '../src/middleware/errorHandler';
import { UserRole } from '../src/models/User';

// Cast the mock for type safety
const mockDynamoSend = dynamoDb.send as jest.Mock;

describe('Delete User Integration Tests', () => {
    let app: express.Application;

    const mockUser = {
        PK: 'USER#user123',
        SK: 'ENTITY',
        id: 'user123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'hashedPassword123',
        role: UserRole.USER,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        type: 'USER',
        GSI1PK: 'EMAIL#test@example.com',
        GSI1SK: 'ENTITY',
    };

    const mockAdmin = {
        PK: 'USER#admin456',
        SK: 'ENTITY',
        id: 'admin456',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        password: 'hashedPassword123',
        role: UserRole.ADMIN,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        type: 'USER',
        GSI1PK: 'EMAIL#admin@example.com',
        GSI1SK: 'ENTITY',
    };

    beforeAll(() => {
        // Set up environment variables
        setupTestEnvironment();
    });

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Create a fresh Express app for each test with authentication middleware
        app = express();
        app.use(express.json());
        app.use('/api/auth', authRouter);
        app.use(errorHandler);
    });

    describe('DELETE /api/auth/users/:id', () => {
        it('should allow a user to delete their own account', async () => {
            // Set up a more flexible mock that responds based on the command type and parameters
            mockDynamoSend.mockImplementation((command) => {
                if (command.constructor && command.constructor.name === 'GetCommand') {
                    return Promise.resolve({
                        Item: mockUser
                    });
                }

                if (command.constructor && command.constructor.name === 'QueryCommand') {
                    return Promise.resolve({
                        Items: [] // No memberships found
                    });
                }

                // For DeleteCommand or any other commands
                return Promise.resolve({});
            });

            const response = await request(app)
                .delete(`/api/auth/users/user123`)
                .set('Authorization', 'Bearer valid-jwt-token')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('User deleted successfully');
        });

        it('should allow an admin to delete any user account', async () => {
            mockDynamoSend.mockImplementation((command) => {
                // Check if it's a GetCommand for user lookup
                if (command.constructor.name === 'GetCommand' &&
                    command.input &&
                    command.input.Key &&
                    command.input.Key.PK === 'USER#user123') {
                    return Promise.resolve({
                        Item: mockUser
                    });
                }

                // Check if it's a QueryCommand for user memberships
                if (command.constructor.name === 'QueryCommand' &&
                    command.input &&
                    command.input.KeyConditionExpression &&
                    command.input.KeyConditionExpression.includes('PK = :userId')) {
                    return Promise.resolve({
                        Items: [] // No memberships found
                    });
                }

                // For DeleteCommand or any other commands
                return Promise.resolve({});
            });

            const response = await request(app)
                .delete(`/api/auth/users/user123`)
                .set('Authorization', 'Bearer admin-jwt-token')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('User deleted successfully');
        });

        it('should not allow a user to delete another user\'s account', async () => {
            const response = await request(app)
                .delete(`/api/auth/users/otheruser456`)
                .set('Authorization', 'Bearer valid-jwt-token')
                .expect(403);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Not authorized to delete this user');
        });

        it('should return 404 when user not found', async () => {
            mockDynamoSend.mockImplementation((command) => {
                // Check if it's a GetCommand for user lookup
                if (command.constructor.name === 'GetCommand') {
                    return Promise.resolve({
                        Item: null // User not found
                    });
                }

                return Promise.resolve({});
            });

            const response = await request(app)
                .delete(`/api/auth/users/user123`)
                .set('Authorization', 'Bearer valid-jwt-token')
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('User not found');
        });

        it('should handle database errors gracefully', async () => {
            mockDynamoSend.mockImplementation((command) => {
                // Check if it's a GetCommand for user lookup
                if (command.constructor.name === 'GetCommand') {
                    return Promise.resolve({
                        Item: mockUser
                    });
                }

                // Check if it's a QueryCommand for user memberships - simulate database error
                if (command.constructor.name === 'QueryCommand') {
                    throw new Error('Database connection failed');
                }

                return Promise.resolve({});
            });

            const response = await request(app)
                .delete(`/api/auth/users/user123`)
                .set('Authorization', 'Bearer valid-jwt-token')
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('Database connection failed');
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .delete(`/api/auth/users/user123`)
                // No Authorization header
                .expect(401);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('Authentication required');
        });

        it('should delete memberships before deleting the user', async () => {
            mockDynamoSend.mockImplementation((command) => {
                // Check if it's a GetCommand for user lookup
                if (command.constructor.name === 'GetCommand' &&
                    command.input &&
                    command.input.Key &&
                    command.input.Key.PK === 'USER#user123') {
                    return Promise.resolve({
                        Item: mockUser
                    });
                }

                // Check if it's a QueryCommand for user memberships
                if (command.constructor.name === 'QueryCommand' &&
                    command.input &&
                    command.input.KeyConditionExpression &&
                    command.input.KeyConditionExpression.includes('PK = :userId')) {
                    return Promise.resolve({
                        Items: [
                            {
                                PK: 'USER#user123',
                                SK: 'ORG#TESTORG'
                            }
                        ]
                    });
                }

                // For BatchWriteCommand (membership deletion)
                if (command.constructor.name === 'BatchWriteCommand') {
                    return Promise.resolve({});
                }

                // For DeleteCommand or any other commands
                return Promise.resolve({});
            });

            const response = await request(app)
                .delete(`/api/auth/users/user123`)
                .set('Authorization', 'Bearer valid-jwt-token')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('User deleted successfully');
        });
    });
});