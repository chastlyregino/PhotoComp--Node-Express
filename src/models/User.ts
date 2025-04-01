import { v4 as uuidv4 } from 'uuid';

export enum UserRole {
  USER = 'USER',    // Default role for registered users
  MEMBER = 'MEMBER', // User who is part of an organization
  ADMIN = 'ADMIN',   // User with admin privileges in an organization
}

export interface User {
  PK: string; // USER#<username>
  SK: 'ENTITY'; 
  username: string; // This replaces id as the unique identifier
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  type: 'USER';
  // GSI attributes
  GSI1PK?: string; // EMAIL#<email>
  GSI1SK?: 'ENTITY'; // ENTITY
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends AuthRequest {
  username: string; // Added username field
  firstName: string;
  lastName: string;
}

/**
 * Creates a new User entity from registration request data
 * @param registerRequest Registration data from client
 * @returns Fully populated User entity
 */
export const createUserFromRegister = (registerRequest: RegisterRequest): User => {
  const now = new Date().toISOString();
  const username = registerRequest.username.toUpperCase(); // Store username in uppercase
  
  return {
    PK: `USER#${username}`,
    SK: `ENTITY`,
    username, // Store the username as is for display purposes
    email: registerRequest.email,
    firstName: registerRequest.firstName,
    lastName: registerRequest.lastName,
    password: registerRequest.password,
    role: UserRole.USER, // Default role is USER
    createdAt: now,
    updatedAt: now,
    type: 'USER',
    // GSI for email lookups
    GSI1PK: `EMAIL#${registerRequest.email}`,
    GSI1SK: `ENTITY`,
  };
};