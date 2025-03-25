export interface Event {
    id: string;
    organizationId: string;
    name: string;
    description: string;
    startDate: Date;
    endDate: Date;
    location: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string; // User ID
    weather?: Weather;
  }
  
  export interface Weather {
    temperature: number;
    condition: string;
    humidity?: number;
    windSpeed?: number;
  }