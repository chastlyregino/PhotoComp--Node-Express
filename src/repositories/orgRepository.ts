import { dynamoDb, TABLE_NAME } from '../config/db';
import {
    Organization,
    OrganizationCreateRequest,
    OrganizationUpdateRequest,
} from '../models/Organizations';
import { PutCommand, QueryCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { AppError } from '../middleware/errorHandler';

export class OrgRepository {
    async createOrg(org: Organization): Promise<Organization> {
        try {
            await dynamoDb.send(
                new PutCommand({
                    TableName: TABLE_NAME,
                    Item: org,
                    ConditionExpression: 'attribute_not_exists(PK)',
                })
            );
            return org;
        } catch (error: any) {
            if (error.name === 'ConditionalCheckFailedException') {
                throw new AppError('Organization already exists!', 409);
            }
            throw new AppError(`Failed to create Organization: ${error.message}`, 500);
        }
    }

    async findOrgById(id: string): Promise<Organization | null> {
        try {
            const params = {
                TableName: TABLE_NAME,
                KeyConditionExpression: 'PK = :pkValue',
                ExpressionAttributeValues: {
                    ':pkValue': `ORG#${id}`,
                },
            };

            const result = await dynamoDb.send(new QueryCommand(params));

            if (!result.Items || result.Items.length === 0) {
                return null;
            }

            return result.Items[0] as Organization;
        } catch (error: any) {
            throw new AppError(`Failed to find organization by id: ${error.message}`, 500);
        }
    }

    async findOrgsByUser(userId: string): Promise<Organization[] | null> {
        try {
            const params = {
                TableName: TABLE_NAME,
                IndexName: 'EmailIndex', // Using the GSI1 index (renamed to EmailIndex in CloudFormation)
                KeyConditionExpression: 'GSI1PK = :userKey',
                FilterExpression: 'type = :orgType',
                ExpressionAttributeValues: {
                    ':userKey': `USER#${userId}`,
                    ':orgType': 'ORGANIZATION',
                },
            };

            const result = await dynamoDb.send(new QueryCommand(params));

            if (!result.Items || result.Items.length === 0) {
                return [];
            }

            return result.Items as Organization[];
        } catch (error: any) {
            throw new AppError(`Failed to find organizations by user: ${error.message}`, 500);
        }
    }

    // Alternative query method using GSI2 if it was defined in the CloudFormation template
    async findOrgsByUserAlternative(userId: string): Promise<Organization[] | null> {
        try {
            const params = {
                TableName: TABLE_NAME,
                KeyConditionExpression: 'PK = :userKey AND begins_with(SK, :orgPrefix)',
                FilterExpression: 'type = :orgType',
                ExpressionAttributeValues: {
                    ':userKey': `USER#${userId}`,
                    ':orgPrefix': 'ORG#',
                    ':orgType': 'ORGANIZATION',
                },
            };

            const result = await dynamoDb.send(new QueryCommand(params));

            if (!result.Items || result.Items.length === 0) {
                return [];
            }

            return result.Items as Organization[];
        } catch (error: any) {
            throw new AppError(`Failed to find organizations by user: ${error.message}`, 500);
        }
    }

    async updateOrgById(org: Organization): Promise<OrganizationUpdateRequest | null> {
        try {
            const params = {
                TableName: TABLE_NAME,
                Key: {
                    PK: `ORG#${org.id}`,
                    SK: org.SK, // This should be the original SK value
                },
                UpdateExpression:
                    'SET #name = :name, description = :description, logoUrl = :logoUrl, isPublic = :isPublic, updatedAt = :updatedAt',
                ExpressionAttributeNames: {
                    '#name': 'name', // Using ExpressionAttributeNames for reserved keyword 'name'
                },
                ExpressionAttributeValues: {
                    ':name': org.name,
                    ':description': org.description || null,
                    ':logoUrl': org.logoUrl,
                    ':isPublic': org.isPublic,
                    ':updatedAt': new Date().toISOString(),
                },
                ReturnValues: 'ALL_NEW' as const, // Use const assertion to fix the type
            };

            const result = await dynamoDb.send(new UpdateCommand(params));
            
            if (!result.Attributes) {
                throw new AppError('Failed to update organization', 500);
            }
            
            return result.Attributes as any;
        } catch (error: any) {
            throw new AppError(`Failed to update organization: ${error.message}`, 500);
        }
    }
}