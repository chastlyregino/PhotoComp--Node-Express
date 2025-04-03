import { Request, Response, NextFunction } from 'express';
import { OrgService } from '../services/orgService';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '../models/User';
import { UserOrganizationRelationship } from '../models/Organizations';

const orgService = new OrgService();

export const checkOrgAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orgName: string = req.params.id;
        const user = res.locals.user as { id: string; email: string; role: UserRole };

        if (!user) {
            return next(new AppError('Unauthorized: Missing user information', 403));
        }

        const isAdminAtOrg: UserOrganizationRelationship | null =
            await orgService.findSpecificOrgByUser(orgName, user.id);

        if (!isAdminAtOrg || isAdminAtOrg.role !== UserRole.ADMIN) {
            return next(new AppError('Forbidden: You must be an org admin to create events.', 403));
        }

        next();
    } catch (error) {
        next(error);
    }
};

