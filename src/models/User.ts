import { v4 as uuidv4 } from 'uuid';

export enum UserRole {
  MEMBER = 'MEMBER',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
}

export interface User {
  PK: string; // USER#<id>
  SK: string; // PROFILE#<id>
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  type: 'USER';
}

export interface UserOrganization {
  PK: string; // USER#<userId>
  SK: string; // ORG#<organizationId>
  userId: string;
  organizationId: string;
  role: UserRole;
  status: UserStatus;
  joinedAt: string;
  type: 'USER_ORG';
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends AuthRequest {
  firstName: string;
  lastName: string;
}

export const createUserFromRegister = (registerRequest: RegisterRequest): User => {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  return {
    PK: `USER#${id}`,
    SK: `PROFILE#${id}`,
    id,
    email: registerRequest.email,
    firstName: registerRequest.firstName,
    lastName: registerRequest.lastName,
    password: registerRequest.password, // This will be hashed before saving
    role: UserRole.MEMBER,
    status: UserStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
    type: 'USER'
  };
};