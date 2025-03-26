import { v4 as uuidv4 } from 'uuid';

export enum UserRole {
    USER = 'USER', // Default role for registered users
    MEMBER = 'MEMBER', // User who is part of an organization
    ADMIN = 'ADMIN', // User with admin privileges in an organization
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
    // GSI attributes
    GSI1PK?: string; // EMAIL#<email>
    GSI1SK?: string; // USER#<id>
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
        password: registerRequest.password,
        role: UserRole.USER, // Default role is USER
        status: UserStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
        type: 'USER',
        // GSI for email lookups
        GSI1PK: `EMAIL#${registerRequest.email}`,
        GSI1SK: `USER#${id}`,
    };
};
