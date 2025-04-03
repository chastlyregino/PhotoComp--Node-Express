// Creating an event controller

import { Request, Response, NextFunction, Router } from 'express';
import { EventService } from '../services/eventService';
import { EventRequest, Event, EventUser } from '../models/Event';
import { UserRole } from '../models/User';
import { checkOrgAdmin } from '../middleware/OrgMiddleware';

const eventService = new EventService();
export const eventRouter = Router();
/*
  * Create an organization's event
  * POST /:id/events
  * */
eventRouter.post('/:id/events', checkOrgAdmin, async (req: Request, res: Response, next: NextFunction) => {
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

