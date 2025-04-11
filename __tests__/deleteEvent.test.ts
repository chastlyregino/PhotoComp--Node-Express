// Mock the modules before any imports
jest.mock('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn().mockImplementation(() => ({
        send: jest.fn().mockResolvedValue({}),
    })),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: jest.fn().mockResolvedValue('https://presigned-url.example.com/photo.jpg'),
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
}));

// Mock config modules
jest.mock('../src/config/db', () => ({
    dynamoDb: {
        send: jest.fn(),
    },
    TABLE_NAME: 'test-table',
}));

// Mock the EventService
jest.mock('../src/services/eventService', () => {
    return {
        EventService: jest.fn().mockImplementation(() => {
            return {
                deleteEvent: jest.fn().mockImplementation((orgName, eventId, adminId) => {
                    // Default implementation is successful deletion
                    return Promise.resolve(true);
                }),
                findEventById: jest.fn().mockImplementation(eventId => {
                    return Promise.resolve({
                        id: eventId,
                        title: 'Test Event',
                        description: 'Test Event Description',
                        isPublic: true,
                        PK: `EVENT#${eventId}`,
                        SK: 'ENTITY',
                        GSI2PK: 'ORG#TEST-ORG',
                        GSI2SK: `EVENT#${eventId}`,
                    });
                }),
            };
        }),
    };
});

// Mock the UserService
jest.mock('../src/services/userService', () => {
    return {
        UserService: jest.fn().mockImplementation(() => {
            return {
                getUserByEmail: jest.fn().mockImplementation(() => {
                    return Promise.resolve({
                        id: 'test-admin-id',
                        email: 'admin@example.com',
                        firstName: 'Admin',
                        lastName: 'User',
                        role: 'ADMIN',
                    });
                }),
            };
        }),
    };
});

// Mock the auth middleware
jest.mock('../src/middleware/authMiddleware', () => ({
    authenticate: (req: any, res: any, next: any) => next(),
    authorizeAdmin: (req: any, res: any, next: any) => next(),
}));

// Mock the org middleware
jest.mock('../src/middleware/OrgMiddleware', () => ({
    checkOrgAdmin: (req: any, res: any, next: any) => next(),
    checkOrgMember: (req: any, res: any, next: any) => next(),
    validateUserID: (req: any, res: any, next: any) => {
        res.locals.user = {
            info: {
                id: 'test-admin-id',
                email: 'admin@example.com',
                firstName: 'Admin',
                lastName: 'User',
                role: 'ADMIN',
            },
        };
        next();
    },
}));

// Create a named mock function we can manipulate directly in tests
const mockDeleteEvent = jest.fn().mockResolvedValue(true);
const mockFindEventById = jest.fn().mockImplementation((eventId: string) => {
    return Promise.resolve({
        id: eventId,
        title: 'Test Event',
        description: 'Test Event Description',
        isPublic: true,
        PK: `EVENT#${eventId}`,
        SK: 'ENTITY',
        GSI2PK: 'ORG#TEST-ORG',
        GSI2SK: `EVENT#${eventId}`,
    });
});

// Update the EventService mock to use our direct mock functions
jest.mock('../src/services/eventService', () => {
    return {
        EventService: jest.fn().mockImplementation(() => {
            return {
                deleteEvent: (orgName: string, eventId: string, adminId: string) => mockDeleteEvent(orgName, eventId, adminId),
                findEventById: (eventId: string) => mockFindEventById(eventId),
            };
        }),
    };
});

// Import dependencies after mocks are set up
import request from 'supertest';
import express from 'express';
import { eventRouter } from '../src/controllers/eventController';
import { setupTestEnvironment } from './utils/test-utils';
import { errorHandler } from '../src/middleware/errorHandler';
import { AppError } from '../src/middleware/errorHandler';

describe('Delete Event Integration Tests', () => {
    let app: express.Application;
    const testOrgId = 'test-org';
    const testEventId = 'test-event-id';
    const testAdminId = 'test-admin-id';

    beforeAll(() => {
        // Set up environment variables
        setupTestEnvironment();
    });

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Reset the mock functions to their default behavior
        mockDeleteEvent.mockClear().mockResolvedValue(true);

        // Create a fresh Express app for each test
        app = express();
        app.use(express.json());

        // Setup mock middleware to set user in res.locals
        app.use((req, res, next) => {
            res.locals.user = {
                id: testAdminId,
                email: 'admin@example.com',
                role: 'ADMIN',
                info: {
                    id: testAdminId,
                    email: 'admin@example.com',
                    firstName: 'Admin',
                    lastName: 'User',
                    role: 'ADMIN',
                },
            };
            next();
        });

        // Mount the routes
        app.use('/organizations/:orgId/events', eventRouter);

        // Add error handler at the end
        app.use(errorHandler);
    });

    describe('DELETE /organizations/:id/events/:eventId/admin', () => {
        it('should successfully delete an event', async () => {
            const response = await request(app)
                .delete(`/organizations/${testOrgId}/events/${testEventId}/admin`)
                .expect(200);

            // Verify response structure
            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Event deleted successfully');

            // Verify our mock function was called with correct parameters
            expect(mockDeleteEvent).toHaveBeenCalledWith(
                testOrgId,
                testEventId,
                testAdminId
            );
        });

        it('should return 404 when event is not found', async () => {
            // Mock the deleteEvent function to throw a not found error
            mockDeleteEvent.mockRejectedValueOnce(
                new AppError('Event not found', 404)
            );

            const response = await request(app)
                .delete(`/organizations/${testOrgId}/events/${testEventId}/admin`)
                .expect(404);

            // Verify response structure
            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Event not found');

            // Verify our mock function was called with correct parameters
            expect(mockDeleteEvent).toHaveBeenCalledWith(
                testOrgId,
                testEventId,
                testAdminId
            );
        });

        it('should return 403 when event does not belong to the organization', async () => {
            // Mock the deleteEvent function to throw a forbidden error
            mockDeleteEvent.mockRejectedValueOnce(
                new AppError('Event does not belong to this organization', 403)
            );

            const response = await request(app)
                .delete(`/organizations/${testOrgId}/events/${testEventId}/admin`)
                .expect(403);

            // Verify response structure
            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Event does not belong to this organization');

            // Verify our mock function was called with correct parameters
            expect(mockDeleteEvent).toHaveBeenCalledWith(
                testOrgId,
                testEventId,
                testAdminId
            );
        });

        it('should handle internal server errors gracefully', async () => {
            // Mock the deleteEvent function to throw a generic error
            mockDeleteEvent.mockRejectedValueOnce(
                new Error('Database connection error')
            );

            const response = await request(app)
                .delete(`/organizations/${testOrgId}/events/${testEventId}/admin`)
                .expect(500);

            // Verify response structure
            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Database connection error');

            // Verify our mock function was called with correct parameters
            expect(mockDeleteEvent).toHaveBeenCalledWith(
                testOrgId,
                testEventId,
                testAdminId
            );
        });

        it('should handle failures during photo deletion process', async () => {
            // Mock the deleteEvent function to indicate failure in one of the deletion steps
            mockDeleteEvent.mockRejectedValueOnce(
                new AppError('Failed to delete photo: S3 deletion failed', 500)
            );

            const response = await request(app)
                .delete(`/organizations/${testOrgId}/events/${testEventId}/admin`)
                .expect(500);

            // Verify response structure
            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Failed to delete photo: S3 deletion failed');

            // Verify our mock function was called with correct parameters
            expect(mockDeleteEvent).toHaveBeenCalledWith(
                testOrgId,
                testEventId,
                testAdminId
            );
        });
    });
});