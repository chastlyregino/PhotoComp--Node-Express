// Creating an event controller

import { Request, Response, NextFunction, Router } from 'express';
import { EventService } from '../services/eventService';
import { EventRequest, Event, EventUser } from '../models/Event';
import { UserRole } from '../models/User';
import { checkOrgAdmin } from '../middleware/OrgMiddleware';
import { validateUserID } from './orgController';
import { validateUserID } from './orgController';

const eventService = new EventService();
export const eventRouter = Router();
/*
  * Create an organization's event
  * POST /:id/events
  * */
eventRouter.post('/:id/events', validateUserID, checkOrgAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orgName: string = req.params.id;
        const user = res.locals.user as { id: string; email: string; role: string };

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

/*
  * Get the organizations events 
  * GET /:id/events
  * */
eventRouter.get('/:id/events', validateUserID, async (req: Request, res: Response, next: NextFunction) => {
    const orgID: string = req.params.id;

//     try {
//         const events: Event[] = await eventService.getAllOrganizationEvents(orgID);
//         return res.status(200).json({
//             status: 'success',
//             data: {
//                 event: events,
//             },
//         });
//     } catch (error) {
//         next(error);
//     }
// });

// These should be protected via the user's role in org || Add middleware somewhere around here
// Only admins should be able to edit the events information
// Should have access to the token user, which gives me the admin role
// CURRENT function FOUND @ `orgService.ts` - `validateUserOrgAdmin(): boolean`

// CURRENT PATCH: Changing event.isPublic attribute ONLY - CHANGE LOGIC WHEN UPDATING OTHER attributes
eventRouter.patch(
    '/:id/events/:eid',
    validateUserID,
    async (req: Request, res: Response, next: NextFunction) => {
        const orgId: string = req.params.id;
        const eventId: string = req.params.eid;
        const user = res.locals.user.info;

        try {
            const event = await eventService.findEventById(eventId);
            await eventService.findEventUserbyUser(eventId, user.id);

            const updatedEvent = await eventService.updateEventPublicity(
                event as Event,
                orgId,
                user.id
            );

            return res.status(200).json({
                status: `Updating Event's publicity success!`,
                data: {
                    updatedEvent,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

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
