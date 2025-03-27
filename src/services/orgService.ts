import { OrgRepository } from '../repositories/orgRepository';
import {
    Organization,
    OrganizationCreateRequest,
    createOrganization,
    OrganizationUpdateRequest,
    updateOrganization,
    UserOrganizationRelationship,
    createOrganizationAdmin,
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
            //add unique org name logic

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

    async findOrgById(id: string): Promise<Organization | null> {
        try {
            //enter findById logic here
            //const org =
            return await this.orgRepository.findOrgById(id);
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

    async findOrgsByUser(userId: string): Promise<Organization[] | null> {
        try {
            //enter findByUser logic here
            return await this.orgRepository.findOrgsByUser(userId);
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

    async updateOrgById(org: Organization): Promise<OrganizationUpdateRequest | null> {
        try {
            //enter update logic here
            //need to think about return value also in repo
            return await this.orgRepository.updateOrgById(org);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Updating Organization failed! ${(error as Error).message}`, 500);
        }
    }
}
