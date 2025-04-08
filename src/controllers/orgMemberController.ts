import { Request, Response, Router, NextFunction } from 'express';
import { OrgService } from '../services/orgService';
import { checkOrgAdmin } from '../middleware/OrgMiddleware';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '../models/User';
import { UserService } from '../services/userService';

const orgService = new OrgService();
const userService = new UserService();
export const orgMemberRouter = Router();

/**
 * Get all members of an organization
 * @route GET /organizations/:id/members
 */
orgMemberRouter.get(
    '/:id/members',
    checkOrgAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const orgName: string = req.params.id;

            const members = await orgService.getOrgMembers(orgName);
            const membersWithUserDetails = await Promise.all(
                members.map(async request => {
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
                    members: membersWithUserDetails,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Remove a member from an organization
 * @route DELETE /organizations/:id/members/:userId
 */
orgMemberRouter.delete(
    '/:id/members/:userId',
    checkOrgAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const orgName: string = req.params.id;
            const userId: string = req.params.userId;
            const adminId = res.locals.user.id;

            // Prevent admins from removing themselves
            if (userId === adminId) {
                throw new AppError(
                    'Administrators cannot remove themselves from the organization',
                    400
                );
            }

            await orgService.removeMember(orgName, userId);

            return res.status(200).json({
                status: 'success',
                message: 'Member removed successfully',
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Update a member's role in an organization
 * @route PATCH /organizations/:id/members/:userId
 */
orgMemberRouter.patch(
    '/:id/members/:userId',
    checkOrgAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const orgName: string = req.params.id;
            const userId: string = req.params.userId;
            const { role } = req.body;
            const adminId = res.locals.user.id;

            // Validate role
            if (!role || (role !== UserRole.ADMIN && role !== UserRole.MEMBER)) {
                throw new AppError('Role must be either ADMIN or MEMBER', 400);
            }

            // Prevent admins from changing their own role
            if (userId === adminId) {
                throw new AppError('Administrators cannot change their own role', 400);
            }

            const updatedMember = await orgService.updateMemberRole(
                orgName,
                userId,
                role as UserRole
            );

            return res.status(200).json({
                status: 'success',
                message: 'Member role updated successfully',
                data: {
                    member: updatedMember,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);
