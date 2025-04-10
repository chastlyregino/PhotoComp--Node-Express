import { Request, Response, NextFunction, Router } from 'express';
import { TagService } from '../services/tagService';
import { AppError } from '../middleware/errorHandler';
import { checkOrgAdmin, checkOrgMember } from '../middleware/OrgMiddleware';
import { TagRequest } from '../models/Tag';

const tagService = new TagService();
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
photoTagsRouter.post('/', checkOrgAdmin, async (req: Request, res: Response, next: NextFunction) => {
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
        
        return res.status(201).json({
            status: 'success',
            message: `Tagged ${tags.length} users in photo`,
            data: {
                tags,
            },
        });
    } catch (error) {
        next(error);
    }
});

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