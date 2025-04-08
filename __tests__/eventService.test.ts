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
            expect(mockEventRepository.createOrgEvent).toHaveBeenCalledWith(createdEventRequest);
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
