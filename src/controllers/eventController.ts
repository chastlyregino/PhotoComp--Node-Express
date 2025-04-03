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

eventRouter.post('/:id/events', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orgName: string = req.params.id;
        const user = res.locals.user as { id: string; email: string; role: UserRole };

        if (!user) {
            return next(new AppError('Unauthorized: Missing user information ', 403));
        }

        const isAdminAtOrg: UserOrganizationRelationship | null =
            await orgService.findSpecificOrgByUser(orgName, user.id);
        if (!isAdminAtOrg || isAdminAtOrg.role !== UserRole.ADMIN) {
            return next(new AppError('Forbidden: You must be an org admin to create events.', 403));
        }

        const eventRequest: EventRequest = {
            title: req.body.title,
            description: req.body.description,
            date: req.body.date,
        };
        const event: Event = await eventService.addEventToOrganization(orgName, eventRequest);
        const userEvent: EventUser = await eventService.addEventUser(user.id, event.id);
        return res.status(201).json({
            status: 'success',
            data: {
                userEvent,
                event,
            },
        });
    } catch (error) {
        next(error);
    }
});

// public since they're user specific
// eventRouter.get("/user/:id/events", async (req: Request, res: Response, next: NextFunction) => { })

// Should have access to the token user, which gives me admin role
// Non-Members should only see the public events
// Members should be able to see all the events

eventRouter.get('/:id/events', async (req: Request, res: Response, next: NextFunction) => {
    const orgID: string = req.params.id;
    const user = res.locals.user as {
        id: string;
        email: string;
        role: UserRole;
    };

    try {
        const events: Event[] = await eventService.getAllOrganizationEvents(orgID);
        return res.status(200).json({
            status: 'success',
            data: {
                event: events,
            },
        });
    } catch (error) {
        next(error);
    }
});

// These should be protected via the user's role in org || Add middleware somewhere around here
// Only admins should be able to edit the events information
// Should have access to the token user, which gives me the admin role
//
// eventRouter.patch("/:id/events/:eid", async (req: Request, res: Response, next: NextFunction) => {
//
//   const orgId: string = req.params.id;
//   const eventId: string = req.params.eid;
//   const token = req.headers.authorization;
//
//   // Add event body validation
//
//   try {
//     // What values am I updating
//     const updateBody: EventUpdateRequest = req.body;
//     const event: Event = await eventService.updateOrganizationEvent(orgId, eventId, updateBody);
//   } catch (error) {
//     next(error);
//   }
// })

// This should create the attending event record
// Users should be able to attend an event
// Should have access to the token user, which gives me the member role
//
// eventRouter.post("/:id/events/:eid", async (req: Request, res: Response, next: NextFunction) => {
//
//   const orgId = req.params.id;
//   const eventId = req.params.eid;
//   const token = req.headers.authorization;
//
//   // Add event body validation
//
//   try {
//     const { } = req.body;
//
//   } catch (error) {
//     next(error);
//   }
// })
