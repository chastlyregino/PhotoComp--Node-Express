export interface Photo {
    id: string;
    eventId: string;
    url: string;
    thumbnail?: string;
    title?: string;
    description?: string;
    uploadedAt: Date;
    uploadedBy: string; // User ID
    metadata?: PhotoMetadata;
  }
  
  export interface PhotoMetadata {
    size: number;
    width?: number;
    height?: number;
    format?: string;
    location?: {
      latitude: number;
      longitude: number;
    };
    takenAt?: Date;
  }