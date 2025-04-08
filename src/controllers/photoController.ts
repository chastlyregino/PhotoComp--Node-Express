import { Request, Response, NextFunction, Router } from 'express';
import { PhotoService } from '../services/photoService';
import { PhotoUploadRequest } from '../models/Photo';
import { checkOrgAdmin} from '../middleware/OrgMiddleware';
import { handleUpload } from '../middleware/uploadMiddleware';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

const photoService = new PhotoService();
export const photoRouter = Router();

/**
 * Upload a photo to an event
 * POST /:id/events/:eventId/photos
 */
photoRouter.post(
    '/:id/events/:eventId/photos',
    checkOrgAdmin,
    handleUpload('photo'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const eventId = req.params.eventId;
            const user = res.locals.user.info;

            if (!req.file) {
                throw new AppError('No photo file uploaded', 400);
            }

            const photoUploadRequest: PhotoUploadRequest = {
                eventId,
                title: req.body.title,
                description: req.body.description,
            };

            // Generate a unique ID for the photo
            const photoId = uuidv4();

            // Process the file buffer from multer
            const photo = await photoService.uploadPhoto(
                photoId,
                eventId,
                req.file.buffer,
                req.file.mimetype,
                user.id,
                {
                    title: photoUploadRequest.title,
                    description: photoUploadRequest.description,
                    size: req.file.size,
                    mimeType: req.file.mimetype,
                }
            );

            return res.status(201).json({
                status: 'success',
                data: {
                    photo,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Get all photos for an event
 * GET /:id/events/:eventId/photos
 */
photoRouter.get(
    '/:id/events/:eventId/photos',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const eventId = req.params.eventId;

            const photos = await photoService.getEventPhotos(eventId);

            return res.status(200).json({
                status: 'success',
                data: {
                    photos,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Get a download URL for a specific photo
 * GET /:id/events/:eventId/photos/:photoId/download
 */
photoRouter.get(
    '/:id/events/:eventId/photos/:photoId/download',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const eventId = req.params.eventId;
            const photoId = req.params.photoId;
            const user = res.locals.user.info;
            
            // Check if user has access to the event (is a member or admin)
            const canAccess = await photoService.validateUserEventAccess(eventId, user.id);
            
            if (!canAccess) {
                throw new AppError('You do not have access to photos from this event', 403);
            }
            
            // Generate download URL
            const downloadUrl = await photoService.getPhotoDownloadUrl(photoId, eventId);
            
            return res.status(200).json({
                status: 'success',
                data: {
                    downloadUrl,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Delete a photo
 * DELETE /:id/events/:eventId/photos/:photoId
 */
photoRouter.delete(
    '/:id/events/:eventId/photos/:photoId',
    checkOrgAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const photoId = req.params.photoId;
            const eventId = req.params.eventId;

            await photoService.deletePhoto(photoId, eventId);

            return res.status(200).json({
                status: 'success',
                message: 'Photo deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    }
);
