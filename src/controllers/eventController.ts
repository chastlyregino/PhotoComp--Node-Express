// Creating an event controller 

import { Request, Response, NextFunction, Router } from 'express';
import { EventService } from '../services/eventService';
import { EventRequest, Event, EventUser } from '../models/Event';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '../models/User';
import { OrgService } from '../services/orgService';
import { UserOrganizationRelationship } from '../models/Organizations';

const orgService = new OrgService();
const eventService = new EventService();
export const eventRouter = Router();

eventRouter.post("/:id/events", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgID: string = req.params.id;
    const user = res.locals.user as { id: string; email: string; role: UserRole; };

    if (!user) {
      return next(new AppError("Unauthorized: Missing user information ", 403))
    }

    const isAdminAtOrg: UserOrganizationRelationship = await orgService.findOrgAdminById(orgID, user.id);
    if (!isAdminAtOrg || isAdminAtOrg.role !== UserRole.ADMIN) {
      return next(new AppError("Forbidden: You must be an org admin to create events.", 403));
    }

    const eventRequest: EventRequest = {
      title: req.body.title,
      description: req.body.description,
      date: req.body.date,
    }
    const event: Event = await eventService.addEventToOrganization(orgID, eventRequest);
    const userEvent: EventUser = await eventService.addEventUser(user.id, event.id);
    return res.status(201).json({
      status: 'success',
      data: {
        userEvent,
        event
      }
    })
  } catch (error) {
    next(error);
  }
})
