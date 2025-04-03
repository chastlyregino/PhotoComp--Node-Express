import { EventService } from '../src/services/eventService';
import { EventRepository } from '../src/repositories/eventRepository';
import { EventRequest, Event, createEvent } from '../src/models/Event';
import { createdEventRequest, INVALID_ORGID, invalidEvent, ORGID, validEventRequest } from './utils/eventService-test-data';
import { v4 as uuidv4 } from 'uuid';

jest.mock('../src/repositories/eventRepository');
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid'),
}));

describe('EventService', () => {
    let eventService: EventService;
    let mockEventRepository: jest.Mocked<EventRepository>;

    beforeEach(() => {
        mockEventRepository = new EventRepository() as jest.Mocked<EventRepository>;
        eventService = new EventService(mockEventRepository);
    });

    describe('addEventToOrganization', () => {
        beforeAll(() => {
            // Freeze time to prevent timestamp mismatches
            jest.useFakeTimers().setSystemTime(new Date('2025-04-02T21:26:21.561Z'));
        });

        afterAll(() => {
            jest.useRealTimers();
        });

        it('should successfully create an event', async () => {
            mockEventRepository.createOrgEvent.mockResolvedValue(createdEventRequest);

            const result = await eventService.addEventToOrganization(ORGID, validEventRequest);

            expect(result).toEqual(createdEventRequest);
            expect(mockEventRepository.createOrgEvent).toHaveBeenCalledWith(createdEventRequest);
        });

        it('should throw an error if eventRequest is invalid', async () => {
            await expect(
                eventService.addEventToOrganization(ORGID, invalidEvent)
            ).rejects.toThrow('Missing required fields: title, description, or date.');
        });
        
        it('should throw an error if eventRequest is invalid', async () => {
            await expect(
                eventService.addEventToOrganization(INVALID_ORGID, invalidEvent)
            ).rejects.toThrow('Missing required fields: title, description, or date.');
        });
        
        it('should handle repository errors gracefully', async () => {

            mockEventRepository.createOrgEvent.mockRejectedValue(new Error('DynamoDB error'));

            await expect(eventService.addEventToOrganization(ORGID, validEventRequest)).rejects.toThrow(
                'Failed to create event: DynamoDB error'
            );
        });
    });
});

describe('createEvent', () => {
    beforeAll(() => {
        // Freeze time to prevent timestamp mismatches
        jest.useFakeTimers().setSystemTime(new Date('2025-04-02T21:26:21.561Z'));
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    it('should create an event with the correct structure and UUID', () => {

        const event: Event = createEvent(ORGID, validEventRequest);

        // Validate UUID format and structure
        expect(event.PK).toBe(createdEventRequest.PK);
        expect(event.SK).toBe(createdEventRequest.SK);
        expect(event.GSI2PK).toBe(createdEventRequest.GSI2PK);
        expect(event.GSI2SK).toBe(createdEventRequest.GSI2SK);

        // Validate event fields
        expect(event.title).toBe(createdEventRequest.title);
        expect(event.description).toBe(createdEventRequest.description);
        expect(event.isPublic).toBe(createdEventRequest.isPublic);
        expect(event.date).toBeDefined();
        expect(event.createdAt).toBeDefined();
        expect(event.updatedAt).toBeDefined();

        // Validate that the date is correctly set to current ISO string
        expect(event.createdAt).toBe(createdEventRequest.createdAt);
        expect(event.updatedAt).toBe(createdEventRequest.updatedAt);
    });

});
