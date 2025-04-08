import { Request, Response, Router, NextFunction } from 'express';
import { UserService } from '../services/userService';
import { OrgService } from '../services/orgService';
import {
    Organization,
    OrganizationCreateRequest,
    OrganizationUpdateRequest,
    UserOrganizationRelationship,
} from '../models/Organizations';
import { AppError } from '../middleware/errorHandler';
import { checkOrgAdmin } from '../middleware/OrgMiddleware';

const orgService = new OrgService();
export const orgRouter = Router();

/*
 * Get all orgs that a User is a part of
 * GET /organizations
 * */
orgRouter.get(`/`, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = res.locals.user.info;

        const org = await orgService.findOrgsByUser(user.id);

        if (!org) {
            throw new AppError(`No organizations found!`, 204);
        }

        res.status(200).json({ message: `Here are your organizations!`, org: org });
    } catch (error) {
        next(error);
    }
});

/*
 * Create a new organization, and make the creator an Admin
 * POST /organizations
 * */
orgRouter.post(`/`, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, logoUrl } = req.body;
        const user = res.locals.user.info;

        const organization: OrganizationCreateRequest = {
            name,
            logoUrl,
        };

        const org = await orgService.createOrg(organization, user.id);

        if (org) {
            try {
                const userAdmin = await orgService.createUserAdmin(name, user.id, user.email);

                if (userAdmin) {
                    res.status(201).json({
                        status: 'Created organization!',
                        data: {
                            user: userAdmin.userId,
                            org: org.name,
                            logoUrl: org.logoUrl, // Return the pre-signed URL
                            logoS3Key: org.logoS3Key, // Return the S3 key for reference
                        },
                    });
                }
            } catch (error: any) {
                throw new AppError(`User Organization not created`, 400);
            }
        } else {
            throw new AppError(`Organization not created`, 400);
        }
    } catch (error) {
        next(error);
    }
});

/*
 * Update an organization's information
 * POST /organizations
 * */
orgRouter.patch(`/`, checkOrgAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, logoUrl, description, website, contactEmail } = req.body;
        const user = res.locals.user.info;

        const org: OrganizationUpdateRequest = {
            name,
            logoUrl,
            description,
            website,
            contactEmail,
        };

        const updatedOrg = await orgService.updateOrgByName(org);

        if (!updatedOrg) {
            throw new AppError(`Failed to update Organization`, 400);
        }

        res.status(200).json({
            status: 'Updated organization!',
            data: {
                org: updatedOrg,
            },
        });
    } catch (error) {
        next(error);
    }
});
