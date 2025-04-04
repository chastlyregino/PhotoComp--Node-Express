// tests/services/orgMembershipService.test.ts

import { OrgMembershipService } from '../src/services/orgMembershipService';
import { OrgMembershipRepository } from '../src/repositories/orgMembershipRepository';
import { EventService } from '../src/services/eventService';
import { OrgService } from '../src/services/orgService';
import { AppError } from '../src/middleware/errorHandler';
import { OrganizationMembershipRequest } from '../src/models/Organizations';

jest.mock('../src/repositories/orgMembershipRepository');
jest.mock('../src/services/eventService');
jest.mock('../src/services/orgService');

describe('OrgMembershipService', () => {
    let orgMembershipService: OrgMembershipService;
    let mockOrgMembershipRepository: jest.Mocked<OrgMembershipRepository>;
    let mockEventService: jest.Mocked<EventService>;
    let mockOrgService: jest.Mocked<OrgService>;

    const mockOrganizationName = 'testOrg';
    const mockUserId = 'user123';
    const mockMessage = 'Please let me join your organization';

    beforeEach(() => {
        jest.clearAllMocks();

        mockOrgMembershipRepository = new OrgMembershipRepository() as jest.Mocked<OrgMembershipRepository>;
        mockEventService = new EventService() as jest.Mocked<EventService>;
        mockOrgService = new OrgService() as jest.Mocked<OrgService>;

        orgMembershipService = new OrgMembershipService(
            mockOrgMembershipRepository,
            mockEventService,
            mockOrgService
        );
    });

    describe('applyToOrganization', () => {
        it('should successfully create a membership request ', async () => {
            const mockOrg = { name: mockOrganizationName, isPublic: true } as any;
            const mockEvents = [{ id: 'event1', title: 'Test Event' }] as any[];
            const mockRequest = {
                organizationName: mockOrganizationName,
                userId: mockUserId,
                message: mockMessage,
                status: 'PENDING',
                PK: `ORG#${mockOrganizationName.toUpperCase()}`,
                SK: `REQUEST#${mockUserId}`
            } as unknown as OrganizationMembershipRequest;

            mockOrgService.findOrgByName.mockResolvedValue(mockOrg);
            mockEventService.getAllOrganizationEvents.mockResolvedValue(mockEvents);
            mockOrgMembershipRepository.createMembershipRequest.mockResolvedValue(mockRequest);

            const result = await orgMembershipService.applyToOrganization(
                mockOrganizationName, 
                mockUserId, 
                mockMessage
            );

            expect(mockOrgService.findOrgByName).toHaveBeenCalledWith(mockOrganizationName);
            expect(mockEventService.getAllOrganizationEvents).toHaveBeenCalledWith(mockOrganizationName);
            expect(mockOrgMembershipRepository.createMembershipRequest).toHaveBeenCalled();
            expect(result).toEqual(mockRequest);
        });

        it('should throw an error if the organization does not exist', async () => {
            mockOrgService.findOrgByName.mockResolvedValue(null);

            await expect(
                orgMembershipService.applyToOrganization(mockOrganizationName, mockUserId, mockMessage)
            ).rejects.toThrow(new AppError('Organization not found', 404));

            expect(mockOrgService.findOrgByName).toHaveBeenCalledWith(mockOrganizationName);
            expect(mockEventService.getAllOrganizationEvents).not.toHaveBeenCalled();
            expect(mockOrgMembershipRepository.createMembershipRequest).not.toHaveBeenCalled();
        });

        it('should throw an error if the organization has no events', async () => {
            const mockOrg = { name: mockOrganizationName, isPublic: true } as any;
            mockOrgService.findOrgByName.mockResolvedValue(mockOrg);
            mockEventService.getAllOrganizationEvents.mockResolvedValue([]);

            await expect(
                orgMembershipService.applyToOrganization(mockOrganizationName, mockUserId, mockMessage)
            ).rejects.toThrow(new AppError('Cannot apply to an organization without any events', 400));

            expect(mockOrgService.findOrgByName).toHaveBeenCalledWith(mockOrganizationName);
            expect(mockEventService.getAllOrganizationEvents).toHaveBeenCalledWith(mockOrganizationName);
            expect(mockOrgMembershipRepository.createMembershipRequest).not.toHaveBeenCalled();
        });

        it('should throw errors from the repository', async () => {
            // Arrange
            const mockOrg = { name: mockOrganizationName, isPublic: true } as any;
            const mockEvents = [{ id: 'event1', title: 'Test Event' }] as any[];
            const repositoryError = new AppError('Database error', 500);

            mockOrgService.findOrgByName.mockResolvedValue(mockOrg);
            mockEventService.getAllOrganizationEvents.mockResolvedValue(mockEvents);
            mockOrgMembershipRepository.createMembershipRequest.mockRejectedValue(repositoryError);

            await expect(
                orgMembershipService.applyToOrganization(mockOrganizationName, mockUserId, mockMessage)
            ).rejects.toThrow(repositoryError);

            expect(mockOrgService.findOrgByName).toHaveBeenCalledWith(mockOrganizationName);
            expect(mockEventService.getAllOrganizationEvents).toHaveBeenCalledWith(mockOrganizationName);
            expect(mockOrgMembershipRepository.createMembershipRequest).toHaveBeenCalled();
        });

        it('should create a request without a message when none is provided', async () => {
            // Arrange
            const mockOrg = { name: mockOrganizationName, isPublic: true } as any;
            const mockEvents = [{ id: 'event1', title: 'Test Event' }] as any[];
            const mockRequest = {
                organizationName: mockOrganizationName,
                userId: mockUserId,
                message: undefined,
                status: 'PENDING',
                PK: `ORG#${mockOrganizationName.toUpperCase()}`,
                SK: `REQUEST#${mockUserId}`
            } as unknown as OrganizationMembershipRequest;

            mockOrgService.findOrgByName.mockResolvedValue(mockOrg);
            mockEventService.getAllOrganizationEvents.mockResolvedValue(mockEvents);
            mockOrgService.findSpecificOrgByUser.mockResolvedValue(null);
            mockOrgMembershipRepository.createMembershipRequest.mockResolvedValue(mockRequest);

            const result = await orgMembershipService.applyToOrganization(
                mockOrganizationName, 
                mockUserId
            );

            expect(mockOrgMembershipRepository.createMembershipRequest).toHaveBeenCalled();
            expect(result).toEqual(mockRequest);
        });
    });
});
