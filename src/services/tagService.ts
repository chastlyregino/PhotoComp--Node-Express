import { TagRepository } from '../repositories/tagRepository';
import { PhotoRepository } from '../repositories/photoRepository';
import { S3Service } from './s3Service';
import { EventRepository } from '../repositories/eventRepository';
import { Tag, createTag, TagRequest } from '../models/Tag';
import { AppError } from '../middleware/errorHandler';
import { Photo } from '../models/Photo';
import { logger } from '../util/logger';
import { UserService } from './userService';

export class TagService {
    private tagRepository: TagRepository;
    private photoRepository: PhotoRepository;
    private s3Service: S3Service;
    private eventRepository: EventRepository;
    private userService: UserService;

    constructor(
        tagRepository: TagRepository = new TagRepository(),
        photoRepository: PhotoRepository = new PhotoRepository(),
        s3Service: S3Service = new S3Service(),
        eventRepository: EventRepository = new EventRepository(),
        userService: UserService = new UserService()
    ) {
        this.tagRepository = tagRepository;
        this.photoRepository = photoRepository;
        this.s3Service = s3Service;
        this.eventRepository = eventRepository;
        this.userService = userService;
    }

    /**
     * Tags multiple users in a photo
     * Only users who are attending the event can be tagged
     * @param tagRequest The tag request containing userIds, photoId and eventId
     * @param taggedBy The ID of the user creating the tags (must be an admin)
     * @returns Array of created tags
     */
    async tagUsersInPhoto(tagRequest: TagRequest, taggedBy: string): Promise<Tag[]> {
        try {
            const { userIds, photoId, eventId } = tagRequest;
            
            // Verify the photo exists and belongs to the event
            const photo = await this.photoRepository.getPhotoById(photoId);
            if (!photo) {
                throw new AppError(`Photo not found: ${photoId}`, 404);
            }
            
            if (photo.eventId !== eventId) {
                throw new AppError('Photo does not belong to the specified event', 400);
            }
            
            // Get all users attending the event
            const attendingUsers = await this.getEventAttendees(eventId);
            
            // Create tags for each user who is attending the event
            const tags: Tag[] = [];
            const invalidUsers: string[] = [];
            
            for (const userId of userIds) {
                // Check if the user exists
                const user = await this.userService.getUserById(userId);
                if (!user) {
                    invalidUsers.push(`User not found: ${userId}`);
                    continue;
                }
                
                // Check if the user is attending the event
                const isAttending = attendingUsers.some(attendee => attendee === userId);
                if (!isAttending) {
                    invalidUsers.push(`User ${userId} is not attending this event`);
                    continue;
                }
                
                // Check if the user is already tagged in this photo
                const existingTag = await this.tagRepository.getTagByUserAndPhoto(userId, photoId);
                if (existingTag) {
                    continue; // Skip this user as they're already tagged
                }
                
                // Create the tag
                const tag = createTag(userId, photoId, eventId, taggedBy);
                tags.push(tag);
            }
            
            // Create all tags in a batch operation if there are any to create
            if (tags.length > 0) {
                await this.tagRepository.batchCreateTags(tags);
            }
            
            // If there were invalid users, log them but don't fail the operation
            if (invalidUsers.length > 0) {
                logger.warn(`Some users could not be tagged: ${invalidUsers.join(', ')}`);
            }
            
            return tags;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Failed to tag users in photo: ${(error as Error).message}`, 500);
        }
    }

    /**
     * Gets all users who are attending an event
     * @param eventId The event ID
     * @returns Array of user IDs
     */
    private async getEventAttendees(eventId: string): Promise<string[]> {
        try {
            // This method would need to be implemented in the EventRepository
            // For now, we'll assume it exists and returns user IDs
            const eventUsers = await this.eventRepository.getEventAttendees(eventId);
            return eventUsers.map(eu => eu.split('#')[1]); // Extract user IDs from USER#id format
        } catch (error) {
            logger.error('Error getting event attendees:', error);
            throw new AppError(`Failed to get event attendees: ${(error as Error).message}`, 500);
        }
    }

    /**
     * Gets all photos a user is tagged in
     * @param userId The user's ID
     * @returns Array of photos with tag information
     */
    async getUserTaggedPhotos(userId: string): Promise<Photo[]> {
        try {
            // Get all tags for the user
            const tags = await this.tagRepository.getTagsByUser(userId);
            
            if (tags.length === 0) {
                return [];
            }
            
            // Get the photo details for each tag
            const photoPromises = tags.map(tag => this.photoRepository.getPhotoById(tag.photoId));
            const photos = await Promise.all(photoPromises);
            
            // Filter out any null results and refresh pre-signed URLs
            const validPhotos = photos.filter(photo => photo !== null) as Photo[];
            
            // Refresh pre-signed URLs for all photos
            for (const photo of validPhotos) {
                try {
                    if (photo?.metadata?.s3Key) {
                        photo.url = await this.s3Service.getLogoPreSignedUrl(photo.metadata.s3Key);
                    }
                } catch (error) {
                    logger.error(`Error refreshing pre-signed URL: ${error}`);
                    // Continue processing other photos even if one fails
                }
            }
            
            return validPhotos;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Failed to get user tagged photos: ${(error as Error).message}`, 500);
        }
    }

    /**
     * Gets all users tagged in a photo
     * @param photoId The photo's ID
     * @returns Array of tags with user information
     */
    async getPhotoTags(photoId: string): Promise<any[]> {
        try {
            // Get all tags for the photo
            const tags = await this.tagRepository.getTagsByPhoto(photoId);
            
            if (tags.length === 0) {
                return [];
            }
            
            // Get user details for each tag
            const taggedUsers = await Promise.all(
                tags.map(async tag => {
                    const user = await this.userService.getUserById(tag.userId);
                    return {
                        tag,
                        user: user ? {
                            id: user.id,
                            email: user.email,
                            firstName: user.firstName,
                            lastName: user.lastName
                        } : null
                    };
                })
            );
            
            return taggedUsers.filter(item => item.user !== null);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Failed to get photo tags: ${(error as Error).message}`, 500);
        }
    }

    /**
     * Removes a tag (untags a user from a photo)
     * @param userId The user's ID
     * @param photoId The photo's ID
     * @returns True if successful
     */
    async removeTag(userId: string, photoId: string): Promise<boolean> {
        try {
            // Verify the tag exists
            const tag = await this.tagRepository.getTagByUserAndPhoto(userId, photoId);
            
            if (!tag) {
                throw new AppError(`User is not tagged in this photo`, 404);
            }
            
            // Delete the tag
            return await this.tagRepository.deleteTag(userId);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Failed to remove tag: ${(error as Error).message}`, 500);
        }
    }
}