import { dynamoDb, TABLE_NAME } from '../config/db';
import {
    Organization,
    OrganizationCreateRequest,
    OrganizationUpdateRequest,
} from '../models/Organizations';
import { PutCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { AppError } from '../middleware/errorHandler';

export class OrgRepository {
    async createOrg(org: Organization): Promise<OrganizationCreateRequest> {
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

    async findOrgByName(name: string): Promise<Organization | null> {
        try {
            const params = {
                TableName: TABLE_NAME,
                IndexName: 'OrgIdIndex',
                KeyConditionExpression: 'GSI2SK = :idKey',
                ExpressionAttributeValues: {
                    ':idKey': `ORG#${name.toUpperCase()}`,
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
                IndexName: 'UserIdIndex',
                KeyConditionExpression: 'GSI2PK = :userIdKey',
                ExpressionAttributeValues: {
                    ':userIdKey': userId,
                },
            };

            const result = await dynamoDb.send(new QueryCommand(params));

            if (!result.Items || result.Items.length === 0) {
                return [];
            }

            return result.Items as Organization[];
        } catch (error: any) {
            throw new AppError(`Failed to find organization by id: ${error.message}`, 500);
        }
    }

    async updateOrgById(org: Organization): Promise<OrganizationUpdateRequest | null> {
        try {
            const params = {
                TableName: TABLE_NAME,
                IndexName: 'OrgIdIndex',
                KeyConditionExpression: 'GSI2SK = :idKey',
                UpdateExpression:
                    'SET name = :name, description = :desciption, isPublic = :isPublic',
                ExpressionAttributeValues: {
                    ':idKey': `ORG#${org.id}`,
                    ':name': org.name,
                    ':description': org.description,
                    ':isPublic': org.isPublic,
                },
            };

            const result = await dynamoDb.send(new QueryCommand(params));

            return org;
        } catch (error: any) {
            throw new AppError(`Failed to find organization by id: ${error.message}`, 500);
        }
    }
}
