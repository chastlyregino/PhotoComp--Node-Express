import { Request, Response, Router } from 'express';
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

// throw new AppError('Email, password, first name, and last name are required', 400);

orgRouter.get(`/`, async (req: Request, res: Response) => {
    try {
        const user = await userService.findUserByEmail(res.locals.user.email);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        const org = orgService.findOrgsByUser(user.SK); // change it with getter method

        if (org) {
            res.status(200).json({ message: `Here are your organizations!`, org: org });
        } else {
            // res.status(204).json({ message: `No organizations found!` });
            throw new AppError(`No organizations found!`, 204);
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

orgRouter.post(`/`, async (req: Request, res: Response) => {
    try {
        const { name, logoUrl } = req.body;

        if(!name || !logoUrl) {
            throw new AppError('Name and logoUrl are required', 400);
        }
        const user = await userService.findUserByEmail(res.locals.user.email);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        const organization: OrganizationCreateRequest = {
            name,
            logoUrl,
        };

        const org = await orgService.createOrg(organization, user.id);

        if (org) {
            res.status(201).json({ message: `Created organization! ${JSON.stringify(req.body)}` });
        } else {
            throw new AppError(`Organization not created`, 400);
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

orgRouter.patch(`/`, async (req: Request, res: Response) => {
    const org = req.body; // update with getOrg()

    if (org) {
        const updatedOrg = org; // update with updateOrg()

        if (updatedOrg) {
            res.status(200).json({ message: `Organization updated!`, org: updatedOrg });
        } else {
            res.status(200).json({ message: `Organization not updated!` });
        }
    } else {
        res.status(400).json({ message: `Organization not found!` });
    }
}); //update the name and logo of the org

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
