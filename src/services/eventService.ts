import { EventRepository } from '../repositories/eventRepository';
import { Event, EventRequest, EventUser, createEvent, createEventUser } from '../models/Event';
import { AppError } from '../middleware/errorHandler';
import { WeatherData, WeatherService } from './weatherService';
import { GeocodingService } from './geocodingService';
import { logger } from '../util/logger';

/**
 * Service class for handling event-related operations including CRUD operations,
 * user-event relationships, and weather data integration.
 */
export class EventService {
    private eventRepository: EventRepository;
    private weatherService: WeatherService;
    private geocodingService: GeocodingService;

    /**
     * Initializes the EventService with repository and service dependencies
     *
     * @param eventRepository - Handles database operations for events
     * @param weatherService - Provides weather forecast data from Open-Meteo API
     * @param geocodingService - Provides geocoding services to convert addresses to coordinates
     */
    constructor(
        eventRepository: EventRepository = new EventRepository(),
        weatherService: WeatherService = new WeatherService(),
        geocodingService: GeocodingService = new GeocodingService()
    ) {
        this.eventRepository = eventRepository;
        this.weatherService = weatherService;
        this.geocodingService = geocodingService;
    }

    /**
     * Creates a new event for an organization with optional weather data
     *
     * If location data or address is provided with the event request, this method will
     * automatically fetch and attach weather forecast data from Open-Meteo.
     * Weather fetching failures will be logged but won't prevent event creation.
     *
     * @param orgID - The organization ID that owns the event
     * @param eventRequest - Event details including title, description, date and optional location or address
     * @returns The created Event object with weather data if available
     * @throws AppError for validation failures or database errors
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

            // If address is provided but no location, geocode the address
            if (eventRequest.address && !eventRequest.location) {
                try {
                    const geocodingResult = await this.geocodingService.geocodeAddress(
                        eventRequest.address
                    );
                    // Add the geocoded location to the event request
                    eventRequest.location = {
                        latitude: geocodingResult.latitude,
                        longitude: geocodingResult.longitude,
                        name: geocodingResult.displayName,
                    };
                    logger.info(
                        `Geocoded address "${eventRequest.address}" to coordinates [${geocodingResult.latitude}, ${geocodingResult.longitude}]`
                    );
                } catch (geocodingError) {
                    // Log the error but continue without location data
                    logger.error('Error geocoding address:', geocodingError);
                    // Don't throw - we'll create the event without location data
                }
            }

            // Create event object
            const event: Event = createEvent(orgID, eventRequest);

            // Save to database
            const createdEvent = await this.eventRepository.createOrgEvent(event);

            // If location is provided, fetch and add weather data
            if (
                createdEvent.location &&
                typeof createdEvent.location.latitude === 'number' &&
                typeof createdEvent.location.longitude === 'number'
            ) {
                try {
                    const weatherData = await this.weatherService.getWeatherForLocation(
                        createdEvent.location.latitude,
                        createdEvent.location.longitude,
                        createdEvent.date
                    );

                    // Update the event with weather data
                    return await this.eventRepository.updateEventWeather(
                        createdEvent.id,
                        weatherData
                    );
                } catch (weatherError) {
                    // Log the error but continue without weather data
                    logger.error('Error fetching weather data:', weatherError);
                    return createdEvent;
                }
            }

            return createdEvent;
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
     * Refreshes the weather forecast data for an existing event
     *
     * This method fetches the latest weather data from Open-Meteo based on
     * the event's stored location information and date. Useful for updating
     * forecasts as the event date approaches.
     *
     * @param eventId - The ID of the event to refresh weather data for
     * @returns The updated event with fresh weather data
     * @throws AppError if event not found, missing location data, or API errors
     */
    async refreshEventWeather(eventId: string): Promise<Event> {
        try {
            const event = await this.findEventById(eventId);

            if (!event) {
                throw new AppError('Event not found', 404);
            }

            if (
                !event.location ||
                typeof event.location.latitude !== 'number' ||
                typeof event.location.longitude !== 'number'
            ) {
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
     *
     * @param orgID - The organization ID to fetch events for
     * @returns A list of events for the organization
     * @throws AppError for invalid input or database errors
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
     * Retrieves all public events for a given organization with pagination support
     *
     * @param orgID - The organization ID to fetch public events for
     * @returns Object containing events array and pagination key
     * @throws AppError for invalid input or database errors
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

    /**
     * Finds an event-user relationship by event ID and user ID
     *
     * @param eventId - The event ID to check
     * @param userId - The user ID to check
     * @returns The event-user relationship if found
     * @throws AppError if relationship not found or database errors
     */
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

    /**
     * Finds an event by its ID
     *
     * @param eventId - The ID of the event to find
     * @returns The event if found
     * @throws AppError if event not found or database errors
     */
    async findEventById(eventId: string): Promise<Event | null> {
        try {
            const event = await this.eventRepository.findEventById(eventId);

            if (!event) {
                throw new AppError(`No Event found!`, 400);
            }

            return event as Event;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Finding Event by ID failed! ${(error as Error).message}`, 500);
        }
    }

    /**
     * Toggles an event's public/private status
     *
     * @param event - The event to update publicity for
     * @returns The updated event
     * @throws AppError if event not found or update fails
     */
    async updateEventPublicity(event: Event): Promise<Event | null> {
        try {
            const existingEvent = await this.findEventById(event.id);

            if (!existingEvent) {
                throw new AppError(`No Event found!`, 400);
            }

            existingEvent.isPublic = !existingEvent.isPublic;

            const updatedEvent = await this.eventRepository.updateEventPublicity(existingEvent);

            if (updatedEvent === null) {
                throw new AppError(`Updating Event's publicity failed!`, 500);
            }
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

    /**
     * Updates an entire event object in the database
     *
     * @param event - The event object with updated fields
     * @returns The updated event
     * @throws AppError if database operation fails
     */
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

    /**
     * Updates just the weather data for an event
     *
     * @param eventId - The ID of the event to update weather for
     * @param weatherData - The weather data to store with the event
     * @returns The updated event with weather data
     * @throws AppError if database operation fails
     */
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

    /**
     * Gets all the events that a user is attending. 
     *
     * @param userID - The ID of the user for which you are grabing all events 
     * @returns all the events for the user
     * @throws AppError if database operation fails
     */
    async getAllUserEvents(userId: string):Promise<Event[]>{
      try {
          return await this.eventRepository.getUserEvents(userId);
      }
      catch (error: any) {
          if (error instanceof AppError) {
              throw error;
          }
          throw new AppError(`Failed to update event weather: ${error.message}`, 500);
      }
    }
}
