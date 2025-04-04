// Create a new repository file for handling organization membership requests
// src/repositories/orgMembershipRepository.ts

import { dynamoDb, TABLE_NAME } from '../config/db';
import { OrganizationMembershipRequest } from '../models/Organizations';
import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { AppError } from '../middleware/errorHandler';

export class OrgMembershipRepository {
    /**
     * Creates a new membership request in the database
     * @param request The membership request to create
     * @returns The created membership request
     */
    async createMembershipRequest(request: OrganizationMembershipRequest): Promise<OrganizationMembershipRequest> {
        try {
            await dynamoDb.send(
                new PutCommand({
                    TableName: TABLE_NAME,
                    Item: request,
                    ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
                })
            );
            return request;
        } catch (error: any) {
            if (error.name === 'ConditionalCheckFailedException') {
                throw new AppError('You have already submitted a request to join this organization', 409);
            }
            throw new AppError(`Failed to create membership request: ${error.message}`, 500);
        }
    }

    /**
     * Gets all pending membership requests for an organization
     * @param organizationName The name of the organization
     * @returns List of pending membership requests
     */
    // async getPendingRequestsByOrganization(organizationName: string): Promise<OrganizationMembershipRequest[]> {
    //     try {
    //         const result = await dynamoDb.send(
    //             new QueryCommand({
    //                 TableName: TABLE_NAME,
    //                 KeyConditionExpression: 'PK = :orgKey AND begins_with(SK, :requestPrefix)',
    //                 ExpressionAttributeValues: {
    //                     ':orgKey': `ORG#${organizationName.toUpperCase()}`,
    //                     ':requestPrefix': 'REQUEST#',
    //                 }
    //             })
    //         );
    //
    //         return (result.Items || []) as OrganizationMembershipRequest[];
    //     } catch (error: any) {
    //         throw new AppError(`Failed to fetch membership requests: ${error.message}`, 500);
    //     }
    // }

    /**
     * Updates the status of a membership request
     * @param organizationName The name of the organization
     * @param userId The ID of the user whose request is being updated
     * @param status The new status (APPROVED or DENIED)
     * @returns The updated membership request
     */
    // async updateRequestStatus(
    //     organizationName: string,
    //     userId: string,
    //     status: 'APPROVED' | 'DENIED'
    // ): Promise<OrganizationMembershipRequest> {
    //     try {
    //         const result = await dynamoDb.send(
    //             new UpdateCommand({
    //                 TableName: TABLE_NAME,
    //                 Key: {
    //                     PK: `ORG#${organizationName.toUpperCase()}`,
    //                     SK: `REQUEST#${userId}`,
    //                 },
    //                 UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
    //                 ExpressionAttributeNames: {
    //                     '#status': 'status',
    //                 },
    //                 ExpressionAttributeValues: {
    //                     ':status': status,
    //                     ':updatedAt': new Date().toISOString(),
    //                 },
    //                 ReturnValues: 'ALL_NEW',
    //             })
    //         );
    //
    //         return result.Attributes as OrganizationMembershipRequest;
    //     } catch (error: any) {
    //         throw new AppError(`Failed to update membership request: ${error.message}`, 500);
    //     }
    // }
}
