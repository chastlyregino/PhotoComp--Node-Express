import { UserRepository } from '../repositories/userRepository';
import { User, RegisterRequest, createUserFromRegister } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class UserService {
  private userRepository: UserRepository;

  constructor(userRepository: UserRepository = new UserRepository()) {
    this.userRepository = userRepository;
  }

  async register(registerRequest: RegisterRequest): Promise<{ user: Omit<User, 'password'>, token: string }> {
    try {
      // Check if user with this email already exists
      const existingUser = await this.userRepository.findUserByEmail(registerRequest.email);
      
      if (existingUser) {
        throw new AppError('Email already in use', 409);
      }

      // Create a new user object
      const user = createUserFromRegister(registerRequest);
      
      // Hash the password before storing
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
      
      try {
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
        // This will specifically catch the database error from createUser
        throw new AppError(`Registration failed: ${(error as Error).message}`, 500);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Registration failed: ${(error as Error).message}`, 500);
    }
  }

  private generateToken(user: User): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );
  }
}