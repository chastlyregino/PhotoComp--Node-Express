import { Request, Response, Router } from 'express';
import { UserService } from '../services/userService';
import { OrgService } from '../services/orgService';
import {
    Organization,
    OrganizationCreateRequest,
    OrganizationUpdateRequest,
} from '../models/Organizations';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '../models/User';

const userService = new UserService();
const orgService = new OrgService();
export const orgRouter = Router();

// Get all organizations for the current user
orgRouter.get('/', async (req: Request, res: Response) => {
    try {
        const user = await userService.findUserByEmail(res.locals.user.email);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        const organizations = await orgService.findOrgsCreatedByUser(user.id);

        if (organizations && organizations.length > 0) {
            // Clean up the response data to remove internal keys
            const cleanedOrgs = organizations.map(org => {
                const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...cleanOrg } = org;
                return cleanOrg;
            });
            
            res.status(200).json({
                status: 'success',
                data: {
                    organizations: cleanedOrgs
                }
            });
        } else {
            res.status(200).json({
                status: 'success',
                data: {
                    organizations: []
                },
                message: "No organizations found"
            });
        }
    } catch (error) {
        if (error instanceof AppError) {
            return res.status(error.statusCode).json({
                status: 'error',
                message: error.message,
            });
        }

        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve organizations',
        });
    }
});

// Create a new organization
orgRouter.post('/', async (req: Request, res: Response) => {
    try {
        const { name, logoUrl, description, website, contactEmail } = req.body;

        if (!name) {
            throw new AppError('Organization name is required', 400);
        }

        const user = await userService.findUserByEmail(res.locals.user.email);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        const organizationRequest: OrganizationCreateRequest = {
            name,
            logoUrl: logoUrl || '',
            description,
            website,
            contactEmail
        };

        const newOrg = await orgService.createOrg(organizationRequest, user.id);

        if (newOrg) {
            // Update user role to admin if successful
            await userService.updateUserRole(user.id, UserRole.ADMIN);
            
            res.status(201).json({
                status: 'success',
                data: {
                    organization: newOrg
                },
                message: 'Organization created successfully'
            });
        } else {
            throw new AppError('Failed to create organization', 400);
        }
    } catch (error) {
        if (error instanceof AppError) {
            return res.status(error.statusCode).json({
                status: 'error',
                message: error.message,
            });
        }

        return res.status(500).json({
            status: 'error',
            message: 'Failed to create organization',
        });
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
