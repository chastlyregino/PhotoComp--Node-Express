import { PhotoRepository } from '../repositories/photoRepository';
import { S3Service } from './s3Service';
import { Photo, createPhoto } from '../models/Photo';
import { AppError } from '../middleware/errorHandler';
import { EventService } from './eventService';
import { logger } from '../util/logger';
import { EventRepository } from '../repositories/eventRepository';
import { Event as EventModel } from '../models/Event';
import { OrgService } from './orgService';

export class PhotoService {
    private photoRepository: PhotoRepository;
    private s3Service: S3Service;
    private eventService: EventService;
    private eventRepository: EventRepository;

    constructor(
        photoRepository: PhotoRepository = new PhotoRepository(),
        s3Service: S3Service = new S3Service(),
        eventService: EventService = new EventService(),
        eventRepository: EventRepository = new EventRepository()
    ) {
        this.photoRepository = photoRepository;
        this.s3Service = s3Service;
        this.eventService = eventService;
        this.eventRepository = eventRepository;
    }

    /**
     * Upload a photo for an event
     * @param photoId The unique ID for the photo
     * @param eventId The event ID the photo belongs to
     * @param fileBuffer The file buffer containing the photo data
     * @param mimeType The MIME type of the photo
     * @param uploadedBy The user ID of who uploaded the photo
     * @param metadata Additional metadata for the photo
     * @returns The created photo object
     */
    async uploadPhoto(
        photoId: string,
        eventId: string,
        fileBuffer: Buffer,
        mimeType: string,
        uploadedBy: string,
        metadata?: {
            title?: string;
            description?: string;
            size?: number;
            mimeType?: string;
            s3Key?: string;
        }
    ): Promise<Photo> {
        try {
            // Verify that the event exists
            const event = await this.eventService.findEventById(eventId);
            if (!event) {
                throw new AppError(`Event not found: ${eventId}`, 404);
            }

            // Create the S3 key using a structured pattern
            const fileExtension = mimeType.split('/')[1] || 'jpg';
            const s3Key = `photos/${eventId}/${photoId}.${fileExtension}`;

            // Upload the file to S3
            await this.s3Service.uploadFileBuffer(fileBuffer, s3Key, mimeType);

            // Add S3 key to metadata
            const updatedMetadata = metadata || {};
            updatedMetadata.s3Key = s3Key;

            // Generate a pre-signed URL for accessing the photo
            const photoUrl = await this.s3Service.getLogoPreSignedUrl(s3Key);

            // Create and save the photo record
            const photo = createPhoto(photoId, eventId, photoUrl, uploadedBy, updatedMetadata);
            await this.photoRepository.createPhoto(photo);

            return photo;
        } catch (error) {
            logger.error('Error uploading photo:', error);
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Failed to upload photo: ${(error as Error).message}`, 500);
        }
    }

    /**
     * Get all photos for an event
     * @param eventId The event ID to get photos for
     * @returns Array of photos for the event
     */
    async getEventPhotos(eventId: string): Promise<Photo[]> {
        try {
            // Verify that the event exists
            const event = await this.eventService.findEventById(eventId);
            if (!event) {
                throw new AppError(`Event not found: ${eventId}`, 404);
            }

            // Get all photos for the event with better error handling
            try {
                const photos = await this.photoRepository.getPhotosByEvent(eventId);

                // Ensure photos is an array
                if (!Array.isArray(photos)) {
                    logger.warn(`Expected photos to be an array, but got: ${typeof photos}`);
                    return [];
                }

                // Refresh pre-signed URLs for all photos
                for (const photo of photos) {
                    try {
                        if (photo?.metadata?.s3Key) {
                            // If we have the S3 key stored directly, use it
                            photo.url = await this.s3Service.getLogoPreSignedUrl(
                                photo.metadata.s3Key
                            );
                        } else if (photo?.url) {
                            // Otherwise, try to extract it from the URL
                            try {
                                const urlParts = new URL(photo.url);
                                const s3Key = urlParts.pathname.substring(1); // Remove leading slash
                                photo.url = await this.s3Service.getLogoPreSignedUrl(s3Key);
                            } catch (error) {
                                logger.error(`Error refreshing pre-signed URL for photo: ${error}`);
                                // Keep original URL if parsing fails
                            }
                        }
                    } catch (error) {
                        logger.error(`Error refreshing pre-signed URL: ${error}`);
                        // Continue processing other photos even if one fails
                    }
                }

                return photos;
            } catch (error) {
                logger.error(`Error in photoRepository.getPhotosByEvent: ${error}`);
                // Return empty array on repository error to prevent controller failure
                return [];
            }
        } catch (error) {
            logger.error('Error getting event photos:', error);
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Failed to get event photos: ${(error as Error).message}`, 500);
        }
    }

    /**
     * Delete a photo
     * @param photoId The ID of the photo to delete
     * @param eventId The event ID the photo belongs to (for validation)
     */
    async deletePhoto(photoId: string, eventId: string): Promise<void> {
        try {
            // Get the photo to verify it exists and belongs to the right event
            const photo = await this.photoRepository.getPhotoById(photoId);

            if (!photo) {
                throw new AppError(`Photo not found: ${photoId}`, 404);
            }

            if (photo.eventId !== eventId) {
                throw new AppError('Photo does not belong to the specified event', 400);
            }

            // Delete the photo from the database
            await this.photoRepository.deletePhoto(photoId);

            // If we have the S3 key stored directly, use it
            // Otherwise, extract it from the URL
            const s3Key =
                photo.metadata?.s3Key ||
                (() => {
                    try {
                        const urlParts = new URL(photo.url);
                        return urlParts.pathname.substring(1); // Remove leading slash
                    } catch (error) {
                        logger.error(`Error parsing photo URL: ${photo.url}`, error);
                        return null;
                    }
                })();

            if (s3Key) {
                // Delete the file from S3
                try {
                    await this.s3Service.deleteFile(s3Key);
                    logger.info(`Deleted photo file from S3: ${s3Key}`);
                } catch (error) {
                    logger.error(`Error deleting photo file from S3: ${error}`);
                    // Continue with database deletion even if S3 deletion fails
                }
            } else {
                logger.warn(`Could not determine S3 key for photo: ${photoId}`);
            }
        } catch (error) {
            logger.error('Error deleting photo:', error);
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Failed to delete photo: ${(error as Error).message}`, 500);
        }
    }

    /**
     * Validates if a user has access to an event's photos
     * @param eventId The event ID to check access for
     * @param userId The user ID requesting access
     * @returns Boolean indicating if the user has access
     */
    async validateUserEventAccess(eventId: string, userId: string): Promise<boolean> {
        try {
            // Check if the user is attending the event
            const eventUser = await this.eventRepository.findEventUserbyUser(eventId, userId);
            return !!eventUser; // Return true if the user is found, false otherwise
        } catch (error) {
            logger.error('Error validating user event access:', error);
            return false; // Default to no access on error
        }
    }

    /**
     * Gets a download URL for a specific photo
     * @param photoId The ID of the photo to download
     * @param eventId The event ID the photo belongs to (for validation)
     * @returns A pre-signed download URL for the photo
     */
    async getPhotoDownloadUrl(photoId: string, eventId: string): Promise<string> {
        try {
            // Get the photo to verify it exists and belongs to the right event
            const photo = await this.photoRepository.getPhotoById(photoId);

            if (!photo) {
                throw new AppError(`Photo not found: ${photoId}`, 404);
            }

            if (photo.eventId !== eventId) {
                throw new AppError('Photo does not belong to the specified event', 400);
            }

            // Get the S3 key from metadata or extract it from the URL
            const s3Key =
                photo.metadata?.s3Key ||
                (() => {
                    try {
                        const urlParts = new URL(photo.url);
                        return urlParts.pathname.substring(1); // Remove leading slash
                    } catch (error) {
                        logger.error(`Error parsing photo URL: ${photo.url}`, error);
                        throw new AppError('Could not determine photo storage location', 500);
                    }
                })();

            if (!s3Key) {
                throw new AppError('Photo storage information missing', 500);
            }

            // Generate a filename for the download
            const filename = `photo-${photoId}.jpg`;

            // Get a download URL with content-disposition header
            return await this.s3Service.getDownloadUrl(s3Key, filename);
        } catch (error) {
            logger.error('Error generating photo download URL:', error);
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                `Failed to get photo download URL: ${(error as Error).message}`,
                500
            );
        }
    }


 /**
     * Get all photos for an organization across all events
     * @param orgName The organization name
     * @param userId The user ID requesting the photos
     * @returns Array of photos with their associated event information
     */
 async getAllOrganizationPhotos(orgName: string, userId: string): Promise<{ photos: Photo[]; events: Map<string, EventModel> }> {
    try {
        // Check if the user is a member of the organization
        const orgService = new OrgService();
        const userOrg = await orgService.findSpecificOrgByUser(orgName, userId);
        
        if (!userOrg) {
            throw new AppError('You are not a member of this organization', 403);
        }
        
        // Get all events for the organization
        const eventService = new EventService();
        const events = await eventService.getAllOrganizationEvents(orgName);
        
        if (!events || events.length === 0) {
            return { photos: [], events: new Map() };
        }
        
        // Create a map of event IDs to event objects for easy reference
        const eventMap = new Map<string, EventModel>();
        events.forEach(event => {
            eventMap.set(event.id, event);
        });
        
        // Get photos for each event
        const photoPromises = events.map(event => this.photoRepository.getPhotosByEvent(event.id));
        const photoArrays = await Promise.all(photoPromises);
        
        // Flatten the array of photo arrays
        let allPhotos: Photo[] = [];
        photoArrays.forEach(photos => {
            allPhotos = allPhotos.concat(photos);
        });
        
        // Refresh pre-signed URLs for all photos
        for (const photo of allPhotos) {
            try {
                if (photo?.metadata?.s3Key) {
                    photo.url = await this.s3Service.getLogoPreSignedUrl(photo.metadata.s3Key);
                }
            } catch (error) {
                logger.error(`Error refreshing pre-signed URL: ${error}`);
                // Continue processing other photos even if one fails
            }
        }
        
        return { photos: allPhotos, events: eventMap };
    } catch (error) {
        logger.error('Error getting organization photos:', error);
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError(`Failed to get organization photos: ${(error as Error).message}`, 500);
    }
}
}
