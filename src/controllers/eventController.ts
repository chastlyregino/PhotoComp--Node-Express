import { Request, Response, NextFunction, Router } from 'express';
import { EventService } from '../services/eventService';
import { OrgService } from '../services/orgService';
import { EventRequest, Event, EventUser } from '../models/Event';
import { checkOrgAdmin } from '../middleware/OrgMiddleware';
import { UserOrganizationRelationship } from '../models/Organizations';

const eventService = new EventService();
const orgService = new OrgService();
export const eventRouter = Router({ mergeParams: true });

/*
 * Create an organization's event
 * POST /events
 * */
eventRouter.post(
    '/',
    checkOrgAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const orgName: string = req.params.orgId;
            const orgAdmin = res.locals.user as { id: string; email: string; role: string };

            console.log(`Organization name from params: "${orgName}"`);

            const eventRequest: EventRequest = {
                title: req.body.title,
                description: req.body.description,
                date: req.body.date,
            };

            const event: Event = await eventService.addEventToOrganization(orgName, eventRequest);
            const userEvent: EventUser = await eventService.addEventUser(orgAdmin.id, event.id);

            //let email

            const members: UserOrganizationRelationship[] = await orgService.getOrgMembers(orgName);

            if (members) {
                const to = members.toString();
                const subject = `An update from PhotoComp!`;
                const message = `Don't miss updates on this event: ${req.body.title} - ${req.body.date}.
                Know more by checking out the website!`;
                const header = `A new event in ${orgName} has been created!`;

                res.locals.user.emailInfo = { to, message, header };
                next();
            }

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
 * GET /events
 * */
eventRouter.get(
    '/',
    async (req: Request, res: Response, next: NextFunction) => {
        const orgID: string = req.params.orgId;
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
eventRouter.patch('/:eid', checkOrgAdmin, async (req: Request, res: Response, next: NextFunction) => {
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
});

/*
 * Create an Attendance record for an event
 * POST /events/:eid
 * */
eventRouter.post(
    "/:eid",
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
});

/*
 * Remove the Attendance record for an event
 * DELETE /events/:eid
 * */
eventRouter.delete(
    "/:eid",
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