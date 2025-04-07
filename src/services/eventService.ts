import { EventRepository } from '../repositories/eventRepository';
import { Event, EventRequest, EventUser, createEvent, createEventUser } from '../models/Event';
import { AppError } from '../middleware/errorHandler'; // Ensure meaningful errors
import { OrgService } from '../services/orgService';
import { UserOrganizationRelationship } from '@/models/Organizations';

/**
 * Service class for handling event-related services.
 */
export class EventService {
    private eventRepository: EventRepository;

    /**
     * Initializes the EventService with an optional EventRepository instance.
     * If no repository is provided, a new instance is created.
     *
     * @param eventRepository - The event repository instance (optional).
     */
    constructor(eventRepository: EventRepository = new EventRepository()) {
        this.eventRepository = eventRepository;
    }

    /**
     * Adds a new event to an organization
     * @param orgID - The organization ID
     * @param eventRequest - The event details
     * @returns The created Event object
     */
    async addEventToOrganization(orgID: string, eventRequest: EventRequest): Promise<Event> {
        try {
            if (!orgID) throw new AppError('Invalid organization ID.', 400);

            // Validate event request
            if (
                !eventRequest ||
                !eventRequest.title ||
                !eventRequest.description ||
                !eventRequest.date
            ) {
                throw new AppError('Missing required fields: title, description, or date.', 400);
            }

            // Create event object
            const event: Event = createEvent(orgID, eventRequest);

            // Save to database
            return await this.eventRepository.createOrgEvent(event);
        } catch (error: any) {
            throw new AppError(`Failed to create event: ${error.message}`, 500);
        }
    }

    /**
     * Adds a user to an event by creating an attendance record.
     *
     * @param userID - The ID of the user attending the event.
     * @param eventID - The ID of the event the user is attending.
     * @returns The created EventUser record.
     * @throws {AppError} If the database operation fails.
     */
    async addEventUser(userID: string, eventID: string): Promise<EventUser> {
        try {
            const eventUser: EventUser = createEventUser(userID, eventID);
            return await this.eventRepository.addAttendingEventRecord(eventUser);
        } catch (error: any) {
            throw new AppError(`Failed to create event: ${error.message}`, 500);
        }
    }
    /**
     * Removes a user from an event by removing an attendance record.
     *
     * @param userID - The ID of the user attending the event.
     * @param eventID - The ID of the event the user is attending.
     * @returns The deleted EventUser record.
     * @throws {AppError} If the database operation fails.
     */
    async removeEventUser(userID: string, eventID: string): Promise<Boolean> {
        try {
            return await this.eventRepository.removeAttendingEventRecord(userID, eventID);
        } catch (error: any) {
            throw new AppError(`Failed to create event: ${error.message}`, 500);
        }
    }

    /**
     * Retrieves all events for a given organization
     * @param orgID - The organization ID
     * @returns A list of events for the organization
     */
    async getAllOrganizationEvents(orgID: string): Promise<Event[]> {
        try {
            if (!orgID) throw new AppError('Invalid organization ID.', 400);

            return await this.eventRepository.getOrgEvents(orgID);
        } catch (error: any) {
            throw new AppError(`Failed to retrieve organization events: ${error.message}`, 500);
        }
    }

    /**
     * Retrieves all public events for a given organization
     * @param orgID - The organization ID
     * @returns A list of events for the organization
     */
    async getAllPublicOrganizationEvents(
        orgID: string
    ): Promise<{ events: Event[]; newLastEvaluatedKey: Record<string, any> | null }> {
        try {
            if (!orgID) throw new AppError('Invalid organization ID.', 400);

            return await this.eventRepository.getPublicOrgEvents(orgID);
        } catch (error: any) {
            throw new AppError(`Failed to retrieve organization events: ${error.message}`, 500);
        }
    }

    async findEventUserbyUser(eventId: string, userId: string): Promise<EventUser | null> {
        try {
            const eventUser = await this.eventRepository.findEventUserbyUser(eventId, userId);

            if (!eventUser) {
                throw new AppError(`No Event-User found!`, 400);
            }

            return eventUser;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                `Finding Event-User by User failed! ${(error as Error).message}`,
                500
            );
        }
    }

    async findEventById(eventId: string): Promise<Event | null> {
        try {
            const event = await this.eventRepository.findEventById(eventId);

            if (!event) {
                throw new AppError(`No Event found!`, 400);
            }

            // console.log(event);
            return event as Event;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Finding Event by ID failed! ${(error as Error).message}`, 500);
        }
    }

    async updateEventPublicity(event: Event): Promise<Event | null> {
        try {
            const existingEvent = await this.findEventById(event.id);

            if (!existingEvent) {
                throw new AppError(`No Event found!`, 400);
            }

            // console.log(`before ${event}`)
            existingEvent.isPublic = !existingEvent.isPublic;
            // console.log(`after ${event.isPublic}`)

            const updatedEvent = await this.eventRepository.updateEventPublicity(existingEvent);

            if (updatedEvent === null) {
                throw new AppError(`Updating Event's publicity failed!`, 500);
            }
            // console.log(updatedEvent);
            return updatedEvent as Event;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                `Updating Event's publicity failed! ${(error as Error).message}`,
                500
            );
        }
    }
}
