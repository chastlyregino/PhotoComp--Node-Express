// Creating an event controller

import { Request, Response, NextFunction, Router } from 'express';
import { EventService } from '../services/eventService';
import { EventRequest, Event, EventUser } from '../models/Event';
import { checkOrgAdmin, checkOrgMember, validateUserID } from '../middleware/OrgMiddleware';


const eventService = new EventService();
export const eventRouter = Router();
/*
 * Create an organization's event
 * POST /:id/events
 * */
eventRouter.post(
  '/:id/events', 
  checkOrgAdmin, 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orgName: string = req.params.id;
        const orgAdmin = res.locals.user as { id: string; email: string; role: string };

            const eventRequest: EventRequest = {
                title: req.body.title,
                description: req.body.description,
                date: req.body.date,
            };

            const event: Event = await eventService.addEventToOrganization(orgName, eventRequest);
            const userEvent: EventUser = await eventService.addEventUser(orgAdmin.id, event.id);

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
    }
);

/*
 * Get the organizations events
 * GET /:id/events
 * */
eventRouter.get(
  '/:id/events', 
  async (req: Request, res: Response, next: NextFunction) => {
    const orgID: string = req.params.id;
    try {
        const events: Event[] = await eventService.getAllOrganizationEvents(orgID);
        return res.status(200).json({
            status: 'success',
            data: {
                events: events,
            },
        });
    } catch (error) {
        next(error);
    }
});

// CURRENT function FOUND @ `orgService.ts` - `validateUserOrgAdmin(): boolean`
// CURRENT PATCH: Changing event.isPublic attribute ONLY - CHANGE LOGIC WHEN UPDATING OTHER attributes
eventRouter.patch('/:id/events/:eid', checkOrgAdmin, async (req: Request, res: Response, next: NextFunction) => {
    const eventId: string = req.params.eid;
    const user = res.locals.user.info;

        try {
            const event = await eventService.findEventById(eventId);
            await eventService.findEventUserbyUser(eventId, user.id);

            const updatedEvent = await eventService.updateEventPublicity(event as Event);

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

/*
 * Create an Attendance record for an event
 * POST /:id/events/:eid
 * */
eventRouter.post(
  "/:id/events/:eid", 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
        const eventId: string = req.params.eid;
        const member = res.locals.user as { id: string; email: string; role: string };

            const userEvent: EventUser = await eventService.addEventUser(member.id, eventId);

            return res.status(201).json({
                status: 'success',
                data: {
                    userEvent,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/*
 * Remove the Attendance record for an event
 * POST /:id/events/:eid
 * */
eventRouter.delete(
  "/:id/events/:eid", 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
        const eventId: string = req.params.eid;
        const member = res.locals.user as { id: string; email: string; role: string };

            await eventService.removeEventUser(member.id, eventId);

            return res.status(201).json({
                status: 'success',
                message: 'Attendance removed successfully',
            });
        } catch (error) {
            next(error);
        }
    }
);
