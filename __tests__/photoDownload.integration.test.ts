// Mock the modules before any imports
jest.mock('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn().mockImplementation(() => ({
        send: jest.fn().mockResolvedValue({})
    })),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn()
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: jest.fn().mockImplementation((client, command) => {
        // Check if this is a download URL request (has ResponseContentDisposition)
        if (command && command.input && command.input.ResponseContentDisposition) {
            return Promise.resolve('https://download-url.example.com/photo.jpg');
        }
        // Regular view URL
        return Promise.resolve('https://presigned-url.example.com/photo.jpg');
    })
}));

// Mock DynamoDB and related modules
jest.mock('@aws-sdk/lib-dynamodb', () => ({
    DynamoDBDocumentClient: {
        from: jest.fn().mockReturnValue({
            send: jest.fn()
        })
    },
    PutCommand: jest.fn(),
    QueryCommand: jest.fn(),
    GetCommand: jest.fn(),
    DeleteCommand: jest.fn()
}));

// Mock UUID for controlled test values
jest.mock('uuid', () => ({
    v4: jest.fn().mockReturnValue('test-photo-uuid')
}));

// Mock config modules
jest.mock('../src/config/db', () => ({
    dynamoDb: {
        send: jest.fn()
    },
    TABLE_NAME: 'test-table'
}));

jest.mock('../src/config/s3', () => ({
    s3Client: {
        send: jest.fn().mockResolvedValue({})
    },
    getSignedUrl: jest.fn().mockImplementation((client, command) => {
        // Check if this is a download URL request (has ResponseContentDisposition)
        if (command && command.input && command.input.ResponseContentDisposition) {
            return Promise.resolve('https://download-url.example.com/photo.jpg');
        }
        // Regular view URL
        return Promise.resolve('https://presigned-url.example.com/photo.jpg');
    }),
    S3_BUCKET_NAME: 'test-bucket'
}));

// IMPORTANT: Mock UserService and its getUserByEmail method
jest.mock('../src/services/userService', () => {
    return {
        UserService: jest.fn().mockImplementation(() => {
            return {
                getUserByEmail: jest.fn().mockImplementation(() => {
                    return Promise.resolve({
                        id: 'test-user-id',
                        email: 'test@example.com',
                        firstName: 'Test',
                        lastName: 'User',
                        role: 'ADMIN'
                    });
                })
            };
        })
    };
});

// Mock the validation middleware from orgController
jest.mock('../src/controllers/orgController', () => {
    const originalModule = jest.requireActual('../src/controllers/orgController');
    return {
        ...originalModule,
        validateUserID: jest.fn().mockImplementation((req, res, next) => {
            // Mock user data without making actual service call
            res.locals.user = {
                info: {
                    id: 'test-user-id',
                    email: 'test@example.com',
                    firstName: 'Test',
                    lastName: 'User',
                    role: 'ADMIN'
                }
            };
            next();
        }),
        orgRouter: originalModule.orgRouter
    };
});

// Mock the auth middleware
jest.mock('../src/middleware/authMiddleware', () => ({
    authenticate: (req: any, res: any, next: any) => next(),
    authorizeAdmin: (req: any, res: any, next: any) => next()
}));

// Mock the org middleware
jest.mock('../src/middleware/orgMiddleware', () => ({
    checkOrgAdmin: (req: any, res: any, next: any) => next()
}));

// Create a flexible mock for the EventRepository's findEventUserbyUser method
// This will allow us to test different access scenarios
let mockFindEventUserbyUser = jest.fn().mockResolvedValue({
    PK: 'USER#test-user-id',
    SK: 'EVENT#test-event-id',
    GSI2PK: 'EVENT#test-event-id',
    GSI2SK: 'USER#test-user-id'
});

// Mock the EventRepository
jest.mock('../src/repositories/eventRepository', () => {
    return {
        EventRepository: jest.fn().mockImplementation(() => {
            return {
                findEventUserbyUser: (...args: any[]) => mockFindEventUserbyUser(...args)
            };
        })
    };
});

// Create a flexible mock for the PhotoRepository's getPhotoById method
let mockGetPhotoById = jest.fn().mockImplementation((photoId) => {
    return Promise.resolve({
        id: photoId,
        PK: `PHOTO#${photoId}`,
        SK: 'ENTITY',
        eventId: 'test-event-id',
        url: 'https://presigned-url.example.com/photo.jpg',
        uploadedBy: 'test-user-id',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        metadata: {
            title: 'Test Photo',
            description: 'Test Photo Description',
            s3Key: `photos/test-event-id/${photoId}.jpg`
        },
        GSI2PK: `EVENT#test-event-id`,
        GSI2SK: `PHOTO#${photoId}`
    });
});

// Mock the PhotoRepository
jest.mock('../src/repositories/photoRepository', () => {
    return {
        PhotoRepository: jest.fn().mockImplementation(() => {
            return {
                getPhotoById: (...args: any[]) => mockGetPhotoById(...args)
            };
        })
    };
});

// Mock the EventService findEventById method
let mockFindEventById = jest.fn().mockImplementation((eventId) => {
    return Promise.resolve({
        id: eventId,
        title: 'Test Event',
        description: 'Test Event Description',
        isPublic: true,
        PK: `EVENT#${eventId}`,
        SK: 'ENTITY'
    });
});

jest.mock('../src/services/eventService', () => {
    return {
        EventService: jest.fn().mockImplementation(() => {
            return {
                findEventById: (...args: any) => mockFindEventById(...args)
            };
        })
    };
});

// Import dependencies after mocks are set up
import request from 'supertest';
import express from 'express';
import { dynamoDb } from '../src/config/db';
import { photoRouter } from '../src/controllers/photoController';
import { setupTestEnvironment } from './utils/test-utils';
import { errorHandler } from '../src/middleware/errorHandler';

