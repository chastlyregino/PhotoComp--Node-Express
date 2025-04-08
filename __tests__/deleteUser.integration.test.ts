// __tests__/deleteUser.integration.test.ts

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
    GetCommand: jest.fn(),
    DeleteCommand: jest.fn(),
    BatchWriteCommand: jest.fn(),
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
            // Mock getUserById call
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Item: mockUser
                });
            });
            
            // Mock deleteUserOrganizationMemberships call
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Items: [] // No memberships
                });
            });
            
            // Mock deleteUser call
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({});
            });

            const response = await request(app)
                .delete(`/api/auth/users/user123`)
                .set('Authorization', 'Bearer valid-jwt-token')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('User deleted successfully');
            expect(mockDynamoSend).toHaveBeenCalledTimes(3);
        });

        it('should allow an admin to delete any user account', async () => {
            // Mock getUserById call
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Item: mockUser
                });
            });
            
            // Mock deleteUserOrganizationMemberships call
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Items: [] // No memberships
                });
            });
            
            // Mock deleteUser call
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({});
            });

            const response = await request(app)
                .delete(`/api/auth/users/user123`)
                .set('Authorization', 'Bearer admin-jwt-token')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('User deleted successfully');
            expect(mockDynamoSend).toHaveBeenCalledTimes(3);
        });

        it('should not allow a user to delete another user\'s account', async () => {
            const response = await request(app)
                .delete(`/api/auth/users/otheruser456`)
                .set('Authorization', 'Bearer valid-jwt-token')
                .expect(403);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Not authorized to delete this user');
            // No DB calls should be made since we fail at the authorization check
            expect(mockDynamoSend).not.toHaveBeenCalled();
        });

        it('should return 404 when user not found', async () => {
            // Mock getUserById call - user not found
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Item: null
                });
            });

            const response = await request(app)
                .delete(`/api/auth/users/user123`)
                .set('Authorization', 'Bearer valid-jwt-token')
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('User not found');
            expect(mockDynamoSend).toHaveBeenCalledTimes(1);
        });

        it('should handle database errors gracefully', async () => {
            // Mock getUserById call
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Item: mockUser
                });
            });
            
            // Mock deleteUserOrganizationMemberships call to throw an error
            mockDynamoSend.mockImplementationOnce(() => {
                throw new Error('Database connection failed');
            });

            const response = await request(app)
                .delete(`/api/auth/users/user123`)
                .set('Authorization', 'Bearer valid-jwt-token')
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('Database connection failed');
            expect(mockDynamoSend).toHaveBeenCalledTimes(2);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .delete(`/api/auth/users/user123`)
                // No Authorization header
                .expect(401);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('Authentication required');
            expect(mockDynamoSend).not.toHaveBeenCalled();
        });

        it('should delete memberships before deleting the user', async () => {
            // Mock getUserById call
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Item: mockUser
                });
            });
            
            // Mock deleteUserOrganizationMemberships - with membership results
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Items: [
                        { 
                            PK: 'USER#user123', 
                            SK: 'ORG#TESTORG'
                        }
                    ]
                });
            });
            
            // Mock batch delete for memberships
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({});
            });
            
            // Mock deleteUser call
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({});
            });

            const response = await request(app)
                .delete(`/api/auth/users/user123`)
                .set('Authorization', 'Bearer valid-jwt-token')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('User deleted successfully');
            expect(mockDynamoSend).toHaveBeenCalledTimes(4);
        });
    });
});