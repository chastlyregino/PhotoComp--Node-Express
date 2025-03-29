import { Request, Response, NextFunction, Router } from 'express';
import { UserService } from '../services/userService';
import { AuthRequest, RegisterRequest } from '../models/User';
import { AppError } from '../middleware/errorHandler';

const userService = new UserService();
export const authRouter = Router();

/**
 * Register a new user
 * @route POST /api/auth/register
 */
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const { email, password, firstName, lastName } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      throw new AppError('Email, password, first name, and last name are required', 400);
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Invalid email format', 400);
    }
    
    // Validate password strength
    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }
    
    const registerRequest: RegisterRequest = {
      email,
      password,
      firstName,
      lastName
    };
    
    // Register the user
    const result = await userService.register(registerRequest);
    
    // Return the user data and token
    return res.status(201).json({
      status: 'success',
      data: {
        user: result.user,
        token: result.token
      }
    });
  } catch (error) {
    // Pass all errors to the error middleware
    next(error);
  }
});

/**
 * Login an existing user
 * @route POST /api/auth/login
 */
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }
    
    const authRequest: AuthRequest = {
      email,
      password
    };
    
    // Login the user
    const result = await userService.login(authRequest);
    
    // Return the user data and token
    return res.status(200).json({
      status: 'success',
      data: {
        user: result.user,
        token: result.token
      }
    });
  } catch (error) {
    // Pass all errors to the error middleware
    next(error);
  }
});