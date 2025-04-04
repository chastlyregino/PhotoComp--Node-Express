// src/services/orgMembershipService.ts

import { EventService } from './eventService';
import { OrgService } from './orgService';
import { UserService } from './userService';
import { OrgMembershipRepository } from '../repositories/orgMembershipRepository';
import { 
    OrganizationMembershipRequest,
    UserOrganizationRelationship,
    createOrganizationMembershipRequest,
    // UserOrganizationRelationship,
    // addOrganizationAdmin
} from '../models/Organizations';
// import { UserRole } from '../models/User';
import { AppError } from '../middleware/errorHandler';

export class OrgMembershipService {
    private orgMembershipRepository: OrgMembershipRepository;
    private eventService: EventService;
    private orgService: OrgService;
    private userService: UserService;

    constructor(
        orgMembershipRepository: OrgMembershipRepository = new OrgMembershipRepository(),
        eventService: EventService = new EventService(),
        orgService: OrgService = new OrgService(),
        userService: UserService = new UserService()
    ) {
        this.orgMembershipRepository = orgMembershipRepository;
        this.eventService = eventService;
        this.orgService = orgService;
        this.userService = userService;
    }

    /**
     * Submits a request to join an organization
     * @param organizationName The name of the organization to join
     * @param userId The ID of the user requesting to join
     * @param message Optional message from the user
     * @returns The created membership request
     */
    async applyToOrganization(
        organizationName: string,
        userId: string,
        message?: string
    ): Promise<OrganizationMembershipRequest> {
        // Validate that organization exists
        const organization = await this.orgService.findOrgByName(organizationName);
        if (!organization) {
            throw new AppError('Organization not found', 404);
        }

        // Check if organization has any events 
        const events = await this.eventService.getAllOrganizationEvents(organizationName);
        if (!events || events.length === 0) {
            throw new AppError('Cannot apply to an organization without any events', 400);
        }

        // Create the membership request
        const request = createOrganizationMembershipRequest(organizationName, userId, message);
        
        return await this.orgMembershipRepository.createMembershipRequest(request);
    }

    /**
     * Get a user by ID - utility method
     * @param userId The user ID to look up
     * @returns The user or null if not found
     */
    async getUserById(userId: string) {
        return this.userService.getUserById(userId);
    } 
    
    /**
     * Get all pending membership requests for an organization
     * @param organizationName The name of the organization
     * @returns List of pending membership requests
     */
    // async getPendingRequests(organizationName: string): Promise<OrganizationMembershipRequest[]> {
    //     return await this.orgMembershipRepository.getPendingRequestsByOrganization(organizationName);
    // }

    /**
     * Approve a membership request
     * @param organizationName The name of the organization
     * @param adminId The ID of the admin approving the request
     * @param userId The ID of the user whose request is being approved
     * @returns The updated request and the new user-org relationship
     */
    // async approveRequest(
    //     organizationName: string,
    //     userId: string
    // ): Promise<{request: OrganizationMembershipRequest, membership: UserOrganizationRelationship}> {
    //
    //     // Check if organization has events
    //     const events = await this.eventService.getAllOrganizationEvents(organizationName);
    //     if (!events || events.length === 0) {
    //         throw new AppError('Cannot approve new members for an organization without events', 400);
    //     }
    //
    //     // Update request status to APPROVED
    //     const updatedRequest = await this.orgMembershipRepository.updateRequestStatus(
    //         organizationName,
    //         userId,
    //         'APPROVED'
    //     );
    //
    //     // Create user-organization relationship with MEMBER role
    //     const userOrgRelationship = {
    //         ...addOrganizationAdmin(organizationName, userId),
    //         role: UserRole.MEMBER // Override the role from ADMIN to MEMBER
    //     };
    //     
    //     const membership = await this.orgService.createUserOrganizationRelationship(userOrgRelationship);
    //
    //     return {
    //         request: updatedRequest,
    //         membership
    //     };
    // }

    /**
     * Deny a membership request
     * @param organizationName The name of the organization
     * @param adminId The ID of the admin denying the request
     * @param userId The ID of the user whose request is being denied
     * @returns The updated request
     */
    // async denyRequest(
    //     organizationName: string,
    //     userId: string
    // ): Promise<OrganizationMembershipRequest> {
    //     // Update request status to DENIED
    //     return await this.orgMembershipRepository.updateRequestStatus(
    //         organizationName,
    //         userId,
    //         'DENIED'
    //     );
    // }

}
