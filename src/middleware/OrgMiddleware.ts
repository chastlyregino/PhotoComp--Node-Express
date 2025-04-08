import { Request, Response, NextFunction } from 'express';
import { OrgService } from '../services/orgService';
import { AppError } from './errorHandler';
import { UserRole } from '../models/User';
import { UserOrganizationRelationship } from '../models/Organizations';
import { UserService } from '../services/userService';

const orgService = new OrgService();
const userService = new UserService();

export const checkOrgAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orgName: string = req.params.orgId;
        const user = res.locals.user as { id: string; email: string; role: UserRole };

        const userAdminOrg: UserOrganizationRelationship | null =
            await orgService.findSpecificOrgByUser(orgName, user.id);

        if (!orgService.validateUserOrgAdmin(userAdminOrg as UserOrganizationRelationship)) {
            return next(
                new AppError(
                    'Only an Org Admin can perform this action. Please talk to your Admin for more information',
                    403
                )
            );
        }

        next();
    } catch (error) {
        next(error);
    }
};

export const checkOrgMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orgName: string = req.params.orgId;
        const user = res.locals.user as { id: string; email: string; role: UserRole };

        console.log(`Checking organization membership for org: "${orgName}" and user: ${user.id}`);

        const userMemberOrg: UserOrganizationRelationship | null =
            await orgService.findSpecificOrgByUser(orgName, user.id);

        if (!orgService.validateUserOrgMember(userMemberOrg as UserOrganizationRelationship)) {
            return next(
                new AppError(
                    'Only an Org Member can perform this action. Please talk to the Admin for more information',
                    403
                )
            );
        }

        next();
    } catch (error) {
        next(error);
    }
};

export const validateUserID = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await userService.getUserByEmail(res.locals.user.email);

        if (!user) {
            return next(new AppError('User not found', 404));
        }

        res.locals.user.info = user;
        next();
    } catch (error) {
        return next(error instanceof AppError ? error : new AppError(`User validation failed: ${(error as Error).message}`, 500));
    }
};