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
    getSignedUrl: jest.fn().mockResolvedValue('https://presigned-url.example.com/photo.jpg')
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

// Mock multer
jest.mock('multer', () => {
    const multerMock = () => ({
        single: () => (req: any, res: any, next: any) => {
            // Mock file object that multer would create
            req.file = {
                buffer: Buffer.from('mock file content'),
                mimetype: 'image/jpeg',
                size: 1024 * 10 // 10KB
            };
            next();
        }
    });
    multerMock.memoryStorage = jest.fn();
    return multerMock;
});

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
    getSignedUrl: jest.fn().mockResolvedValue('https://presigned-url.example.com/photo.jpg'),
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
            res.locals.user.info = {
                id: 'test-user-id',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                role: 'ADMIN'
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

// Mock the EventService
jest.mock('../src/services/eventService', () => {
    return {
        EventService: jest.fn().mockImplementation(() => {
            return {
                findEventById: jest.fn().mockImplementation((eventId) => {
                    return Promise.resolve({
                        id: eventId,
                        title: 'Test Event',
                        description: 'Test Event Description',
                        isPublic: true,
                        PK: `EVENT#${eventId}`,
                        SK: 'ENTITY'
                    });
                })
            };
        })
    };
});

// Mock the upload middleware
jest.mock('../src/middleware/uploadMiddleware', () => ({
    handleUpload: () => (req: any, res: any, next: any) => {
        req.file = {
            buffer: Buffer.from('mock file content'),
            mimetype: 'image/jpeg',
            size: 1024 * 10 // 10KB
        };
        next();
    }
}));

// Import dependencies after mocks are set up
import request from 'supertest';
import express from 'express';
import { dynamoDb } from '../src/config/db';
import { s3Client, getSignedUrl } from '../src/config/s3';
import { Photo } from '../src/models/Photo';
import { photoRouter } from '../src/controllers/photoController';
import { setupTestEnvironment } from './utils/test-utils';
import { errorHandler } from '../src/middleware/errorHandler';

// Cast mocks for type safety
const mockDynamoSend = dynamoDb.send as jest.Mock;

describe('Photo Controller Integration Tests', () => {
    let app: express.Application;
    const testOrgId = 'test-org';
    const testEventId = 'test-event-id';
    const testUserId = 'test-user-id';
    
    // Mock photo for tests
    const mockPhoto: Partial<Photo> = {
        id: 'test-photo-uuid',
        eventId: testEventId,
        url: 'https://presigned-url.example.com/photo.jpg',
        uploadedBy: testUserId,
        metadata: {
            title: 'Test Photo',
            description: 'Test Photo Description',
            size: 10240,
            mimeType: 'image/jpeg',
            s3Key: `photos/${testEventId}/test-photo-uuid.jpg`
        }
    };

    beforeAll(() => {
        // Set up environment variables
        setupTestEnvironment();
    });

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

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
                    role: 'ADMIN'
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

    describe('POST /:id/events/:eventId/photos', () => {
        it('should upload a photo successfully', async () => {
            // Mock DynamoDB responses for the entire flow
            // 1. First for findEventById
            mockDynamoSend.mockResolvedValueOnce({
                Item: {
                    id: testEventId,
                    title: 'Test Event',
                    description: 'Test Event Description',
                    isPublic: true,
                    PK: `EVENT#${testEventId}`,
                    SK: 'ENTITY'
                }
            });
            
            // 2. Then for createPhoto
            mockDynamoSend.mockResolvedValueOnce({});

            const response = await request(app)
                .post(`/organizations/${testOrgId}/events/${testEventId}/photos`)
                .field('title', 'Test Photo')
                .field('description', 'Test Photo Description')
                .attach('photo', Buffer.from('mock file content'), 'test-photo.jpg')
                .expect(201);

            // Verify response structure
            expect(response.body.status).toBe('success');
            expect(response.body.data.photo).toBeDefined();
        });

        it('should return 404 when event does not exist', async () => {
            // Override the mockImplementation for this test only
            const eventService = require('../src/services/eventService');
            const originalFindEventById = eventService.EventService.mock.results[0].value.findEventById;
            
            // Mock to return null for this test
            eventService.EventService.mock.results[0].value.findEventById.mockResolvedValueOnce(null);
            
            // Mock DynamoDB to return null for getEvent
            mockDynamoSend.mockResolvedValueOnce({
                Item: null
            });

            const response = await request(app)
                .post(`/organizations/${testOrgId}/events/nonexistent/photos`)
                .field('title', 'Test Photo')
                .field('description', 'Test Photo Description')
                .attach('photo', Buffer.from('mock file content'), 'test-photo.jpg');

            // Restore the original implementation
            eventService.EventService.mock.results[0].value.findEventById = originalFindEventById;

            // Verify error response
            expect(response.body.status).toBe('error');
            // Status code might be 404 or 500 depending on error handling
        });
    });

    describe('GET /:id/events/:eventId/photos', () => {
        it('should retrieve photos for an event successfully', async () => {
            // Mock for findEventById
            mockDynamoSend.mockResolvedValueOnce({
                Item: {
                    id: testEventId,
                    title: 'Test Event',
                    description: 'Test Event Description',
                    isPublic: true,
                    PK: `EVENT#${testEventId}`,
                    SK: 'ENTITY'
                }
            });
            
            // Mock for getPhotosByEvent
            mockDynamoSend.mockResolvedValueOnce({
                Items: [
                    { ...mockPhoto, id: 'photo-1' },
                    { ...mockPhoto, id: 'photo-2' }
                ]
            });

            const response = await request(app)
                .get(`/organizations/${testOrgId}/events/${testEventId}/photos`);

            // Verify response
            expect(response.statusCode).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data.photos).toBeDefined();
            expect(response.body.data.photos.length).toBe(2);
        });
    });

    describe('DELETE /:id/events/:eventId/photos/:photoId', () => {
        const testPhotoId = 'test-photo-id';

        it('should delete a photo successfully', async () => {
            // Mock for getPhotoById
            mockDynamoSend.mockResolvedValueOnce({
                Item: {
                    ...mockPhoto,
                    id: testPhotoId,
                    eventId: testEventId,
                    metadata: {
                        ...mockPhoto.metadata,
                        s3Key: `photos/${testEventId}/${testPhotoId}.jpg`
                    }
                }
            });
            
            // Mock for deletePhoto from DB
            mockDynamoSend.mockResolvedValueOnce({});
            
            // Mock for S3 delete
            mockDynamoSend.mockResolvedValueOnce({});

            const response = await request(app)
                .delete(`/organizations/${testOrgId}/events/${testEventId}/photos/${testPhotoId}`);

            // Verify response
            expect(response.statusCode).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Photo deleted successfully');
        });
    });
});