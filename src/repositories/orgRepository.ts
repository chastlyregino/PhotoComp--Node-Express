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
    async findOrgsCreatedByUser(userId: string): Promise<Organization[] | null> {
        try {
            // Set up query parameters for the DynamoDB operation
            const params = {
                // The name of our single DynamoDB table that stores all entity types
                TableName: TABLE_NAME,

                // Specify which GSI to use - in single-table design, GSIs are crucial for access patterns
                // Here we're using TypeIndex which indexes items by their 'type' attribute
                IndexName: 'TypeIndex',

                // The primary query condition using the index's partition key (type)
                // In single-table design, we often use the 'type' attribute to distinguish between different entities
                KeyConditionExpression: '#itemType = :orgType',

                // Apply additional filtering after items are retrieved by the key condition
                // This is how we further narrow down results in a single-table design
                // Here we're finding only organizations created by a specific user
                FilterExpression: 'createdBy = :userId',

                // Map the expression attribute name placeholder to the actual attribute
                // This is needed because 'type' is a reserved keyword in DynamoDB
                ExpressionAttributeNames: {
                    '#itemType': 'type'
                },

                // Define the values for the placeholders in our expressions
                // This allows us to query for specific entity types (organizations) created by specific users
                ExpressionAttributeValues: {
                    // This value matches organizations in our single-table design
                    ':orgType': 'ORGANIZATION',
                    // This filters to show only organizations created by the specified user
                    ':userId': userId
                },
            };

            // Execute the query against our single table
            const result = await dynamoDb.send(new QueryCommand(params));

            // Handle the case where no organizations were found for this user
            if (!result.Items || result.Items.length === 0) {
                return [];
            }

            // Cast the generic DynamoDB items to our strongly-typed Organization model
            // In single-table design, we rely on these type conversions since the table contains mixed entity types
            return result.Items as Organization[];
        } catch (error: any) {
            // Standardized error handling - wrap the DynamoDB error in our application's error type
            throw new AppError(`Failed to find organizations by user: ${error.message}`, 500);
        }
    }

    async updateOrgById(org: Organization): Promise<OrganizationUpdateRequest | null> {
        try {
            const params = {
                TableName: TABLE_NAME,
                Key: {
                    PK: `ORG#${org.id}`,
                    SK: org.SK, 
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