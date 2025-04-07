// Mock the modules before any imports
jest.mock('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn().mockImplementation(() => ({
        send: jest.fn()
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
        send: jest.fn()
    },
    getSignedUrl: jest.fn().mockResolvedValue('https://presigned-url.example.com/photo.jpg'),
    S3_BUCKET_NAME: 'test-bucket'
}));

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
    });

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Create a fresh Express app for each test
        app = express();
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        app.use(errorHandler);

        // Mock middleware for authentication
        app.use((req, res, next) => {
            // Set auth headers and mock user in res.locals
            req.headers.authorization = `Bearer ${validToken}`;
            res.locals = {
                user: {
                    id: testUserId,
                    email: mockUser.email,
                    role: UserRole.ADMIN,
                    info: mockUser
                }
            };
            next();
        });

        // Add the photoRouter
        app.use(`/organizations`, photoRouter);

        // Mock jwt.verify
        jest.spyOn(jwt, 'verify').mockImplementation(() => ({
            id: testUserId,
            email: mockUser.email,
            role: UserRole.ADMIN
        }));
    });

    describe('POST /:id/events/:eventId/photos', () => {
        it('should upload a photo successfully', async () => {
            // Mock DynamoDB responses
            // 1. First for finding the event
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Item: mockEvent
                });
            });
            
            // 2. For saving the photo record
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({});
            });

            // Mock S3 response for upload
            mockS3Send.mockImplementationOnce(() => {
                return Promise.resolve({});
            });

            // Mock pre-signed URL generation
            mockGetSignedUrl.mockResolvedValueOnce('https://presigned-url.example.com/photo.jpg');

            const response = await request(app)
                .post(`/organizations/${testOrgId}/events/${testEventId}/photos`)
                .field('title', 'Test Photo')
                .field('description', 'Test Photo Description')
                .attach('photo', Buffer.from('mock file content'), 'test-photo.jpg')
                .expect(201);

            // Verify response structure
            expect(response.body.status).toBe('success');
            expect(response.body.data.photo).toBeDefined();
            
            // Verify photo data
            const photo = response.body.data.photo;
            expect(photo.id).toBe('test-photo-uuid');
            expect(photo.eventId).toBe(testEventId);
            expect(photo.url).toBe('https://presigned-url.example.com/photo.jpg');
            expect(photo.uploadedBy).toBe(testUserId);
            
            // Verify metadata
            expect(photo.metadata.title).toBe('Test Photo');
            expect(photo.metadata.description).toBe('Test Photo Description');

            // Verify S3 was called for upload
            expect(mockS3Send).toHaveBeenCalledTimes(1);
            
            // Verify DynamoDB was called twice (find event, create photo)
            expect(mockDynamoSend).toHaveBeenCalledTimes(2);
        });
        
        it('should return 404 when event does not exist', async () => {
            // Mock DynamoDB response - no event found
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

            // Verify S3 was not called for upload
            expect(mockS3Send).not.toHaveBeenCalled();
            
            // Verify DynamoDB was called only once (find event)
            expect(mockDynamoSend).toHaveBeenCalledTimes(1);
        });
        
        it('should handle S3 upload errors gracefully', async () => {
            // Mock DynamoDB response for finding the event
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Item: mockEvent
                });
            });
            
            // Mock S3 response for upload to fail
            mockS3Send.mockImplementationOnce(() => {
                throw new Error('S3 upload failed');
            });

            const response = await request(app)
                .post(`/organizations/${testOrgId}/events/${testEventId}/photos`)
                .field('title', 'Test Photo')
                .field('description', 'Test Photo Description')
                .attach('photo', Buffer.from('mock file content'), 'test-photo.jpg')
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('Failed to upload');

            // Verify S3 was called once but failed
            expect(mockS3Send).toHaveBeenCalledTimes(1);
            
            // Verify DynamoDB was called only once (find event)
            expect(mockDynamoSend).toHaveBeenCalledTimes(1);
        });
    });

    describe('GET /:id/events/:eventId/photos', () => {
        it('should retrieve photos for an event successfully', async () => {
            // Mock event and photo data
            const mockPhotos = [
                { ...mockPhoto, id: 'photo-1' },
                { ...mockPhoto, id: 'photo-2' }
            ];

            // Mock DynamoDB response for finding the event
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Item: mockEvent
                });
            });
            
            // Mock DynamoDB response for finding photos
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Items: mockPhotos
                });
            });

            const response = await request(app)
                .get(`/organizations/${testOrgId}/events/${testEventId}/photos`)
                .expect(200);

            // Verify response structure
            expect(response.body.status).toBe('success');
            expect(response.body.data.photos).toBeDefined();
            expect(response.body.data.photos.length).toBe(2);
            
            // Verify photo data
            const photos = response.body.data.photos;
            expect(photos[0].id).toBe('photo-1');
            expect(photos[1].id).toBe('photo-2');
            
            // Verify both photos are for the correct event
            expect(photos[0].eventId).toBe(testEventId);
            expect(photos[1].eventId).toBe(testEventId);

            // Verify DynamoDB was called twice (find event, list photos)
            expect(mockDynamoSend).toHaveBeenCalledTimes(2);
        });

        it('should return 404 when event does not exist', async () => {
            // Mock DynamoDB response - no event found
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Item: null
                });
            });

            const response = await request(app)
                .get(`/organizations/${testOrgId}/events/${testEventId}/photos`)
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('Event not found');

            // Verify DynamoDB was called only once (find event)
            expect(mockDynamoSend).toHaveBeenCalledTimes(1);
        });

        it('should return empty array when no photos exist for event', async () => {
            // Mock DynamoDB response for finding the event
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Item: mockEvent
                });
            });
            
            // Mock DynamoDB response for finding photos (empty array)
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Items: []
                });
            });

            const response = await request(app)
                .get(`/organizations/${testOrgId}/events/${testEventId}/photos`)
                .expect(200);

            // Verify response structure
            expect(response.body.status).toBe('success');
            expect(response.body.data.photos).toEqual([]);

            // Verify DynamoDB was called twice (find event, list photos)
            expect(mockDynamoSend).toHaveBeenCalledTimes(2);
        });
    });

    describe('DELETE /:id/events/:eventId/photos/:photoId', () => {
        const testPhotoId = 'test-photo-id';

        it('should delete a photo successfully', async () => {
            // Mock photo data
            const mockPhotoForDeletion = {
                ...mockPhoto,
                id: testPhotoId,
                metadata: {
                    ...mockPhoto.metadata,
                    s3Key: 'photos/test-event-id/test-photo-id.jpg'
                }
            };

            // Mock DynamoDB responses
            // 1. First for finding the event
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Item: mockEvent
                });
            });
            
            // 2. For getting the photo
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Item: mockPhotoForDeletion
                });
            });
            
            // 3. For deleting the photo record
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({});
            });

            // Mock S3 response for delete
            mockS3Send.mockImplementationOnce(() => {
                return Promise.resolve({});
            });

            const response = await request(app)
                .delete(`/organizations/${testOrgId}/events/${testEventId}/photos/${testPhotoId}`)
                .expect(200);

            // Verify response structure
            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Photo deleted successfully');

            // Verify S3 was called for delete
            expect(mockS3Send).toHaveBeenCalledTimes(1);
            
            // Verify DynamoDB was called three times (find event, get photo, delete photo)
            expect(mockDynamoSend).toHaveBeenCalledTimes(3);
        });

        it('should return 404 when photo does not exist', async () => {
            // Mock DynamoDB response for finding the event
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Item: mockEvent
                });
            });
            
            // Mock DynamoDB response - no photo found
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Item: null
                });
            });

            const response = await request(app)
                .delete(`/organizations/${testOrgId}/events/${testEventId}/photos/${testPhotoId}`)
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('Photo not found');

            // Verify S3 was not called for delete
            expect(mockS3Send).not.toHaveBeenCalled();
            
            // Verify DynamoDB was called twice (find event, get photo)
            expect(mockDynamoSend).toHaveBeenCalledTimes(2);
        });

        it('should return 400 when photo belongs to a different event', async () => {
            // Mock photo data for a different event
            const mockPhotoFromDifferentEvent = {
                ...mockPhoto,
                id: testPhotoId,
                eventId: 'different-event-id',
                metadata: {
                    ...mockPhoto.metadata,
                    s3Key: 'photos/different-event-id/test-photo-id.jpg'
                }
            };

            // Mock DynamoDB response for finding the event
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Item: mockEvent
                });
            });
            
            // Mock DynamoDB response - photo found but from different event
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Item: mockPhotoFromDifferentEvent
                });
            });

            const response = await request(app)
                .delete(`/organizations/${testOrgId}/events/${testEventId}/photos/${testPhotoId}`)
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('does not belong to the specified event');

            // Verify S3 was not called for delete
            expect(mockS3Send).not.toHaveBeenCalled();
            
            // Verify DynamoDB was called twice (find event, get photo)
            expect(mockDynamoSend).toHaveBeenCalledTimes(2);
        });
    });
});