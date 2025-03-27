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

    async findUserByEmail(email: string): Promise<User | null> {
        return await this.userRepository.findUserByEmail(email);
    }

    async register(
        registerRequest: RegisterRequest
    ): Promise<{ user: Omit<User, 'password'>; token: string }> {
        try {
            // Check if user with this email already exists
            const existingUser = await this.findUserByEmail(registerRequest.email);

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
                    token,
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

    async login(
        authRequest: AuthRequest
    ): Promise<{ user: Omit<User, 'password'>; token: string }> {
        try {
            // Find user by email
            const user = await this.findUserByEmail(authRequest.email);

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
                token,
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
                id: user.id,
                email: user.email,
                role: user.role,
            },
            process.env.JWT_SECRET as string,
            { expiresIn: '24h' }
        );
    }
}
