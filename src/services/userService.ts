import { UserRepository } from '../repositories/userRepository';
import { User, RegisterRequest, createUserFromRegister, AuthRequest } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class UserService {
  private userRepository: UserRepository;

  constructor(userRepository: UserRepository = new UserRepository()) {
    this.userRepository = userRepository;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findUserByEmail(email);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return await this.userRepository.findUserByUsername(username);
  }

  /**
   * Validates username format
   * @param username Username to validate
   * @throws AppError if username is invalid
   */
  private validateUsername(username: string): void {
    // Username requirements: 3-20 alphanumeric characters and underscores only
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      throw new AppError(
        'Username must be 3-20 characters and contain only letters, numbers, and underscores', 
        400
      );
    }
  }

  async register(registerRequest: RegisterRequest): Promise<{ user: Omit<User, 'password'>, token: string }> {
    // Validate username format
    this.validateUsername(registerRequest.username);

    // Check if user with this email already exists
    const existingUserByEmail = await this.getUserByEmail(registerRequest.email);
    if (existingUserByEmail) {
      throw new AppError('Email already in use', 409);
    }

    // Check if username is already taken (case insensitive)
    const existingUserByUsername = await this.getUserByUsername(registerRequest.username);
    if (existingUserByUsername) {
      throw new AppError('Username already taken', 409);
    }

    // Create a new user object
    const user = createUserFromRegister(registerRequest);

    try {
      // Hash the password before storing
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);

      // Save the user to the database
      const createdUser = await this.userRepository.createUser(user);

      // Generate JWT token
      const token = this.generateToken(createdUser);

      // Return user (without password) and token
      const { password, ...userWithoutPassword } = createdUser;

      return {
        user: userWithoutPassword as Omit<User, 'password'>,
        token
      };
    } catch (error) {
      // Handle specific error types
      if (error instanceof AppError) {
        throw error;
      }
      
      // Handle other errors
      throw new AppError(`Registration failed: ${(error as Error).message}`, 500);
    }
  }

  async login(authRequest: AuthRequest): Promise<{ user: Omit<User, 'password'>, token: string }> {
    try {
      // Find user by email
      const user = await this.userRepository.findUserByEmail(authRequest.email);

      // If user doesn't exist
      if (!user) {
        throw new AppError('Invalid email or password', 401);
      }

      // Check if the password is correct
      const isPasswordValid = await bcrypt.compare(authRequest.password, user.password);

      if (!isPasswordValid) {
        throw new AppError('Invalid email or password', 401);
      }

      // Generate JWT token
      const token = this.generateToken(user);

      // Return user (without password) and token
      const { password, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword as Omit<User, 'password'>,
        token
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Login failed: ${(error as Error).message}`, 500);
    }
  }

  private generateToken(user: User): string {
    return jwt.sign(
      {
        username: user.username,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );
  }
}