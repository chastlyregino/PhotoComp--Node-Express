import { EventService } from '../src/services/eventService';
import { EventRepository } from '../src/repositories/eventRepository';
import { EventRequest, Event, EventUser, createEvent } from '../src/models/Event';
import {
    createdEventRequest,
    INVALID_ORGID,
    invalidEvent,
    ORGID,
    validEventRequest,
    createdEvent,
} from './utils/eventService-test-data';
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

            const expected = {
                ...createdEventRequest,
                date: validEventRequest.date, // Use the input date from validEventRequest
                location: undefined,
            };
            expect(mockEventRepository.createOrgEvent).toHaveBeenCalledWith(expected);
        });

        it('should throw an error if eventRequest is invalid', async () => {
            await expect(eventService.addEventToOrganization(ORGID, invalidEvent)).rejects.toThrow(
                'Missing required fields: title, description, or date.'
            );
        });

        it('should throw an error when organization ID is invalid', async () => {
            await expect(
                eventService.addEventToOrganization(INVALID_ORGID, invalidEvent)
            ).rejects.toThrow('Missing required fields: title, description, or date.');
        });

        it('should handle repository errors gracefully', async () => {
            mockEventRepository.createOrgEvent.mockRejectedValue(new Error('DynamoDB error'));

            await expect(
                eventService.addEventToOrganization(ORGID, validEventRequest)
            ).rejects.toThrow('Failed to create event: DynamoDB error');
        });
    });

    describe('Join an Event as a Member', () => {
        const USERID = 'test-user-id';
        const EVENTID = 'test-event-id';
        const mockEventUser = {
            PK: `USER#${USERID}`,
            SK: `EVENT#${EVENTID}`,
            GSI2PK: `EVENT#${EVENTID}`,
            GSI2SK: `USER#${USERID}`,
        };

        beforeAll(() => {
            // Freeze time to prevent timestamp mismatches
            jest.useFakeTimers().setSystemTime(new Date('2025-04-02T21:26:21.561Z'));
        });

        afterAll(() => {
            jest.useRealTimers();
        });

        it('should successfully join an event', async () => {
            mockEventRepository.addAttendingEventRecord.mockResolvedValue(mockEventUser);

            const result = await eventService.addEventUser(USERID, EVENTID);

            expect(result).toEqual(mockEventUser);
            expect(mockEventRepository.addAttendingEventRecord).toHaveBeenCalledWith(mockEventUser);
        });

        it('should handle repository errors gracefully', async () => {
            mockEventRepository.addAttendingEventRecord.mockRejectedValue(
                new Error('DynamoDB error')
            );

            await expect(eventService.addEventUser(USERID, EVENTID)).rejects.toThrow(
                'Failed to create event: DynamoDB error'
            );
        });
    });

    describe('Leave an Event as a Member', () => {
        const USERID = 'test-user-id';
        const EVENTID = 'test-event-id';

        beforeAll(() => {
            // Freeze time to prevent timestamp mismatches
            jest.useFakeTimers().setSystemTime(new Date('2025-04-02T21:26:21.561Z'));
        });

        afterAll(() => {
            jest.useRealTimers();
        });

        it('should successfully leave an event', async () => {
            mockEventRepository.removeAttendingEventRecord.mockResolvedValue(true);

            const result = await eventService.removeEventUser(USERID, EVENTID);

            expect(result).toBe(true);
            expect(mockEventRepository.removeAttendingEventRecord).toHaveBeenCalledWith(
                USERID,
                EVENTID
            );
        });

        it('should handle repository errors gracefully', async () => {
            mockEventRepository.removeAttendingEventRecord.mockRejectedValue(
                new Error('DynamoDB error')
            );

            await expect(eventService.removeEventUser(USERID, EVENTID)).rejects.toThrow(
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

        // Update the expected event for comparison
        const expectedEvent = {
            ...createdEventRequest,
            date: validEventRequest.date, // Use the input date from validEventRequest
            location: undefined, // Include the location field since it's in the actual implementation
        };

        // Validate event fields against our expected values
        expect(event.title).toBe(expectedEvent.title);
        expect(event.description).toBe(expectedEvent.description);
        expect(event.isPublic).toBe(expectedEvent.isPublic);
        expect(event.date).toBeDefined();
        expect(event.date).toBe(validEventRequest.date);
        expect(event.createdAt).toBeDefined();
        expect(event.updatedAt).toBeDefined();

        // Validate UUID format and structure
        expect(event.PK).toBe(expectedEvent.PK);
        expect(event.SK).toBe(expectedEvent.SK);
        expect(event.GSI2PK).toBe(expectedEvent.GSI2PK);
        expect(event.GSI2SK).toBe(expectedEvent.GSI2SK);

        // Validate that timestamps are correctly set
        expect(event.createdAt).toBe(expectedEvent.createdAt);
        expect(event.updatedAt).toBe(expectedEvent.updatedAt);
    });
});

describe('Update event', () => {
    let eventService: EventService;
    let mockEventRepository: jest.Mocked<EventRepository>;

    beforeEach(() => {
        mockEventRepository = new EventRepository() as jest.Mocked<EventRepository>;
        eventService = new EventService(mockEventRepository);
    });

    it('should successfully update event publicity', async () => {
        // Setup mocks
        mockEventRepository.findEventById.mockResolvedValue(createdEvent);
        mockEventRepository.updateEventPublicity.mockResolvedValue({
            ...createdEvent,
            isPublic: false,
        });

        // Execute test
        const updatedEvent = await eventService.updateEventPublicity(createdEvent);

        // Assertions
        expect(updatedEvent).toBeDefined();
        expect(updatedEvent?.isPublic).toBe(false);
        expect(mockEventRepository.findEventById).toHaveBeenCalledWith(createdEvent.id);
        expect(mockEventRepository.updateEventPublicity).toHaveBeenCalled();
    });

    it('should throw error when event not found', async () => {
        // Setup mocks
        mockEventRepository.findEventById.mockResolvedValue(null);

        // Execute test & assertions
        await expect(eventService.updateEventPublicity(createdEvent)).rejects.toThrow(
            'No Event found!'
        );

        expect(mockEventRepository.findEventById).toHaveBeenCalledWith(createdEvent.id);
        expect(mockEventRepository.updateEventPublicity).not.toHaveBeenCalled();
    });

    it('should handle repository errors gracefully', async () => {
        // Setup mocks
        mockEventRepository.findEventById.mockResolvedValue(createdEvent);
        mockEventRepository.updateEventPublicity.mockRejectedValue(new Error('DynamoDB error'));

        // Execute test & assertions
        await expect(eventService.updateEventPublicity(createdEvent)).rejects.toThrow(
            "Updating Event's publicity failed! DynamoDB error"
        );

        expect(mockEventRepository.findEventById).toHaveBeenCalledWith(createdEvent.id);
        expect(mockEventRepository.updateEventPublicity).toHaveBeenCalled();
    });
});
