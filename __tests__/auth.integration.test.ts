import request from 'supertest';
import express from 'express';
import { authRouter } from '../src/controllers/authController';
import { errorHandler } from '../src/middleware/errorHandler';
import { UserRole, UserStatus } from '../src/models/User';
import jwt from 'jsonwebtoken';
import { dynamoDb } from '../src/config/db';

// Make sure mockDynamoSend is properly cast as a jest.Mock
const mockDynamoSend = dynamoDb.send as jest.Mock;

describe('Auth Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    app.use(errorHandler);
  });

  describe('POST /api/auth/register', () => {
    const validUser = {
      email: 'test@example.com',
      password: 'Password123',
      firstName: 'Test',
      lastName: 'User'
    };

    it('should register a new user successfully', async () => {
      // Mock dynamoDb.send for findUserByEmail (no existing user)
      mockDynamoSend.mockImplementationOnce(() => {
        return Promise.resolve({
          Items: []
        });
      });

      // Mock dynamoDb.send for createUser
      mockDynamoSend.mockImplementationOnce(() => {
        return Promise.resolve({});
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(201);

      // Verify response structure
      expect(response.body.status).toBe('success');
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      
      // Verify user data is correct
      expect(response.body.data.user.email).toBe(validUser.email);
      expect(response.body.data.user.firstName).toBe(validUser.firstName);
      expect(response.body.data.user.lastName).toBe(validUser.lastName);
      expect(response.body.data.user.role).toBe(UserRole.USER);
      expect(response.body.data.user.status).toBe(UserStatus.ACTIVE);
      
      // Verify password is not returned
      expect(response.body.data.user.password).toBeUndefined();
      
      // Verify DynamoDB was called correctly
      expect(mockDynamoSend).toHaveBeenCalledTimes(2);
    });

    it('should return 409 when email is already in use', async () => {
      // Mock dynamoDb.send for findUserByEmail (existing user)
      mockDynamoSend.mockImplementationOnce(() => {
        return Promise.resolve({
          Items: [{
            PK: 'USER#123',
            SK: 'PROFILE#123',
            id: '123',
            email: validUser.email,
            firstName: 'Existing',
            lastName: 'User',
            role: UserRole.USER,
            status: UserStatus.ACTIVE,
            type: 'USER'
          }]
        });
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(409);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Email already in use');
      
      // Verify DynamoDB was called only once (for findUserByEmail)
      expect(mockDynamoSend).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteUser = {
        email: 'test@example.com',
        password: 'Password123'
        // Missing firstName and lastName
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteUser)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('required');
      
      // Verify DynamoDB was not called
      expect(mockDynamoSend).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid email format', async () => {
      const userWithInvalidEmail = {
        ...validUser,
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userWithInvalidEmail)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid email format');
      
      // Verify DynamoDB was not called
      expect(mockDynamoSend).not.toHaveBeenCalled();
    });

    it('should return 400 for password too short', async () => {
      const userWithShortPassword = {
        ...validUser,
        password: 'Short'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userWithShortPassword)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Password must be at least 8 characters');
      
      // Verify DynamoDB was not called
      expect(mockDynamoSend).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Mock dynamoDb.send for findUserByEmail (no existing user)
      mockDynamoSend.mockImplementationOnce(() => {
        return Promise.resolve({
          Items: []
        });
      });

      // Mock dynamoDb.send for createUser to throw an error
      mockDynamoSend.mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(500);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Registration failed');
      
      // Verify DynamoDB was called twice (findUserByEmail and failed createUser)
      expect(mockDynamoSend).toHaveBeenCalledTimes(2);
    });
  });

  describe('JWT Token Verification', () => {
    it('should generate a valid JWT token with correct payload', async () => {
      // Mock dynamoDb.send for findUserByEmail (no existing user)
      mockDynamoSend.mockImplementationOnce(() => {
        return Promise.resolve({
          Items: []
        });
      });

      // Mock dynamoDb.send for createUser
      mockDynamoSend.mockImplementationOnce(() => {
        return Promise.resolve({});
      });

      const validUser = {
        email: 'token@example.com',
        password: 'Password123',
        firstName: 'Token',
        lastName: 'Test'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(201);

      const token = response.body.data.token;
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET as string) as any;

      // Verify token contains correct user information
      expect(decodedToken.email).toBe(validUser.email);
      expect(decodedToken.role).toBe(UserRole.USER);
      expect(decodedToken.id).toBeDefined();
      expect(decodedToken.iat).toBeDefined(); // Issued at time
      expect(decodedToken.exp).toBeDefined(); // Expiration time
    });
  });
});