import { v4 as uuidv4 } from 'uuid';

export interface Event {
    PK: string; // EVENT#<ID>
    SK: string;

    id: string;
    title: string;
    description: string;
    isPublic: boolean;
    date: string;
    createdAt: string;
    updatedAt: string;

    // GSI attributes
    GSI2PK: string; // ORG#<ID>
    GSI2SK: string; // EVENT#<ID>
}

export interface EventRequest {
    title: string;
    description: string;
    date: string;
}

export interface EventUpdateRequest {
    title?: string;
    description?: string;
    date?: string;
}

export interface EventUser {
    PK: string; // USER#<ID>
    SK: string; // EVENT#<ID>
    // GSI attributes
    GSI2PK: string; // EVENT#<ID>
    GSI2SK: string; // USER#<ID>
}

export const createEvent = (orgID: string, eventRequest: EventRequest): Event => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const date = now;
    const eventId = `EVENT#${id}`;
    return {
        PK: eventId,
        SK: 'ENTITY',
        id: id,
        title: eventRequest.title,
        description: eventRequest.description,
        isPublic: true,
        date: date,
        createdAt: now,
        updatedAt: now,
        GSI2PK: orgID,
        GSI2SK: eventId,
    };
};

export const createEventUser = (userid: string, eventid: string): EventUser => {
    const userId = `USER#${userid}`;
    const eventId = `EVENT#${eventid}`;
    return {
        PK: userId,
        SK: eventId,
        GSI2PK: eventId,
        GSI2SK: userId,
    };
};
