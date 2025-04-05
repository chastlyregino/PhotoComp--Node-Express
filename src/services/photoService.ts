import { PhotoRepository } from '../repositories/photoRepository';
import { S3Service } from './s3Service';
import { Photo, createPhoto } from '../models/Photo';
import { AppError } from '../middleware/errorHandler';
import { EventService } from './eventService';
import { logger } from '../util/logger';

export class PhotoService {
    private photoRepository: PhotoRepository;
    private s3Service: S3Service;
    private eventService: EventService;

    constructor(
        photoRepository: PhotoRepository = new PhotoRepository(),
        s3Service: S3Service = new S3Service(),
        eventService: EventService = new EventService()
    ) {
        this.photoRepository = photoRepository;
        this.s3Service = s3Service;
        this.eventService = eventService;
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
            if (!metadata) metadata = {};
            metadata.s3Key = s3Key;

            // Generate a pre-signed URL for accessing the photo
            const photoUrl = await this.s3Service.getLogoPreSignedUrl(s3Key);

            // Create and save the photo record
            const photo = createPhoto(photoId, eventId, photoUrl, uploadedBy, metadata);
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

            // Get all photos for the event
            const photos = await this.photoRepository.getPhotosByEvent(eventId);

            // Refresh pre-signed URLs for all photos
            for (const photo of photos) {
                try {
                    // Extract the S3 key from the URL - this depends on your URL format
                    // This is a simplified approach; you might need to adjust based on your URL structure
                    const urlParts = new URL(photo.url);
                    const s3Key = urlParts.pathname.substring(1); // Remove leading slash
                    
                    // Generate a fresh pre-signed URL
                    photo.url = await this.s3Service.getLogoPreSignedUrl(s3Key);
                } catch (error) {
                    logger.error(`Error refreshing pre-signed URL for photo ${photo.id}:`, error);
                    // Continue processing other photos even if one fails
                }
            }

            return photos;
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
                const s3Key = photo.metadata?.s3Key || (() => {
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
}