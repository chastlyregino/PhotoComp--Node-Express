import { Request, Response, NextFunction, Router } from 'express';
import { PhotoService } from '../services/photoService';
import { AppError } from '../middleware/errorHandler';
import { checkOrgMember } from '../middleware/OrgMiddleware';

const photoService = new PhotoService();
export const orgPhotosRouter = Router({ mergeParams: true });

/**
 * Get all photos for an organization across all events
 * @route GET /organizations/:orgId/photos
 */
orgPhotosRouter.get(
    '/',
    checkOrgMember,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const orgName: string = req.params.orgId;
            const user = res.locals.user.info;

            const { photos, events } = await photoService.getAllOrganizationPhotos(
                orgName,
                user.id
            );

            // Add event information to each photo for the response
            const photosWithEventInfo = photos.map(photo => {
                const event = events.get(photo.eventId);
                return {
                    ...photo,
                    event: event
                        ? {
                              id: event.id,
                              title: event.title,
                              date: event.date,
                          }
                        : null,
                };
            });

            return res.status(200).json({
                status: 'success',
                data: {
                    photos: photosWithEventInfo,
                    count: photos.length,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);
