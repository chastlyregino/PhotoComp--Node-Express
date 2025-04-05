import { s3Client, getSignedUrl, S3_BUCKET_NAME } from '../config/s3';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../util/logger';

export class S3Repository {
    /**
     * Uploads a file to S3 from buffer data
     * @param fileBuffer The buffer containing file data
     * @param key The S3 key where the file will be stored
     * @param contentType The content type of the file
     * @returns The S3 key where the file was uploaded
     */
    async uploadFile(fileBuffer: Buffer, key: string, contentType: string): Promise<string> {
        try {
            const command = new PutObjectCommand({
                Bucket: S3_BUCKET_NAME,
                Key: key,
                Body: fileBuffer,
                ContentType: contentType,
            });
            
            await s3Client.send(command);
            logger.info(`Uploaded file to S3: ${key}`);
            
            return key;
        } catch (error) {
            logger.error('Error uploading file to S3:', error);
            throw new AppError(`Failed to upload file to S3: ${(error as Error).message}`, 500);
        }
    }
    
    /**
     * Generates a pre-signed URL for accessing an S3 object
     * @param key The S3 key of the object
     * @param expiresIn The expiration time in seconds (default: 3600 = 1 hour)
     * @returns The pre-signed URL
     */
    async getPreSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
        try {
            const command = new GetObjectCommand({
                Bucket: S3_BUCKET_NAME,
                Key: key,
            });
            
            const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });
            return presignedUrl;
        } catch (error) {
            logger.error('Error generating pre-signed URL:', error);
            throw new AppError(`Failed to generate pre-signed URL: ${(error as Error).message}`, 500);
        }
    }

    /**
     * Deletes a file from S3
     * @param key The S3 key of the object to delete
     */
    async deleteFile(key: string): Promise<void> {
        try {
            const command = new DeleteObjectCommand({
                Bucket: S3_BUCKET_NAME,
                Key: key,
            });
            
            await s3Client.send(command);
            logger.info(`Deleted file from S3: ${key}`);
        } catch (error) {
            logger.error('Error deleting file from S3:', error);
            throw new AppError(`Failed to delete file from S3: ${(error as Error).message}`, 500);
        }
    }
}