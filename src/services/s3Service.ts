import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../util/logger';
import { S3Repository } from '../repositories/s3Repository';

export class S3Service {
    private s3Repository: S3Repository;

    constructor(s3Repository: S3Repository = new S3Repository()) {
        this.s3Repository = s3Repository;
    }

    /**
     * Uploads a logo from a URL to S3
     * @param url The URL of the logo to upload
     * @param organizationName The name of the organization (used for creating the S3 key)
     * @returns The S3 key where the logo was uploaded
     */
    async uploadLogoFromUrl(url: string, organizationName: string): Promise<string> {
        try {
            // Validate URL
            const validUrl = new URL(url);

            // Fetch the image data from the URL
            const response = await fetch(url);
            if (!response.ok) {
                throw new AppError(`Failed to fetch image from URL: ${response.statusText}`, 400);
            }

            // Get the image data as an array buffer
            const imageData = await response.arrayBuffer();

            // Generate a unique key for the S3 object
            // Using prefix pattern: logos/<organizationName>/<uniqueId>.<extension>
            const urlParts = validUrl.pathname.split('.');
            const fileExtension = urlParts.length > 1 ? urlParts[urlParts.length - 1] : 'jpg';
            const sanitizedOrgName = organizationName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
            const s3Key = `logos/${sanitizedOrgName}/${uuidv4()}.${fileExtension}`;

            // Get content type or default to image/jpeg
            const contentType = response.headers.get('content-type') || 'image/jpeg';

            // Upload to S3 using the repository
            return await this.s3Repository.uploadFile(Buffer.from(imageData), s3Key, contentType);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error('Error uploading logo to S3:', error);
            throw new AppError(`Failed to upload logo to S3: ${(error as Error).message}`, 500);
        }
    }

    /**
     * Uploads a file buffer directly to S3
     * @param fileBuffer The buffer containing file data
     * @param key The S3 key where the file will be stored
     * @param contentType The content type of the file
     * @returns The S3 key where the file was uploaded
     */
    async uploadFileBuffer(fileBuffer: Buffer, key: string, contentType: string): Promise<string> {
        try {
            return await this.s3Repository.uploadFile(fileBuffer, key, contentType);
        } catch (error) {
            logger.error('Error uploading file to S3:', error);
            throw new AppError(`Failed to upload file to S3: ${(error as Error).message}`, 500);
        }
    }

    /**
     * Gets a pre-signed URL for accessing a file in S3
     * @param s3Key The S3 key of the file
     * @param expiresIn The expiration time in seconds (default: 3600 = 1 hour)
     * @returns The pre-signed URL
     */
    async getLogoPreSignedUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
        return this.s3Repository.getPreSignedUrl(s3Key, expiresIn);
    }

    /**
     * Gets a pre-signed URL for downloading a file from S3
     * @param s3Key The S3 key of the file
     * @param filename The suggested filename for the download
     * @param expiresIn The expiration time in seconds (default: 3600 = 1 hour)
     * @returns The pre-signed URL with content-disposition header set
     */
    async getDownloadUrl(s3Key: string, filename: string, expiresIn: number = 3600): Promise<string> {
        return this.s3Repository.getDownloadPreSignedUrl(s3Key, filename, expiresIn);
    }

    /**
     * Deletes a file from S3
     * @param s3Key The S3 key of the file to delete
     */
    async deleteFile(s3Key: string): Promise<void> {
        return this.s3Repository.deleteFile(s3Key);
    }
}
