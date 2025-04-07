import { OrgRepository } from '../repositories/orgRepository';
import { S3Service } from '../services/s3Service';
import {
    Organization,
    OrganizationCreateRequest,
    createOrganization,
    OrganizationUpdateRequest,
    updateOrganization,
    UserOrganizationRelationship,
    addOrganizationAdmin,
} from '../models/Organizations';
import { AppError } from '../middleware/errorHandler';

export class OrgService {
    private orgRepository: OrgRepository;
    private s3Service: S3Service;

    constructor(
        orgRepository: OrgRepository = new OrgRepository(),
        s3Service: S3Service = new S3Service()
    ) {
        this.orgRepository = orgRepository;
        this.s3Service = s3Service;
    }

    async validateUrl(url: string | undefined): Promise<void> {
        if (url !== undefined) {
            try {
                new URL(url);
            } catch (error) {
                throw new AppError(`Invalid URL`, 400);
            }
        }
    }

    validateUserOrgAdmin(userOrg: UserOrganizationRelationship): boolean {
        if (userOrg.role !== `ADMIN`) {
            return false;
        }
        return true;
    }

    validateUserOrgMember(userOrg: UserOrganizationRelationship): boolean {
        return userOrg?.role != null;
    }

    async createOrg(
        createOrg: OrganizationCreateRequest,
        userId: string
    ): Promise<OrganizationCreateRequest | null> {
        try {
            await this.validateUrl(createOrg.logoUrl);

            if (!createOrg.name) {
                throw new AppError('Name and logoUrl are required', 400);
            }
            // Check required fields
            if (!createOrg.name || !createOrg.logoUrl) {
                throw new AppError('Name and logoUrl are required', 400);
            }

            const existingOrg = await this.findOrgByName(createOrg.name);

            if (existingOrg) {
                throw new AppError(`Organization name already in use!`, 409);
            }

            // Upload logo to S3 and get the S3 key
            const logoS3Key = await this.s3Service.uploadLogoFromUrl(createOrg.logoUrl, createOrg.name);

            // Get pre-signed URL for the logo
            const preSignedUrl = await this.s3Service.getLogoPreSignedUrl(logoS3Key);

            // Update the organization data with S3 key and pre-signed URL
            const organizationData = {
                ...createOrg,
                logoS3Key: logoS3Key,
                // Store the pre-signed URL in logoUrl (or consider updating your model to have both)
                logoUrl: preSignedUrl,
            };

            // Create the organization with the updated data
            const org = createOrganization(organizationData, userId);

            try {
                const createdOrg = await this.orgRepository.createOrg(org);
                return organizationData;
            } catch (error) {
                if (error instanceof AppError) {
                    throw error;
                }
                throw new AppError(
                    `Organization creation failed: DB! ${(error as Error).message}`,
                    500
                );
            }
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                `Organization creation failed: Model! ${(error as Error).message}`,
                500
            );
        }
    }

    async createUserAdmin(
        orgName: string,
        userId: string
    ): Promise<UserOrganizationRelationship | null> {
        const userAdmin = addOrganizationAdmin(orgName, userId);

        try {
            const createUserAdmin = await this.orgRepository.createUserAdmin(userAdmin);

            return createUserAdmin;
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                `User Organization creation failed: Model! ${(error as Error).message}`,
                500
            );
        }
    }

    async findOrgByName(name: string): Promise<Organization | null> {
        try {
            return await this.orgRepository.findOrgByName(name);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                `Finding Organization by ID failed! ${(error as Error).message}`,
                500
            );
        }
    }

    async findSpecificOrgByUser(
        name: string,
        userId: string
    ): Promise<UserOrganizationRelationship | null> {
        try {
            const userOrg = await this.orgRepository.findSpecificOrgByUser(name, userId);
            if (!userOrg) {
                throw new AppError(`You are NOT part of this Organization`, 401);
            }

            return userOrg;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                `Finding User Organization failed! ${(error as Error).message}`,
                500
            );
        }
    }

    async findOrgsByUser(userId: string): Promise<Organization[] | null> {
        try {
            const results = await this.orgRepository.findOrgsByUser(userId);

            if (!results) {
                throw new AppError(`No Organizations found!`, 400);
            }

            // Generate fresh pre-signed URLs for all organization logos
            for (const org of results) {
                if (org.logoS3Key) {
                    try {
                        org.logoUrl = await this.s3Service.getLogoPreSignedUrl(org.logoS3Key);
                    } catch (error) {
                        // Log the error but continue processing other organizations
                        console.error(`Error getting pre-signed URL for ${org.name}:`, error);
                    }
                }
            }

            return results;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                `Finding Organization by User failed! ${(error as Error).message}`,
                500
            );
        }
    }

    async updateOrgByName(
        org: OrganizationUpdateRequest,
        userId: string
    ): Promise<OrganizationUpdateRequest | null> {
        try {
            if (!org.name) {
                throw new AppError(`You need to specify the Organization name.`, 400);
            }
            
            await this.validateUrl(org.logoUrl);
            await this.validateUrl(org.website);

            const existingOrg = await this.orgRepository.findOrgByName(org.name);

            if (!existingOrg) {
                throw new AppError(`No Organizations found!`, 400);
            }

            const updatedOrg = updateOrganization(org, existingOrg);

            return await this.orgRepository.updateOrgByName(updatedOrg);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Updating Organization failed! ${(error as Error).message}`, 500);
        }
    }

    async findAllPublicOrgs(
        lastEvaluatedKey?: Record<string, any>
    ): Promise<{ orgs: Organization[]; newLastEvaluatedKey: Record<string, any> | null }> {
        try {
            return await this.orgRepository.findAllPublicOrgs();
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Updating Organization failed! ${(error as Error).message}`, 500);
        }
    }

    /**
     * Creates a user-organization relationship
     * @param userOrg The user-organization relationship to create
     * @returns The created relationship
     */
    async createUserOrganizationRelationship(
        userOrg: UserOrganizationRelationship
    ): Promise<UserOrganizationRelationship | null> {
        try {
            return await this.orgRepository.createUserAdmin(userOrg);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                `Failed to create user-organization relationship: ${(error as Error).message}`,
                500
            );
        }
    }
}
