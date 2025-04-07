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

// Mock UserService
jest.mock('../src/services/userService', () => {
    return {
        UserService: jest.fn().mockImplementation(() => {
            return {
                getUserByEmail: jest.fn().mockResolvedValue({
                    id: 'test-user-id',
                    email: 'test@example.com',
                    firstName: 'Test',
                    lastName: 'User',
                    role: 'ADMIN'
                })
            };
        })
    };
});

// Import dependencies after mocks are set up
import request from 'supertest';
import express from 'express';
import { dynamoDb } from '../src/config/db';
import { s3Client, getSignedUrl } from '../src/config/s3';
import { Photo } from '../src/models/Photo';
import { Event } from '../src/models/Event';
import jwt from 'jsonwebtoken';
import { UserRole } from '../src/models/User';
import { photoRouter } from '../src/controllers/photoController';
import { setupTestEnvironment } from './utils/test-utils';
import { errorHandler } from '../src/middleware/errorHandler';

// Cast mocks for type safety
const mockDynamoSend = dynamoDb.send as jest.Mock;
const mockGetSignedUrl = getSignedUrl as jest.Mock;
const mockS3Send = s3Client.send as jest.Mock;

describe('Photo Controller Integration Tests', () => {
    let app: express.Application;
    const validToken = 'valid-jwt-token';
    const testOrgId = 'test-org';
    const testEventId = 'test-event-id';
    const testUserId = 'test-user-id';
    
    // Mock user details for authentication
    const mockUser = {
        id: testUserId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.ADMIN
    };

    // Mock event for tests
    const mockEvent: Partial<Event> = {
        id: testEventId,
        title: 'Test Event',
        description: 'Test Event Description',
        isPublic: true
    };

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
            s3Key: 'photos/test-event-id/test-photo-uuid.jpg'
        }
    };

    beforeAll(() => {
        // Set up environment variables
        setupTestEnvironment();
        
        // Increase Jest timeout to avoid timeouts
        jest.setTimeout(30000);
    });

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Create a fresh Express app for each test
        app = express();
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        // Mock middleware for authentication - key change here
        app.use((req, res, next) => {
            // Set auth headers and mock user in res.locals
            req.headers.authorization = `Bearer ${validToken}`;
            res.locals = {
                user: {
                    id: testUserId,
                    email: mockUser.email,
                    role: UserRole.ADMIN,
                    // Include full user info to avoid the need for getUserByEmail
                    info: mockUser
                }
            };
            next();
        });

        // Add the photoRouter before error handling
        app.use(`/organizations`, photoRouter);
        
        // Add error handler at the end
        app.use(errorHandler);

        // Mock jwt.verify
        jest.spyOn(jwt, 'verify').mockImplementation(() => ({
            id: testUserId,
            email: mockUser.email,
            role: UserRole.ADMIN
        }));
    });

    describe('POST /:id/events/:eventId/photos', () => {
        it('should upload a photo successfully', async () => {
            // Mock findEventById to return a valid event
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Item: {
                        ...mockEvent,
                        PK: `EVENT#${testEventId}`,
                        SK: 'ENTITY'
                    }
                });
            });
            
            // Mock createPhoto
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({});
            });

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
            // Mock findEventById to return null (event not found)
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Item: null
                });
            });

            const response = await request(app)
                .post(`/organizations/${testOrgId}/events/${testEventId}/photos`)
                .field('title', 'Test Photo')
                .field('description', 'Test Photo Description')
                .attach('photo', Buffer.from('mock file content'), 'test-photo.jpg')
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('Event not found');
        });
    });

    describe('GET /:id/events/:eventId/photos', () => {
        it('should retrieve photos for an event successfully', async () => {
            // Mock findEventById to return a valid event
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Item: {
                        ...mockEvent,
                        PK: `EVENT#${testEventId}`,
                        SK: 'ENTITY'
                    }
                });
            });
            
            // Mock getPhotosByEvent
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Items: [
                        { ...mockPhoto, id: 'photo-1' },
                        { ...mockPhoto, id: 'photo-2' }
                    ]
                });
            });

            const response = await request(app)
                .get(`/organizations/${testOrgId}/events/${testEventId}/photos`)
                .expect(200);

            // Verify response structure
            expect(response.body.status).toBe('success');
            expect(response.body.data.photos).toBeDefined();
            expect(response.body.data.photos.length).toBe(2);
        });
    });

    describe('DELETE /:id/events/:eventId/photos/:photoId', () => {
        const testPhotoId = 'test-photo-id';

        it('should delete a photo successfully', async () => {
            // Mock findEventById to return a valid event
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Item: {
                        ...mockEvent,
                        PK: `EVENT#${testEventId}`,
                        SK: 'ENTITY'
                    }
                });
            });
            
            // Mock getPhotoById
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
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
            });
            
            // Mock deletePhoto
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({});
            });

            const response = await request(app)
                .delete(`/organizations/${testOrgId}/events/${testEventId}/photos/${testPhotoId}`)
                .expect(200);

            // Verify response structure
            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Photo deleted successfully');
        });
    });
});