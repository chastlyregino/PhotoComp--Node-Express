import { Request, Response, Router, NextFunction } from 'express';
import { OrgMembershipService } from '../services/orgMembershipService';
import { checkOrgAdmin, validateUserID } from '../middleware/OrgMiddleware';
import { OrganizationMembershipRequest } from '../models/Organizations';
import { UserService } from '../services/userService';

const orgMembershipService = new OrgMembershipService();
const userService = new UserService();
export const orgMembershipRouter = Router();

/**
 * Apply to join an organization
 * @route POST /organizations/:id
 */
orgMembershipRouter.post('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orgName: string = req.params.id;
        const user = res.locals.user;
        const { message } = req.body;

        const request = await orgMembershipService.applyToOrganization(orgName, user.id, message);

        return res.status(201).json({
            status: 'success',
            message: 'Application submitted successfully',
            data: {
                request,
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Get pending membership requests for an organization
 * @route GET /organizations/:id/requests
 */
orgMembershipRouter.get(
    '/:id/requests',
    checkOrgAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const orgName: string = req.params.id;
            const requests: OrganizationMembershipRequest[] =
                await orgMembershipService.getPendingRequests(orgName);
            // If there are requests, get user details for each
            const requestsWithUserDetails = await Promise.all(
                requests.map(async request => {
                    const user = await userService.getUserById(request.userId);
                    return {
                        ...request,
                        userDetails: user
                            ? {
                                  id: user.id,
                                  email: user.email,
                                  firstName: user.firstName,
                                  lastName: user.lastName,
                              }
                            : null,
                    };
                })
            );

            return res.status(200).json({
                status: 'success',
                data: {
                    requests: requestsWithUserDetails,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Approve a membership request
 * @route PUT /organizations/:id/requests/:userId
 */
orgMembershipRouter.put(
    '/:id/requests/:userId',
    checkOrgAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const orgName: string = req.params.id;
            const userId: string = req.params.userId;

            const result = await orgMembershipService.approveRequest(orgName, userId);

            return res.status(200).json({
                status: 'success',
                message: 'Membership request approved',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Deny a membership request
 * @route POST /organizations/:id/requests/:userId
 */
orgMembershipRouter.delete(
    '/:id/requests/:userId',
    checkOrgAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const orgName: string = req.params.id;
            const userId: string = req.params.userId;

            const result = await orgMembershipService.denyRequest(orgName, userId);

            return res.status(200).json({
                status: 'success',
                message: 'Membership request denied',
                data: {
                    request: result,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);
