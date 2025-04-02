import { UserRole } from '../../src/models/User';
import {
    Organization,
    OrganizationCreateRequest,
    UserOrganizationRelationship,
} from '../../src/models/Organizations';
import { AuthRequest } from '../../src/models/User';

export const nonExistingOrg: null = null;

export const userId: string = `81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70`;

export let org: OrganizationCreateRequest = {
    name: `Jollibee`,
    logoUrl: `https://images.app.goo.gl/k7Yc6Yb6ebeaB9HB8`,
};

export let user: AuthRequest = {
    email: `sample1@example.com`,
    password: `test1234`,
};

export const existingOrg: Organization = {
    logoUrl: 'https://images.app.goo.gl/k7Yc6Yb6ebeaB9HB8',
    createdAt: '2025-04-01T13:28:12.857Z',
    GSI1SK: 'ORG#PIZZA',
    createdBy: '81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70',
    name: 'Pizza',
    GSI1PK: 'PIZ',
    updatedAt: '2025-04-01T13:28:12.857Z',
    SK: 'ENTITY',
    isPublic: true,
    PK: 'ORG#PIZZA',
    id: '4353a165-adbf-43e8-8922-1da90a62a12a',
    type: 'ORGANIZATION',
};

export const createdOrg: Organization = {
    PK: 'ORG#JOLLIBEE',
    SK: 'ENTITY',
    id: 'b58bfbd2-7055-4134-aa74-304ae42bf8a8',
    name: 'Jollibee',
    description: undefined,
    createdBy: '81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70',
    createdAt: '2025-04-01T17:26:48.302Z',
    updatedAt: '2025-04-01T17:26:48.302Z',
    type: 'ORGANIZATION',
    isPublic: true,
    logoUrl: 'https://images.app.goo.gl/k7Yc6Yb6ebeaB9HB8',
    website: undefined,
    contactEmail: undefined,
    GSI1PK: 'JOL',
    GSI1SK: 'ORG#JOLLIBEE',
};

export const createdUserAdmin: UserOrganizationRelationship = {
    PK: 'USER#81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70',
    SK: 'ORG#JOLLIBEE',
    userId: '81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70',
    organizationName: 'Jollibee',
    role: UserRole.ADMIN,
    joinedAt: '2025-04-01T17:26:48.364Z',
    type: 'USER_ORG',
    GSI1PK: 'ORG#JOLLIBEE',
    GSI1SK: 'USER#81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70',
};
