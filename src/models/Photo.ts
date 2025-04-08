import { v4 as uuidv4 } from 'uuid';

export interface Photo {
    // Primary keys
    PK: string; // PHOTO#<PhotoID>
    SK: string; // ENTITY

    // Attributes
    id: string;
    eventId: string;
    url: string;
    createdAt: string;
    updatedAt: string;
    uploadedBy: string;

    // Optional metadata
    metadata?: {
        title?: string;
        description?: string;
        size?: number;
        mimeType?: string;
        s3Key?: string;
    };

    // GSI for querying photos by event
    GSI2PK: string; // EVENT#<EventID>
    GSI2SK: string; // PHOTO#<PhotoID>
}

export interface PhotoUploadRequest {
    eventId: string;
    title?: string;
    description?: string;
}

export const createPhoto = (
    photoId: string,
    eventId: string,
    url: string,
    uploadedBy: string,
    metadata?: {
        title?: string;
        description?: string;
        size?: number;
        mimeType?: string;
        s3Key?: string;
    }
): Photo => {
    const now = new Date().toISOString();

    return {
        PK: `PHOTO#${photoId}`,
        SK: 'ENTITY',
        id: photoId,
        eventId,
        url,
        createdAt: now,
        updatedAt: now,
        uploadedBy,
        metadata,
        GSI2PK: `EVENT#${eventId}`,
        GSI2SK: `PHOTO#${photoId}`,
    };
};