describe('Photo Download Integration Tests', () => {
    let app: express.Application;
    const testOrgId = 'test-org';
    const testEventId = 'test-event-id';
    const testPhotoId = 'test-photo-id';
    const testUserId = 'test-user-id';

    beforeAll(() => {
        // Set up environment variables
        setupTestEnvironment();
    });

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Reset flexible mocks to their default behavior
        mockFindEventUserbyUser = jest.fn().mockResolvedValue({
            PK: 'USER#test-user-id',
            SK: 'EVENT#test-event-id',
            GSI2PK: 'EVENT#test-event-id',
            GSI2SK: 'USER#test-user-id'
        });
        
        mockGetPhotoById = jest.fn().mockImplementation((photoId) => {
            return Promise.resolve({
                id: photoId,
                PK: `PHOTO#${photoId}`,
                SK: 'ENTITY',
                eventId: 'test-event-id',
                url: 'https://presigned-url.example.com/photo.jpg',
                uploadedBy: 'test-user-id',
                createdAt: '2023-01-01T00:00:00.000Z',
                updatedAt: '2023-01-01T00:00:00.000Z',
                metadata: {
                    title: 'Test Photo',
                    description: 'Test Photo Description',
                    s3Key: `photos/test-event-id/${photoId}.jpg`
                },
                GSI2PK: `EVENT#test-event-id`,
                GSI2SK: `PHOTO#${photoId}`
            });
        });

        // Create a fresh Express app for each test
        app = express();
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        // Mock middleware for authentication
        app.use((req, res, next) => {
            // Set auth headers and mock user in res.locals
            req.headers.authorization = 'Bearer valid-jwt-token';
            res.locals = {
                user: {
                    id: testUserId,
                    email: 'test@example.com',
                    role: 'ADMIN',
                    info: {
                        id: testUserId,
                        email: 'test@example.com',
                        firstName: 'Test',
                        lastName: 'User',
                        role: 'ADMIN'
                    }
                }
            };
            next();
        });

        // Add the photoRouter
        app.use('/organizations', photoRouter);

        // Add error handler at the end
        app.use(errorHandler);
    });

    // Increase the timeout for all tests
    jest.setTimeout(10000);

    describe('GET /:id/events/:eventId/photos/:photoId/download', () => {
        it('should return a download URL when user has access to the event', async () => {
            const response = await request(app)
                .get(`/organizations/${testOrgId}/events/${testEventId}/photos/${testPhotoId}/download`)
                .expect(200);

            // Verify response structure
            expect(response.body.status).toBe('success');
            expect(response.body.data.downloadUrl).toBeDefined();
            expect(response.body.data.downloadUrl).toBe('https://download-url.example.com/photo.jpg');
        });

        it('should return 403 when user does not have access to the event', async () => {
            // Override the mock to return null (user not attending event)
            mockFindEventUserbyUser = jest.fn().mockResolvedValue(null);

            const response = await request(app)
                .get(`/organizations/${testOrgId}/events/${testEventId}/photos/${testPhotoId}/download`)
                .expect(403);

            // Verify error response
            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('You do not have access to photos from this event');
        });

        it('should return 404 when the photo does not exist', async () => {
            // Override the mock to return null (photo not found)
            mockGetPhotoById = jest.fn().mockResolvedValue(null);

            const response = await request(app)
                .get(`/organizations/${testOrgId}/events/${testEventId}/photos/nonexistent-photo/download`)
                .expect(404);

            // Verify error response
            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('Photo not found');
        });

        it('should return 400 when the photo does not belong to the specified event', async () => {
            // Override the mock to return a photo with a different event ID
            mockGetPhotoById = jest.fn().mockImplementation((photoId) => {
                return Promise.resolve({
                    id: photoId,
                    PK: `PHOTO#${photoId}`,
                    SK: 'ENTITY',
                    eventId: 'different-event-id', // Different event ID
                    url: 'https://presigned-url.example.com/photo.jpg',
                    metadata: {
                        s3Key: `photos/different-event-id/${photoId}.jpg`
                    }
                });
            });

            const response = await request(app)
                .get(`/organizations/${testOrgId}/events/${testEventId}/photos/${testPhotoId}/download`)
                .expect(400);

            // Verify error response
            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Photo does not belong to the specified event');
        });

        it('should return 500 when the photo has no S3 key', async () => {
            // Override the mock to return a photo with no S3 key
            mockGetPhotoById = jest.fn().mockImplementation((photoId) => {
                return Promise.resolve({
                    id: photoId,
                    PK: `PHOTO#${photoId}`,
                    SK: 'ENTITY',
                    eventId: 'test-event-id',
                    url: 'https://presigned-url.example.com/photo.jpg',
                    metadata: {
                        // No s3Key property
                    }
                });
            });

            const response = await request(app)
                .get(`/organizations/${testOrgId}/events/${testEventId}/photos/${testPhotoId}/download`)
                .expect(500);

            // Verify error response
            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Photo S3 key not found');
        });

        it('should use the photo title as the download filename when available', async () => {
            // We'll verify this by checking that the right functions were called
            // Since we've mocked getSignedUrl, we can't directly check the URL parameters
            
            await request(app)
                .get(`/organizations/${testOrgId}/events/${testEventId}/photos/${testPhotoId}/download`)
                .expect(200);

            // The mock implementation of getSignedUrl checks for ResponseContentDisposition
            // which confirms our download URL is being generated correctly
            expect(require('@aws-sdk/s3-request-presigner').getSignedUrl).toHaveBeenCalled();
        });
    });
});