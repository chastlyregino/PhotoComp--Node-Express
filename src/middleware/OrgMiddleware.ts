import { Request, Response, NextFunction } from 'express';
import { OrgService } from '../services/orgService';
import { AppError } from './errorHandler';
import { UserRole } from '../models/User';
import { UserOrganizationRelationship } from '../models/Organizations';

const orgService = new OrgService();

export const checkOrgAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orgName: string = req.params.id;
        const user = res.locals.user as { id: string; email: string; role: UserRole };

        const userAdminOrg: UserOrganizationRelationship | null =
            await orgService.findSpecificOrgByUser(orgName, user.id);

        if (!orgService.validateUserOrgAdmin(userAdminOrg as UserOrganizationRelationship)) {
            return next(new AppError('Only an Org Admin can perform this action. Please talk to your Admin for more information', 403));
        }

        next();
    } catch (error) {
        next(error);
    }
};

