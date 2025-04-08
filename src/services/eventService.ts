import { EventRepository } from '../repositories/eventRepository';
import { Event, EventRequest, EventUser, createEvent, createEventUser } from '../models/Event';
import { AppError } from '../middleware/errorHandler'; // Ensure meaningful errors
import { OrgService } from '../services/orgService';
import { UserOrganizationRelationship } from '@/models/Organizations';
import { WeatherData, WeatherService } from './weatherService';

/**
 * Service class for handling event-related services.
 */
export class EventService {
    private eventRepository: EventRepository;
    private weatherService: WeatherService;

    /**
     * Initializes the EventService with an optional EventRepository instance.
     * If no repository is provided, a new instance is created.
     *
     * @param eventRepository - The event repository instance (optional).
     */
    constructor(
        eventRepository: EventRepository = new EventRepository(),
        weatherService: WeatherService = new WeatherService()
    ) {
        this.eventRepository = eventRepository;
        this.weatherService = weatherService;
    }



    /**
    * Adds a new event to an organization with weather data if location is provided
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
            const createdEvent = await this.eventRepository.createOrgEvent(event);

            // If location is provided, fetch and add weather data
            if (eventRequest.location &&
                typeof eventRequest.location.latitude === 'number' &&
                typeof eventRequest.location.longitude === 'number') {

                try {
                    const weatherData = await this.weatherService.getWeatherForLocation(
                        eventRequest.location.latitude,
                        eventRequest.location.longitude,
                        eventRequest.date
                    );

                    // Update the event with weather data
                    return await this.eventRepository.updateEventWeather(createdEvent.id, weatherData);
                } catch (weatherError) {
                    // Log the error but continue without weather data
                    console.error('Error fetching weather data:', weatherError);
                    return createdEvent;
                }
            }

            return createdEvent;
        } catch (error: any) {
            throw new AppError(`Failed to create event: ${error.message}`, 500);
        }
    }


    /**
    * Refreshes weather data for an event
    * @param eventId - The ID of the event
    * @returns The updated event with refreshed weather data
    */
    async refreshEventWeather(eventId: string): Promise<Event> {
        try {
            const event = await this.findEventById(eventId);

            if (!event) {
                throw new AppError('Event not found', 404);
            }

            if (!event.location ||
                typeof event.location.latitude !== 'number' ||
                typeof event.location.longitude !== 'number') {
                throw new AppError('Event does not have location data', 400);
            }

            const weatherData = await this.weatherService.getWeatherForLocation(
                event.location.latitude,
                event.location.longitude,
                event.date
            );

            return await this.eventRepository.updateEventWeather(eventId, weatherData);
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Failed to refresh event weather: ${error.message}`, 500);
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

    async updateEvent(event: Event): Promise<Event> {
        try {
            return await this.eventRepository.updateEvent(event);
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Failed to update event: ${error.message}`, 500);
        }
    }

    async updateEventWeather(eventId: string, weatherData: WeatherData): Promise<Event> {
        try {
            return await this.eventRepository.updateEventWeather(eventId, weatherData);
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Failed to update event weather: ${error.message}`, 500);
        }
    }
}
