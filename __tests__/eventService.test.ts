import { EventService } from '../src/services/eventService';
import { EventRepository } from '../src/repositories/eventRepository';
import { EventRequest, Event, createEvent } from '../src/models/Event';
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
            const orgID = 'ORG#123';
            const eventRequest: EventRequest = {
                title: 'New Event',
                description: 'Event description',
                date: '2025-04-15',
            };

            const expectedEvent: Event = {
                PK: 'EVENT#mock-uuid',
                SK: 'ENTITY',
                id: 'mock-uuid',
                title: 'New Event',
                description: 'Event description',
                isPublic: true,
                date: '2025-04-02T21:26:21.561Z',
                createdAt: '2025-04-02T21:26:21.561Z',
                updatedAt: '2025-04-02T21:26:21.561Z',
                GSI2PK: orgID,
                GSI2SK: 'EVENT#mock-uuid',
            };

            mockEventRepository.createOrgEvent.mockResolvedValue(expectedEvent);

            const result = await eventService.addEventToOrganization(orgID, eventRequest);

            expect(result).toEqual(expectedEvent);
            expect(mockEventRepository.createOrgEvent).toHaveBeenCalledWith(expectedEvent);
        });

        it('should throw an error if orgID is missing', async () => {
            await expect(
                eventService.addEventToOrganization('', {
                    title: 'Test',
                    description: 'Desc',
                    date: '2025-04-15',
                })
            ).rejects.toThrow('Invalid organization ID.');
        });

        it('should throw an error if eventRequest is invalid', async () => {
            await expect(
                eventService.addEventToOrganization('ORG#123', {
                    title: '',
                    description: '',
                    date: '',
                })
            ).rejects.toThrow('Missing required fields: title, description, or date.');
        });

        it('should handle repository errors gracefully', async () => {
            const orgID = 'ORG#123';
            const eventRequest: EventRequest = {
                title: 'New Event',
                description: 'Event description',
                date: '2025-04-15',
            };

            mockEventRepository.createOrgEvent.mockRejectedValue(new Error('DynamoDB error'));

            await expect(eventService.addEventToOrganization(orgID, eventRequest)).rejects.toThrow(
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
        const orgID = 'ORG#123';
        const eventRequest: EventRequest = {
            title: 'New Event',
            description: 'Event description',
            date: '2025-04-15',
        };

        const event: Event = createEvent(orgID, eventRequest);

        // Validate UUID format and structure
        expect(event.PK).toBe('EVENT#mock-uuid');
        expect(event.SK).toBe('ENTITY');
        expect(event.GSI2PK).toBe(orgID);
        expect(event.GSI2SK).toBe('EVENT#mock-uuid');

        // Validate event fields
        expect(event.title).toBe(eventRequest.title);
        expect(event.description).toBe(eventRequest.description);
        expect(event.isPublic).toBe(true);
        expect(event.date).toBeDefined();
        expect(event.createdAt).toBeDefined();
        expect(event.updatedAt).toBeDefined();

        // Validate that the date is correctly set to current ISO string
        const now = new Date().toISOString();
        expect(event.createdAt).toBe(now);
        expect(event.updatedAt).toBe(now);
    });

    it('should generate a unique UUID for each event', () => {
        (uuidv4 as jest.Mock).mockReturnValueOnce('mock-uuid-1').mockReturnValueOnce('mock-uuid-2');

        const orgID = 'ORG#123';
        const eventRequest: EventRequest = {
            title: 'Unique Event',
            description: 'Another event description',
            date: '2025-04-16',
        };

        const event1: Event = createEvent(orgID, eventRequest);
        const event2: Event = createEvent(orgID, eventRequest);

        // Ensure that two events created with the same input generate different UUIDs
        expect(event1.PK).toBe('EVENT#mock-uuid-1');
        expect(event2.PK).toBe('EVENT#mock-uuid-2');

        expect(event1.GSI2SK).toBe('EVENT#mock-uuid-1');
        expect(event2.GSI2SK).toBe('EVENT#mock-uuid-2');
    });
});
