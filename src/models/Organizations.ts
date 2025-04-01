import { v4 as uuidv4 } from 'uuid';
import { UserRole } from './User';

export interface Organization {
    // Primary keys
    PK: string; // ORG#NAME
    SK: 'ENTITY'; // ENTITY

    // Attributes
    id: string;
    name: string;
    createdBy: string; // User ID of admin who created the organization
    createdAt: string;
    updatedAt: string;
    type: 'ORGANIZATION';
    joinedAt: string;
    isPublic: boolean;
    logoUrl: string;

    // Optional attributes
    description?: string;
    website?: string;
    contactEmail?: string;

    // GSI for finding organizations by creator
    GSI1PK?: string; // NAME.substring(0,3).toUpperCase()
    GSI1SK?: string; // ORG#NAME
}

export interface OrganizationCreateRequest {
    name: string;
    description?: string;
    logoUrl: string;
    website?: string;
    contactEmail?: string;
}

export const createOrganization = (
    request: OrganizationCreateRequest,
    userId: string
): Organization => {
    const id = uuidv4();
    const now = new Date().toISOString();

    return {
        PK: `ORG#${request.name.toUpperCase()}`,
        SK: `ENTITY`,
        id,
        name: request.name,
        description: request.description,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
        type: 'ORGANIZATION',
        joinedAt: now,
        isPublic: true,
        logoUrl: request.logoUrl,
        website: request.website,
        contactEmail: request.contactEmail,
        GSI1PK: request.name.substring(0,3).toUpperCase(),
        GSI1SK: `ORG#${request.name.toUpperCase()}`,
    };
};

// For updating an organization
export interface OrganizationUpdateRequest {
    name: string;
    description?: string;
    logoUrl: string;
    isPublic: boolean;
    website?: string;
    contactEmail?: string;
}

export const updateOrganization = (
    request: OrganizationUpdateRequest,
    org: Organization
): Organization => {
    const now = new Date().toISOString();
    return {
        PK: org.PK,
        SK: org.SK,
        id: org.id,
        name: org.name,
        description: org.description,
        createdBy: org.createdBy,
        createdAt: org.createdAt,
        updatedAt: now,
        type: `ORGANIZATION`,
        joinedAt: org.joinedAt,
        isPublic: request.isPublic || org.isPublic,
        logoUrl: request.logoUrl || org.logoUrl,
        website: request.website,
        contactEmail: request.contactEmail,
        GSI1PK: org.GSI1PK,
        GSI1SK: org.GSI1SK,
    };
};

// For creating the relationship between an organization and its admin
export interface UserOrganizationRelationship {
    PK: string; // ORG#NAME
    SK: string; // USER#<userId>
    userId: string;
    organizationName: string;
    role: UserRole;
    joinedAt: string;
    type: 'USER_ORG';

    // GSI for fetching all organizations a user belongs to
    GSI1PK?: string; // USER#<userId>
    GSI1SK?: string; // ORG#NAME
}

export const addOrganizationAdmin = (
    organizationName: string,
    userId: string
): UserOrganizationRelationship => {
    const now = new Date().toISOString();

    return {
        PK: `ORG#${organizationName.toUpperCase()}`,
        SK: `USER#${userId}`,
        userId,
        organizationName: organizationName,
        role: UserRole.ADMIN,
        joinedAt: now,
        type: 'USER_ORG',
        // Add GSI for querying all organizations a user belongs to
        GSI1PK: `USER#${userId}`,
        GSI1SK: `ORG#${organizationName.toUpperCase()}`,
    };
};

// For handling membership applications
export interface OrganizationMembershipRequest {
    PK: string; // ORG#NAME
    SK: string; // REQUEST#<userId>
    organizationName: string;
    userId: string;
    requestDate: string;
    message?: string;
    status: 'PENDING' | 'APPROVED' | 'DENIED';
    type: 'ORG_REQUEST';
}

export const createOrganizationMembershipRequest = (
    organizationName: string,
    userId: string,
    message?: string
): OrganizationMembershipRequest => {
    const now = new Date().toISOString();

    return {
        PK: `ORG#${organizationName.toUpperCase()}`,
        SK: `REQUEST#${userId}`,
        organizationName,
        userId,
        requestDate: now,
        message,
        status: 'PENDING',
        type: 'ORG_REQUEST',
    };
};
