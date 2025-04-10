import { Request, Response, NextFunction, Router } from 'express';
import { getUserTaggedPhotos } from './photoTagsController';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/authMiddleware';

export const userRouter = Router();

// Apply authentication middleware to all user routes
userRouter.use(authenticate);

/**
 * Get all photos a user is tagged in
 * GET /users/:userId/tagged-photos
 */
userRouter.get('/:userId/tagged-photos', getUserTaggedPhotos);