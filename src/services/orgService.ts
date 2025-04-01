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

    async createOrg(
        createOrg: OrganizationCreateRequest,
        userId: string
    ): Promise<OrganizationCreateRequest | null> {
        try {
            if (!createOrg.name || !createOrg.logoUrl) {
                throw new AppError('Name and logoUrl are required', 400);
            }

            const existingOrg = await this.findOrgByName(createOrg.name);

            if (existingOrg) {
                throw new AppError(`Organization name already in use!`, 409);
            }

            //enter create logic here
            const org = createOrganization(createOrg, userId);

            try {
                const creatOrg = await this.orgRepository.createOrg(org);

                //need to think about return value also in repo
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

    // Code below is for future tickets. use/remove when necessary - SCRUM-53
    // async findOrgsByUser(userId: string): Promise<Organization[] | null> {
    //     try {
    //         //enter findByUser logic here
    //         return await this.orgRepository.findOrgsByUser(userId);
    //     } catch (error) {
    //         if (error instanceof AppError) {
    //             throw error;
    //         }
    //         throw new AppError(
    //             `Finding Organization by User failed! ${(error as Error).message}`,
    //             500
    //         );
    //     }
    // }

    // Code below is for future tickets. use/remove when necessary

    //     async updateOrgById(org: Organization): Promise<OrganizationUpdateRequest | null> {
    //         try {
    //             //enter update logic here
    //             //need to think about return value also in repo
    //             return await this.orgRepository.updateOrgById(org);
    //         } catch (error) {
    //             if (error instanceof AppError) {
    //                 throw error;
    //             }
    //             throw new AppError(`Updating Organization failed! ${(error as Error).message}`, 500);
    //         }
    //     }
    // }
}
