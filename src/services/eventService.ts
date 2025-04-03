import { EventRepository } from '../repositories/eventRepository';
import { Event, EventRequest, EventUser, createEvent, createEventUser } from '../models/Event';
import { AppError } from '../middleware/errorHandler'; // Ensure meaningful errors

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
}
