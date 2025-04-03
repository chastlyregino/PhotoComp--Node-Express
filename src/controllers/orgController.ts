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

const userService = new UserService();
const orgService = new OrgService();
export const orgRouter = Router();

export const validateUserID = async (req: Request, res: Response, next: NextFunction) => {
    const user = await userService.getUserByEmail(res.locals.user.email);

    if (!user) {
        throw new AppError('User not found', 404);
    }

    res.locals.user.info = user;
    next();
};
orgRouter.get(`/`, validateUserID, async (req: Request, res: Response, next: NextFunction) => {
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

orgRouter.post(`/`, validateUserID, async (req: Request, res: Response, next: NextFunction) => {
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
                const userAdmin = await orgService.createUserAdmin(name, user.id);

                if (userAdmin) {
                    res.status(201).json({
                        status: 'Created organization!',
                        data: {
                            user: userAdmin.userId,
                            org: org.name,
                            logoUrl: org.logoUrl, // Return the pre-signed URL
                            logoS3Key: org.logoS3Key // Return the S3 key for reference
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

orgRouter.patch(`/`, validateUserID, async (req: Request, res: Response, next: NextFunction) => {
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

        const updatedOrg = await orgService.updateOrgByName(org, user.id);

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

// members Route
// orgRouter.get(`/members`, async (req: Request, res: Response) => {
//   const members = req.body; //update with getMembers

//   if (members) {
//     res.status(200).json({ message: `Org Members!`, orgMembers: members });
//   } else {
//     res.status(400).json({ message: `No members found!` });
//   }
// });

// orgRouter.post(`/members`, async (req: Request, res: Response) => {
//   const member = req.body; //update with updateMemberStatus()

//   if (member) {
//     res.status(201).json({ message: `Member status updated!`, orgMember: member });
//   } else {
//     res.status(400).json({ message: `Failed to update member status!` });
//   }
// });

// orgRouter.delete(`/members`, async (req: Request, res: Response) => {
//   const members = req.body; //update with getMembers

//   if (members) {
//     const member = members; // update with .getMember
//     if (member) {
//       res.status(200).json({ message: `Member deleted!`, orgMember: req.body });
//     } else {
//       res.status(400).json({ message: `No member found!` });
//     }
//   } else {
//     res.status(400).json({ message: `No members found!` });
//   }
// });

// orgRouter.patch(`/members`, async (req: Request, res: Response) => {
//   const members = req.body; //update with getMembers

//   if (members) {
//     const member = members; // update with .getMember
//     if (member) {
//       const updatedMember = member; // update with .updateMemberRole()
//       if (updatedMember) {
//         res.status(200).json({ message: `Member role updated!`, orgMember: req.body });
//       }
//       res.status(400).json({ message: `Failed to  update Member role!` });
//     } else {
//       res.status(400).json({ message: `No member found!` });
//     }
//   } else {
//     res.status(400).json({ message: `No members found!` });
//   }
// });
