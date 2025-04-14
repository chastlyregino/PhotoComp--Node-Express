import sharp from 'sharp';
import { logger } from '../util/logger';
import { PhotoSizes } from '../models/Photo';

interface ImageInfo {
    format: string;
    width: number;
    height: number;
    size: number;
}

interface ResizeOptions {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    quality?: number;
}

/**
 * Service for processing and resizing images
 * Uses the Sharp library to manipulate images efficiently
 */
export class ImageService {
    // Define standard sizes for different use cases
    static readonly SIZES = {
        THUMBNAIL: { width: 200, quality: 80 },
        MEDIUM: { width: 800, quality: 85 },
        LARGE: { width: 1600, quality: 90 },
    };

    /**
     * Get image information from a buffer
     * @param buffer The image buffer
     * @returns Promise with image metadata
     */
    async getImageInfo(buffer: Buffer): Promise<ImageInfo> {
        try {
            const metadata = await sharp(buffer).metadata();
            
            return {
                format: metadata.format || 'unknown',
                width: metadata.width || 0,
                height: metadata.height || 0,
                size: buffer.length,
            };
        } catch (error) {
            logger.error('Error getting image info:', error);
            throw new Error(`Failed to get image info: ${(error as Error).message}`);
        }
    }

    /**
     * Resize an image to different dimensions
     * @param buffer The original image buffer
     * @param options Resize options
     * @returns Promise with the resized image buffer
     */
    async resizeImage(buffer: Buffer, options: ResizeOptions): Promise<Buffer> {
        try {
            const { width, height, fit = 'cover', quality = 85 } = options;
            
            let resizer = sharp(buffer).resize({
                width,
                height,
                fit,
                withoutEnlargement: true, // Don't enlarge images smaller than target dimensions
            });
            
            // Apply appropriate compression based on format
            const metadata = await sharp(buffer).metadata();
            
            if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
                resizer = resizer.jpeg({ quality });
            } else if (metadata.format === 'png') {
                resizer = resizer.png({ quality: Math.min(quality, 100) });
            } else if (metadata.format === 'webp') {
                resizer = resizer.webp({ quality });
            } else {
                // Default to jpeg for other formats
                resizer = resizer.jpeg({ quality });
            }
            
            return await resizer.toBuffer();
        } catch (error) {
            logger.error('Error resizing image:', error);
            throw new Error(`Failed to resize image: ${(error as Error).message}`);
        }
    }

    /**
     * Generate multiple sizes of an image
     * @param buffer The original image buffer
     * @param baseKey The base S3 key without extension
     * @param fileExtension The file extension
     * @returns Object with all processed image buffers and their S3 keys
     */
    async generateImageSizes(
        buffer: Buffer, 
        baseKey: string,
        fileExtension: string
    ): Promise<{
        buffers: {
            original: Buffer;
            thumbnail: Buffer;
            medium: Buffer;
            large: Buffer;
        };
        s3Keys: {
            original: string;
            thumbnail: string;
            medium: string;
            large: string;
        };
        dimensions: {
            original: { width: number; height: number };
            thumbnail: { width: number; height: number };
            medium: { width: number; height: number };
            large: { width: number; height: number };
        };
    }> {
        try {
            // Get original image info
            const imageInfo = await this.getImageInfo(buffer);
            
            // Define S3 keys for each size
            const s3Keys = {
                original: `${baseKey}.${fileExtension}`,
                thumbnail: `${baseKey}_thumbnail.${fileExtension}`,
                medium: `${baseKey}_medium.${fileExtension}`,
                large: `${baseKey}_large.${fileExtension}`,
            };
            
            // Create thumbnail
            const thumbnailBuffer = await this.resizeImage(buffer, ImageService.SIZES.THUMBNAIL);
            const thumbnailInfo = await this.getImageInfo(thumbnailBuffer);
            
            // Create medium size
            const mediumBuffer = await this.resizeImage(buffer, ImageService.SIZES.MEDIUM);
            const mediumInfo = await this.getImageInfo(mediumBuffer);
            
            // Create large size
            const largeBuffer = await this.resizeImage(buffer, ImageService.SIZES.LARGE);
            const largeInfo = await this.getImageInfo(largeBuffer);
            
            return {
                buffers: {
                    original: buffer,
                    thumbnail: thumbnailBuffer,
                    medium: mediumBuffer,
                    large: largeBuffer,
                },
                s3Keys,
                dimensions: {
                    original: { width: imageInfo.width, height: imageInfo.height },
                    thumbnail: { width: thumbnailInfo.width, height: thumbnailInfo.height },
                    medium: { width: mediumInfo.width, height: mediumInfo.height },
                    large: { width: largeInfo.width, height: largeInfo.height },
                }
            };
        } catch (error) {
            logger.error('Error generating image sizes:', error);
            throw new Error(`Failed to generate image sizes: ${(error as Error).message}`);
        }
    }
}