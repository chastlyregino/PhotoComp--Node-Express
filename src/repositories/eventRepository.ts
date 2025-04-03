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

}
