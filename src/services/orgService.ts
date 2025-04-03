import { OrgRepository } from '../repositories/orgRepository';
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

    constructor(orgRepository: OrgRepository = new OrgRepository()) {
        this.orgRepository = orgRepository;
    }

    async validateUrl(url: string | undefined): Promise<void> {
        if (url !== undefined) {
            try {
                new URL(url);
            } catch (error) {
                throw new AppError(`${(error as Error).message}`, 400);
            }
        }
    }

    async createOrg(
        createOrg: OrganizationCreateRequest,
        userId: string
    ): Promise<OrganizationCreateRequest | null> {
        try {
            await this.validateUrl(createOrg.logoUrl);

            if (!createOrg.name || !createOrg.logoUrl) {
                throw new AppError('Name and logoUrl are required', 400);
            }

            const existingOrg = await this.findOrgByName(createOrg.name);

            if (existingOrg) {
                throw new AppError(`Organization name already in use!`, 409);
            }

            const org = createOrganization(createOrg, userId);

            try {
                const creatOrg = await this.orgRepository.createOrg(org);

                return createOrg;
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
                throw new AppError(`You need to be a part of this Organization`, 401);
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

            const userOrg = (await this.findSpecificOrgByUser(
                org.name,
                userId
            )) as UserOrganizationRelationship;

            if (userOrg.role !== `ADMIN`) {
                throw new AppError(`Only Admin roles can updated Organizations`, 401);
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

    async findOrgAdminById(orgid: string, userid: string): Promise<UserOrganizationRelationship> {
        try {
            const results = await this.orgRepository.findOrgAdminById(orgid, userid);

            if (!results) {
                throw new AppError(`No Users found!`, 400);
            }

            return results;
        } catch (error: any) {
            throw new AppError(
                `Finding Organization Admin By Id Failed! ${(error as Error).message}`,
                500
            );
        }
    }
}
