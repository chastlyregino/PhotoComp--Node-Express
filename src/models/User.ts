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
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserOrganization {
  userId: string;
  organizationId: string;
  role: UserRole;
  status: UserStatus;
  joinedAt: Date;
}