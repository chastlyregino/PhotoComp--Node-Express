import { Request, Response, NextFunction, Router } from 'express';
import { TagService } from '../services/tagService';
import { OrgService } from '../services/orgService';
import { EventService } from '../services/eventService';
import { AppError } from '../middleware/errorHandler';
import { checkOrgAdmin, checkOrgMember } from '../middleware/OrgMiddleware';
import { emailSender } from '../middleware/emailSender';
import { TagRequest } from '../models/Tag';
import { Status } from '../models/Response';

const tagService = new TagService();
const orgService = new OrgService();
const eventService = new EventService();
export const photoTagsRouter = Router({ mergeParams: true });

/**
 * Get all users tagged in a photo
 * GET /organizations/:id/events/:eventId/photos/:photoId/tags
 */
photoTagsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const photoId = req.params.photoId;

        const tags = await tagService.getPhotoTags(photoId);

        return res.status(200).json({
            status: 'success',
            data: {
                tags,
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Tag users in a photo
 * POST /organizations/:id/events/:eventId/photos/:photoId/tags
 */
photoTagsRouter.post(
    '/',
    checkOrgAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const photoId = req.params.photoId;
            const eventId = req.params.eventId;
            const { userIds } = req.body;
            const admin = res.locals.user.info;

            if (!Array.isArray(userIds) || userIds.length === 0) {
                throw new AppError('A list of user IDs is required', 400);
            }

            const tagRequest: TagRequest = {
                userIds,
                photoId,
                eventId,
            };

            const tags = await tagService.tagUsersInPhoto(tagRequest, admin.id);
            console.log(tags)
            // Prepare success response with combined data
            const status: Status = {
                statusCode: 201,
                status: 'success',
                data: [`Tagged ${tags.length} users in photo` as any, tags],
            };

            // Get event details
            const event = await eventService.findEventById(eventId);

            if (event) {
                const members = await orgService.getOrgMembers(event.GSI2PK.slice(4));

                // Add email notification if members exist
                if (members && members.length > 0) {
                    const membersEmail: string[] = members.map(member => member.email);

                    // Creates the email data.
                    const to: string = membersEmail.toString();
                    const subject: string = `An update from PhotoComp!`;
                    const message: string = `You have been tagged to a photo in the event ${event.title} in org ${event.GSI2PK.slice(4)}.
                    Know more by checking out the website!`;
                    const header: string = `You have been tagged in a photo!`;

                    res.locals.user.emailInfo = { to, message, header, subject };
                }
            }

            next(status);
        } catch (error) {
            next(error);
        }
    },
    emailSender
);

/**
 * Remove a tag (untag a user from a photo)
 * DELETE /organizations/:id/events/:eventId/photos/:photoId/tags/:userId
 */
photoTagsRouter.delete(
    '/:userId',
    checkOrgAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const photoId = req.params.photoId;
            const userId = req.params.userId;

            await tagService.removeTag(userId, photoId);

            return res.status(200).json({
                status: 'success',
                message: 'User untagged from photo successfully',
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Get all photos a user is tagged in
 * GET /users/:userId/tagged-photos
 */
export const getUserTaggedPhotos = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.params.userId;
        const requestingUserId = res.locals.user.id;

        // Users can only view their own tagged photos
        if (userId !== requestingUserId) {
            throw new AppError('You can only view your own tagged photos', 403);
        }

        const photos = await tagService.getUserTaggedPhotos(userId);

        return res.status(200).json({
            status: 'success',
            data: {
                photos,
                count: photos.length,
            },
        });
    } catch (error) {
        next(error);
    }
};
