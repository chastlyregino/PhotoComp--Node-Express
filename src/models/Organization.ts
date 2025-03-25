export interface Organization {
    id: string;
    name: string;
    description: string;
    logo?: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string; // User ID
  }