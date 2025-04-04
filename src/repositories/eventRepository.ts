import { dynamoDb, TABLE_NAME } from '../config/db';
import { Event, EventUser } from '../models/Event';
import { PutCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { AppError } from '../middleware/errorHandler';

/**
 * Repository class for handling event-related database operations.
 */
export class EventRepository {
    /**
     * Creates a new event in the database.
     *
     * @param event - The event object to be stored.
     * @returns The created event.
     * @throws {AppError} If the database operation fails.
     */
    async createOrgEvent(event: Event): Promise<Event> {
        try {
            await dynamoDb.send(
                new PutCommand({
                    TableName: TABLE_NAME,
                    Item: event,
                })
            );
            return event;
        } catch (error: any) {
            throw new AppError(`Failed to create event: ${error.message}`, 500);
        }
    }

    /**
     * Creates a record for a user attending an event.
     *
     * @param eventUser - The event attendance record to be stored.
     * @returns The created event attendance record.
     * @throws {AppError} If the database operation fails.
     */
    async addAttendingEventRecord(eventUser: EventUser): Promise<EventUser> {
        try {
            await dynamoDb.send(
                new PutCommand({
                    TableName: TABLE_NAME,
                    Item: eventUser,
                })
            );

            return eventUser;
        } catch (error: any) {
            throw new AppError(`Failed to add event attendance record: ${error.message}`, 500);
        }
    }

    /**
     * Retrieves all events for a specific organization.
     *
     * @param orgID - The ID of the organization.
     * @returns A list of events belonging to the organization.
     * @throws {AppError} If the database operation fails.
     */
    async getOrgEvents(orgID: string): Promise<Event[]> {
        try {
            // Query events using the GSI2 index, filtering by organization ID.
            const response = await dynamoDb.send(
                new QueryCommand({
                    TableName: TABLE_NAME,
                    IndexName: 'GSI2PK-GSI2SK-INDEX',
                    KeyConditionExpression: 'GSI2PK = :orgId AND begins_with(GSI2SK, :eventPrefix)',
                    ExpressionAttributeValues: {
                        ':orgId': `ORG#${orgID.toUpperCase()}`,
                        ':eventPrefix': `EVENT#`,
                    },
                })
            );

            return response.Items as Event[];
        } catch (error: any) {
            throw new AppError(`Failed to retrieve events: ${error.message}`, 500);
        }
    }

    /**
     * Retrieves a specific event for an organization.
     *
     * @param orgID - The ID of the organization.
     * @param eventID - The ID of the event.
     * @returns The requested event.
     * @throws {AppError} If the database operation fails.
     */
    async getOrgEvent(orgID: string, eventID: string): Promise<Event> {
        try {
            // Query for a specific event using the GSI2 index.
            const response = await dynamoDb.send(
                new QueryCommand({
                    TableName: TABLE_NAME,
                    IndexName: 'GSI2PK-GSI2SK-INDEX',
                    KeyConditionExpression: 'GSI2PK = :orgID AND GSI2SK = :eventID',
                    ExpressionAttributeValues: {
                        ':orgID': `ORG#${orgID}`,
                        ':eventID': `EVENT#${eventID}`,
                    },
                })
            );

            const items = response.Items as Event[];
            return items[0]; // Return the first (and expected only) result.
        } catch (error: any) {
            throw new AppError(`Failed to retrieve event: ${error.message}`, 500);
        }
    }

    /**
     * Retrieves all events that a specific user is attending.
     *
     * @param userID - The ID of the user.
     * @returns A list of events the user is attending.
     * @throws {AppError} If the database operation fails.
     */
    async getUserEvents(userID: string): Promise<Event[]> {
        try {
            // Query user-related events using their primary key.
            const response = await dynamoDb.send(
                new QueryCommand({
                    TableName: TABLE_NAME,
                    KeyConditionExpression: 'PK = :userPK AND begins_with(SK, :skPrefix)',
                    ExpressionAttributeValues: {
                        ':userPK': `USER#${userID}`,
                        ':skPrefix': 'EVENT#',
                    },
                })
            );

            return response.Items as Event[];
        } catch (error: any) {
            throw new AppError(`Failed to retrieve user events: ${error.message}`, 500);
        }
    }

    /**
     * Retrieves all events for a specific organization.
     *
     * @param orgID - The ID of the organization.
     * @returns A list of events belonging to the organization.
     * @throws {AppError} If the database operation fails.
     */
    async getPublicOrgEvents(
        orgID: string
    ): Promise<{ events: Event[]; newLastEvaluatedKey: Record<string, any> | null }> {
        try {
            let publicEvents: Event[] = [];
            let lastEvaluatedKey: Record<string, any> | undefined = undefined;

            // Keep querying until we have at least 9 public events or no more data
            while (publicEvents.length < 9) {
                const response: any = await dynamoDb.send(
                    new QueryCommand({
                        TableName: TABLE_NAME,
                        IndexName: 'GSI2PK-GSI2SK-INDEX',
                        KeyConditionExpression:
                            'GSI2PK = :orgId AND begins_with(GSI2SK, :eventPrefix)',
                        ExpressionAttributeValues: {
                            ':orgId': `ORG#${orgID.toUpperCase()}`,
                            ':eventPrefix': `EVENT#`,
                        },
                        Limit: 15, // Fetch more events to ensure enough public ones
                        ExclusiveStartKey: lastEvaluatedKey || undefined,
                    })
                );

                const fetchedEvents = response.Items as Event[];
                publicEvents.push(...fetchedEvents.filter(event => event.isPublic));

                // no more data to paginate
                if (!response.LastEvaluatedKey) break;

                lastEvaluatedKey = response.LastEvaluatedKey;
            }

            return {
                events: publicEvents.slice(0, 9),
                newLastEvaluatedKey: lastEvaluatedKey || null,
            };
        } catch (error: any) {
            throw new AppError(`Failed to retrieve events: ${error.message}`, 500);
        }
    }

    async findEventUserbyUser(eventId: string, userId: string): Promise<EventUser | null> {
        try {
            const params = {
                TableName: TABLE_NAME,
                Key: {
                    PK: `USER#${userId}`,
                    SK: `EVENT#${eventId}`,
                },
            };

            const result = await dynamoDb.send(new GetCommand(params));

            if (!result.Item) {
                return null;
            }

            return result.Item as EventUser;
        } catch (error: any) {
            throw new AppError(`Failed to find Event-User Connection: ${error.message}`, 500);
        }
    }

    async findEventById(eventId: string): Promise<Event | null> {
        try {
            const params = {
                TableName: TABLE_NAME,
                Key: {
                    PK: `EVENT#${eventId}`,
                    SK: `ENTITY`,
                },
            };

            const result = await dynamoDb.send(new GetCommand(params));

            console.log(result.Item)
            if (!result.Item) {
                return null;
            }

            return result.Item as Event;
        } catch (error: any) {
            throw new AppError(`Failed to find Event: ${error.message}`, 500);
        }
    }

    async updateEventPublicity(event: Event): Promise<Event | null> {
        try {
            const params = {
                TableName: TABLE_NAME,
                KeyConditionExpression: 'PK = :eventKey and SK = :event',
                UpdateExpression: 'SET isPublic = :isPublic',
                ExpressionAttributeValues: {
                    ':eventKey': event.PK,
                    ':event': event.SK,
                },
                AttributeUpdates: {
                    ':isPublic': event.isPublic,
                },
                ReturnValues: `UPDATE_NEW`,
            };

            const udpatedEvent = await dynamoDb.send(new QueryCommand(params));
            return event as Event;
        } catch (error: any) {
            throw new AppError(`Failed to update Event's Publicity: ${error.message}`, 500);
        }
    }
}
