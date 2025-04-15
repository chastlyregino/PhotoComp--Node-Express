import { Request, Response, Router, NextFunction } from 'express';
import { OrgService } from '../services/orgService';
import { AppError } from '../middleware/errorHandler';
import { EventService } from '../services/eventService';

const orgService = new OrgService();
const eventService = new EventService();

export const guestRouter = Router();

/*
 * Should be able to view all the public organizations, and their public
 * events.
 *
 * Limits the total organizations to 9 per request (via orgRepo);
 * */
guestRouter.get(`/`, async (req: Request, res: Response, next: NextFunction) => {
    try {
        let lastEvaluatedKey = undefined;

        if (req.query.lastEvaluatedKey && req.query.lastEvaluatedKey !== 'undefined') {
            try {
                const decodedKey = decodeURIComponent(req.query.lastEvaluatedKey as string);
                if (decodedKey) {
                    lastEvaluatedKey = JSON.parse(decodedKey);
                }
            } catch (parseError) {
                console.error("Error parsing lastEvaluatedKey:", parseError);
            }
        }

        const { orgs, newLastEvaluatedKey } = await orgService.findAllPublicOrgs(
            lastEvaluatedKey as Record<string, any>
        );

        if (!orgs || orgs.length === 0) {
            throw new AppError(`No organizations found!`, 204);
        }
        return res.status(200).json({
            message: `Here are all organizations!`,
            data: {
                organizations: orgs,
            },
            lastEvaluatedKey: newLastEvaluatedKey,
        });
    } catch (error) {
        next(error);
    }
});

/*
 * Returning the public events from a specific organizations
 *
 * Limits the total events to 9 per request (via eventRepo);
 * */
guestRouter.get(
    '/organizations/:id/events',
    async (req: Request, res: Response, next: NextFunction) => {
        const orgID: string = req.params.id;

        try {
            const { events, newLastEvaluatedKey } =
                await eventService.getAllPublicOrganizationEvents(orgID);

            if (!events || events.length === 0) {
                throw new AppError(`No public events found!`, 204);
            }

            return res.status(200).json({
                status: 'success',
                data: {
                    events: events,
                },
                lastEvaluatedKey: newLastEvaluatedKey,
            });
        } catch (error) {
            next(error);
        }
    }
);
