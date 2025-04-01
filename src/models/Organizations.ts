import { v4 as uuidv4 } from 'uuid';
import { UserRole } from './User';

export interface Organization {
    // Primary keys
    PK: string; // ORG#NAME
    SK: string; // USER#<createdBy> (identifies the admin owner)

    // Attributes
    id: string;
    name: string;
    createdBy: string; // User ID of admin who created the organization
    createdAt: string;
    updatedAt: string;
    type: 'ORGANIZATION';
    role: UserRole;
    joinedAt: string;
    isPublic: boolean;
    logoUrl: string;

    // Optional attributes
    description?: string;
    website?: string;
    contactEmail?: string;

    // Add GSI for querying organizations by owner/creator
    GSI1PK?: string; // TYPE#ORGANIZATION
    GSI1SK?: string; // <creation_timestamp>

    // GSI for finding organizations by creator
    GSI2PK?: string; // USER#<createdBy>
    GSI2SK?: string; // ORG#NAME
}

export interface OrganizationCreateRequest {
    name: string;
    description?: string;
    logoUrl: string;
    website?: string;
    contactEmail?: string;
}

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
        role: org.role,
        joinedAt: org.joinedAt,
        isPublic: request.isPublic || org.isPublic,
        logoUrl: request.logoUrl || org.logoUrl,
        website: request.website,
        contactEmail: request.contactEmail,
        GSI1PK: 'TYPE#ORGANIZATION',
        GSI1SK: now,
        GSI2PK: org.GSI2PK,
        GSI2SK: org.GSI2SK,
    };
};

export const createOrganization = (
    request: OrganizationCreateRequest,
    userId: string
): Organization => {
    const id = uuidv4();
    const now = new Date().toISOString();

    return {
        PK: `ORG#${request.name.toUpperCase()}`,
        SK: `USER#${userId}`,
        id,
        name: request.name,
        description: request.description,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
        type: 'ORGANIZATION',
        role: UserRole.ADMIN,
        joinedAt: now,
        isPublic: true,
        logoUrl: request.logoUrl,
        website: request.website,
        contactEmail: request.contactEmail,
        GSI1PK: 'TYPE#ORGANIZATION',
        GSI1SK: now,
        GSI2PK: `USER#${userId}`,
        GSI2SK: `ORG#${request.name.toUpperCase()}`,
    };
};

// For creating the relationship between an organization and its admin
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
