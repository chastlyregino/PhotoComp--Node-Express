import { OrgRepository } from '../repositories/orgRepository';
import {
    Organization,
    OrganizationCreateRequest,
    createOrganization,
    OrganizationUpdateRequest,
    updateOrganization,
} from '../models/Organizations';
import { AppError } from '../middleware/errorHandler';

export class OrgService {
    private orgRepository: OrgRepository;

    constructor(orgRepository: OrgRepository = new OrgRepository()) {
        this.orgRepository = orgRepository;
    }

    async createOrg(
        createOrgRequest: OrganizationCreateRequest,
        userId: string
    ): Promise<Organization | null> {
        try {
            // Create the organization object from the request
            const org = createOrganization(createOrgRequest, userId);

            try {
                // Persist to database
                const createdOrg = await this.orgRepository.createOrg(org);
                return createdOrg;
            } catch (error) {
                if (error instanceof AppError) {
                    throw error;
                }
                throw new AppError(
                    `Organization creation failed: ${(error as Error).message}`,
                    500
                );
            }
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                `Organization creation failed: ${(error as Error).message}`,
                500
            );
        }
    }

    async findOrgById(id: string): Promise<Organization | null> {
        try {
            return await this.orgRepository.findOrgById(id);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                `Finding Organization by ID failed: ${(error as Error).message}`,
                500
            );
        }
    }

    async findOrgsCreatedByUser(userId: string): Promise<Organization[] | null> {
        try {
            return await this.orgRepository.findOrgsCreatedByUser(userId);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                `Finding Organizations by User failed: ${(error as Error).message}`,
                500
            );
        }
    }

    async updateOrgById(org: Organization): Promise<OrganizationUpdateRequest | null> {
        try {
            const updatedOrg = updateOrganization({
                name: org.name,
                description: org.description,
                logoUrl: org.logoUrl,
                isPublic: org.isPublic,
                website: org.website,
                contactEmail: org.contactEmail
            }, org);

            return await this.orgRepository.updateOrgById(updatedOrg);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Updating Organization failed: ${(error as Error).message}`, 500);
        }
    }
}