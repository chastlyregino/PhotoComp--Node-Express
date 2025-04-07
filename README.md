# PhotoComp API Documentation

This document outlines the API endpoints for the PhotoComp platform, designed for companies to share event photos with their organization members. It includes all required HTTP requests, expected responses, and details about the data models.

## Authentication Requirements

Most API endpoints require authentication using a JWT token passed in the request header:

```
Authorization: Bearer your-jwt-token
```

## Data Models

### User Model

| Property | Type | Description |
|----------|------|-------------|
| id | string (UUID) | Unique identifier for the user. |
| email | string | User's email address (used for authentication). |
| firstName | string | User's first name. |
| lastName | string | User's last name. |
| password | string | Hashed password (not returned in API responses). |
| role | string | User role: "USER", "MEMBER", or "ADMIN". |
| createdAt | timestamp | Timestamp when the user was created (ISO 8601). |
| updatedAt | timestamp | Timestamp when the user was last updated (ISO 8601). |

### Organization Model

| Property | Type | Description |
|----------|------|-------------|
| id | string (UUID) | Unique identifier for the org. |
| name | string | Organization's unique name. |
| createdBy | string | User's ID (`USER#${user.id}` or user.PK) |
| createdAt | timestamp | Timestamp when the org was created (ISO 8601). |
| updatedAt | timestamp | Timestamp when the org was last updated (ISO 8601). |
| isPublic | boolean | Returns if an org is public or not. |
| logoUrl | string | Photo URL of the org's logo (pre-signed URL for access). |
| logoS3Key | string | S3 key where the logo is stored. |
| description | string | Optional description of the organization. |
| website | string | Optional website URL. |
| contactEmail | string | Optional contact email for the organization. |

### User-Organization Model

| Property | Type | Description |
|----------|------|-------------|
| userId | string | User's ID (`USER#${user.id}` or userOrg.PK)  |
| organizationName | string | Org's name (`ORG#${org.name}` or userOrg.SK) |
| role | string | User role: "USER", "MEMBER", or "ADMIN". |
| joinedAt | timestamp | When user joined the org (ISO 8601). |

### Organization Membership Request Model

| Property       | Type                                  | Description |
|----------------|---------------------------------------|-------------|
| PK           | string                              | Primary partition key: `ORG#<NAME>` |
| SK           | string                              | Primary sort key: `REQUEST#` |
| organizationName | string                         | Name of the organization |
| userId       | string                              | ID of the user making the request |
| requestDate  | string                              | ISO timestamp of when the request was made |
| message      | string *(optional)*                 | Optional message from the user |
| status       | 'PENDING' \| 'APPROVED' \| 'DENIED' | Status of the request |
| type         | 'ORG_REQUEST'                       | Entity type identifier |
| GSI1PK       | string                              | GSI partition key for user lookups: `REQUEST#` |
| GSI1SK       | string                              | GSI sort key for user lookups: `ORG#<NAME>` |

### Event Model
| Property     | Type    | Description |
|-------------|--------|-------------|
| PK          | string | Primary key: `EVENT#<ID>` |
| SK          | string | Static value: `"ENTITY"` |
| title       | string | Event title |
| description | string | Event description |
| visibility  | string | `"PUBLIC"` or `"PRIVATE"` (default: `"PUBLIC"`) |
| date        | string | Event date (ISO 8601 format) |
| createdAt   | string | Timestamp when the event was created (ISO 8601) |
| updatedAt   | string | Timestamp when the event was last updated (ISO 8601) |
| GSI2PK      | string | Organization ID (`ORG#<ID>`) |
| GSI2SK      | string | Event ID (`EVENT#<ID>`) |

### EventUser Model
| Property     | Type    | Description |
|-------------|--------|-------------|
| PK          | string | User ID: `USER#<ID>` |
| SK          | string | Event ID: `EVENT#<ID>` |
| GSI2PK      | string | Event ID (`EVENT#<ID>`) |
| GSI2SK      | string | User ID (`USER#<ID>`) |

### Photo Model
| Property     | Type    | Description |
|-------------|--------|-------------|
| PK          | string | Primary key: `PHOTO#<ID>` |
| SK          | string | Static value: `"ENTITY"` |
| id          | string | Unique identifier for the photo |
| eventId     | string | ID of the event the photo belongs to |
| url         | string | Pre-signed URL for accessing the photo |
| createdAt   | string | Timestamp when the photo was uploaded (ISO 8601) |
| updatedAt   | string | Timestamp when the photo was last updated (ISO 8601) |
| uploadedBy  | string | User ID of the uploader |
| metadata    | object | Optional metadata (title, description, size, etc.) |
| GSI2PK      | string | Event ID (`EVENT#<ID>`) |
| GSI2SK      | string | Photo ID (`PHOTO#<ID>`) |

## Database Model

The system uses a single-table design in DynamoDB with the following structure:

| Component | Description |
|-----------|-------------|
| PK | Primary partition key in format [USER: USER#{id}; ORG: ORG#{NAME}; EVENT: EVENT#{id}; PHOTO: PHOTO#{id}] |
| SK | Primary sort key in format [USER/ORG/EVENT/PHOTO: ENTITY; USER-ORG: ORG#{NAME}; USER-EVENT: EVENT#{id}] |
| GSI1PK | Global Secondary Index partition key in format [USER: EMAIL#{email}; ORG: USER#{id}] |
| GSI1SK | Global Secondary Index sort key in format [USER: USER#{id}; ORG: ORG#{NAME}] |
| GSI2PK | Second Global Secondary Index partition key in format [EVENT: ORG#{name}; PHOTO: EVENT#{id}] |
| GSI2SK | Second Global Secondary Index sort key in format [EVENT: EVENT#{id}; PHOTO: PHOTO#{id}] |
| type | Item type identifier used for filtering (e.g., "USER", "ORGANIZATION", "USER_ORG", "EVENT", "PHOTO") |

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register a new user |
| POST | /api/auth/login | Login and get authentication token |
| GET | /guests | Get public organizations |
| GET | /guests/organizations/:id/events | Get public organizations events|
| GET | /organizations | Get all organizations for the authenticated user |
| POST | /organizations | Create a new organization |
| GET | /organizations/:id/events | Get organizations events|
| POST | /organizations/:id/events | Create a new organization event|
| POST | /organizations/:id | Apply to join an organization with events |
| GET | /organizations/:id/requests | Get all pending membership requests |
| PUT | /organizations/:id/requests/:userId | Approve a membership request |
| DELETE | /organizations/:id/requests/:userId | Deny a membership request |
| POST | /organizations/:id/events/:eventId/photos | Upload a photo to an event |
| GET | /organizations/:id/events/:eventId/photos | Get all photos for an event |
| DELETE | /organizations/:id/events/:eventId/photos/:photoId | Delete a photo |

## 1. Authentication Endpoints

### 1.1 Register a New User

`POST /api/auth/register`

This endpoint allows users to create a new account. All new users are registered with the "USER" status by default and are given an "ACTIVE" status.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Content-Type | application/json | Yes |

#### Request Body

```json
{
    "email": "user@example.com",
    "password": "Password123",
    "firstName": "John",
    "lastName": "Doe"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Valid email address |
| password | string | Yes | Password (minimum 8 characters) |
| firstName | string | Yes | User's first name |
| lastName | string | Yes | User's last name |

#### Response

**201 Created**
```json
{
    "status": "success",
    "data": {
        "user": {
            "id": "38c83721-e03e-4e82-bc56-13fc97efdebd",
            "email": "user@example.com",
            "firstName": "John",
            "lastName": "Doe",
            "role": "USER",
            "status": "ACTIVE",
            "createdAt": "2025-03-18T15:46:24.506Z",
            "updatedAt": "2025-03-18T15:46:24.506Z"
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
}
```

**400 Bad Request**
```json
{
    "status": "error",
    "message": "Email, password, first name, and last name are required"
}
```
```json
{
    "status": "error",
    "message": "Invalid email format"
}
```
```json
{
    "status": "error",
    "message": "Password must be at least 8 characters long"
}
```

**409 Conflict**
```json
{
    "status": "error",
    "message": "Email already in use"
}
```

**500 Server Error**
```json
{
    "status": "error",
    "message": "Registration failed"
}
```

### 1.2 Login

`POST /api/auth/login`

This endpoint authenticates a user and returns a JWT token.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Content-Type | application/json | Yes |

#### Request Body

```json
{
    "email": "user@example.com",
    "password": "Password123"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Email address for authentication |
| password | string | Yes | User's password |

#### Response

**200 OK**
```json
{
    "status": "success",
    "data": {
        "user": {
            "id": "38c83721-e03e-4e82-bc56-13fc97efdebd",
            "email": "user@example.com",
            "firstName": "John",
            "lastName": "Doe",
            "role": "USER",
            "status": "ACTIVE",
            "createdAt": "2025-03-18T15:46:24.506Z",
            "updatedAt": "2025-03-18T15:46:24.506Z"
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
}
```

**400 Bad Request**
```json
{
    "status": "error",
    "message": "Email and password are required"
}
```

**401 Unauthorized**
```json
{
    "status": "error",
    "message": "Invalid email or password"
}
```

**500 Server Error**
```json
{
    "status": "error",
    "message": "Login failed"
}
```

## 2. Organization Endpoints

### 2.1 Create New Organization

`POST /organizations`

This endpoint allows users to create a new organizations. All new user-organizations are registered with the "USER" role by default and are given an "ADMIN" role. All new organizations are registered as a default "PUBLIC".

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Content-Type | application/json | Yes |
| Authorization | Bearer your-jwt-token | Yes |

#### Request Body

```json
{
    "name": "Taco Bell",
    "logoUrl": "https://example.com/logo.jpg"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Unique org name |
| logoUrl | string | Yes | Valid URL to logo image |
| description | string | No | Optional description of the organization |
| website | string | No | Optional website URL |
| contactEmail | string | No | Optional contact email |

#### Response

**201 Created**
```json
{
    "status": "Created organization!",
    "data": {
        "user": "5e5bdb97-6bfa-44c0-b998-2e64568798ef",
        "org": "Taco Bell",
        "logoUrl": "https://presigned-url.amazonaws.com/logo.jpg",
        "logoS3Key": "logos/taco-bell/ab123-xyz.jpg"
    }
}
```

**400 Bad Request**
```json
{
    "status": "error",
    "message": "Organization not created"
}
```
```json
{
    "status": "error",
    "message": "User Organization not created"
}
```
```json
{
    "status": "error",
    "message": "Name and logoUrl are required"
}
```
```json
{
    "status": "error",
    "message": "Invalid URL"
}
```

**404 User Not Found**
```json
{
    "status": "error",
    "message": "User not found"
}
```

**409 Conflict**
```json
{
    "status": "error",
    "message": "Organization name already in use!"
}
```

**500 Server Error**
```json
{
    "status": "error",
    "message": "Organization creation failed: DB!"
}
```
```json
{
    "status": "error",
    "message": "Organization creation failed: Model!"
}
```
```json
{
    "status": "error",
    "message": "User Organization creation failed: Model!"
}
```
```json
{
    "status": "error",
    "message": "Finding Organization by ID failed!"
}
```

### 2.2 Get All Organizations of User

`GET /organizations`

This endpoint allows users to get all organizations they created and are a member of.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | Bearer your-jwt-token | Yes |

#### Response

**200 OK**
```json
{
    "message": "Here are your organizations!",
    "org": [
        {
            "GSI1PK": "ORG#CULVERS",
            "joinedAt": "2025-04-01T21:49:53.238Z",
            "role": "ADMIN",
            "userId": "5e5bdb97-6bfa-44c0-b998-2e64568798ef",
            "SK": "ORG#CULVERS",
            "organizationName": "Culvers",
            "GSI1SK": "USER#5e5bdb97-6bfa-44c0-b998-2e64568798ef",
            "PK": "USER#5e5bdb97-6bfa-44c0-b998-2e64568798ef",
            "type": "USER_ORG",
            "logoUrl": "https://presigned-url.amazonaws.com/logo.jpg"
        },
        {
            "GSI1PK": "ORG#TACO BELL",
            "joinedAt": "2025-04-01T21:53:45.566Z",
            "role": "ADMIN",
            "userId": "5e5bdb97-6bfa-44c0-b998-2e64568798ef",
            "SK": "ORG#TACO BELL",
            "organizationName": "Taco Bell",
            "GSI1SK": "USER#5e5bdb97-6bfa-44c0-b998-2e64568798ef",
            "PK": "USER#5e5bdb97-6bfa-44c0-b998-2e64568798ef",
            "type": "USER_ORG",
            "logoUrl": "https://presigned-url.amazonaws.com/logo.jpg"
        }
    ]
}
```

**204 No Content**
```json
{
    "status": "error",
    "message": "No organizations found!"
}
```

**400 Bad Request**
```json
{
    "status": "error",
    "message": "No Organizations found!"
}
```

**500 Server Error**
```json
{
    "status": "error",
    "message": "Finding Organization by User failed! ${error.message}"
}
```
```json
{
    "status": "error",
    "message": "Failed to find organization by id: ${error.message}"
}
```
```json
{
    "status": "error",
    "message": "User Organization creation failed: Model!"
}
```
```json
{
    "status": "error",
    "message": "Finding Organization by ID failed!"
}
```

### 2.3 Update an Organization

`PATCH /organizations`

This endpoint allows users with "ADMIN" role to update an existing organization that they are a part of.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Content-Type | application/json | Yes |

#### Request Body

```json
{
    "name": "Culvers",
    "description": "Butter Burgers",
    "contactEmail": "culvers@culvers.com",
    "website": "https://www.culvers.com/",
    "logoUrl": "https://styleguide.culvers.com/brand-styles/logo-usage"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Existing org name |
| description | string | No | Org description |
| contactEmail | string | No | Org contact email|
| website | string | No | Valid URL of website |
| logoUrl | string | No | Valid URL of logo |

#### Response

**200 OK**
```json
{
    "status": "Updated organization!",
    "data": {
        "org": {
            "PK": "ORG#CULVERS",
            "SK": "ENTITY",
            "id": "6a39ef9c-f036-44ad-866c-16f4b7e81622",
            "name": "Culvers",
            "description": "Butter Burgers",
            "createdBy": "5e5bdb97-6bfa-44c0-b998-2e64568798ef",
            "createdAt": "2025-04-01T21:49:53.186Z",
            "updatedAt": "2025-04-02T22:51:11.640Z",
            "type": "ORGANIZATION",
            "isPublic": true,
            "logoUrl": "https://styleguide.culvers.com/brand-styles/logo-usage",
            "website": "https://www.culvers.com/",
            "contactEmail": "culvers@culvers.com",
            "GSI1PK": "CUL",
            "GSI1SK": "ORG#CULVERS"
        }
    }
}
```

**204 No Content**
```json
{
    "status": "error",
    "message": "No organizations found!"
}
```

**400 Bad Request**
```json
{
    "status": "error",
    "message": "Invalid URL"
}
```
```json
{
    "status": "error",
    "message": "You need to specify the Organization name."
}
```
```json
{
    "status": "error",
    "message": "No Organizations found!"
}
```

**401 UnAuthorized**
```json
{
    "status": "error",
    "message": "You are NOT part of this Organization"
}
```
```json
{
    "status": "error",
    "message": "Only Admin roles can updated Organizations"
}
```

**500 Server Error**
```json
{
    "status": "error",
    "message": "Updating Organization failed!"
}
```
```json
{
    "status": "error",
    "message": "Finding User Organization failed!"
}
```

## 3. Event Management 

### 3.1. Create an Event

`POST /organizations/:id/events`

This endpoint allows users with "ADMIN" role to create a new event for an organization.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | `Bearer <token>` |  Yes  |
| Content-Type | `application/json` |  Yes  |

#### Request Body
```json
{
  "title": "Annual Company Meetup",
  "description": "A networking event for all employees.",
  "date": "2025-05-01T18:00:00Z" (ISO 8601 format)
}
```
#### Response
**201 Created**
```json
{
  "status": "success",
  "data": {
    "event": {
      "PK": "EVENT#abcd1234",
      "SK": "ENTITY",
      "title": "Annual Company Meetup",
      "description": "A networking event for all employees.",
      "visibility": "PUBLIC",
      "date": "2025-05-01T18:00:00Z",
      "createdAt": "2025-04-01T15:30:00Z",
      "updatedAt": "2025-04-01T15:30:00Z",
      "GSI2PK": "ORG#xyz987",
      "GSI2SK": "EVENT#abcd1234"
    }
  }
}
```

**403 Forbidden (User Not Admin)**
```json
{
  "status": "error",
  "message": "Forbidden: You must be an org admin to create events."
}
```

**400 Bad Request (Validation Error)**
```json
{
  "status": "error",
  "message": "Missing required fields: title, description, or date."
}
```

### 3.2. Get Organization Events

`GET /organizations/:id/events`

This endpoint retrieves all events for a specific organization that the user is a member of.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | `Bearer <token>` |  Yes  |

#### Response
**200 OK**
```json
{
  "status": "success",
  "data": {
    "events": [
      {
        "PK": "EVENT#abcd1234",
        "SK": "ENTITY",
        "title": "Annual Company Meetup",
        "description": "A networking event for all employees.",
        "visibility": "PUBLIC",
        "date": "2025-05-01T18:00:00Z",
        "createdAt": "2025-04-01T15:30:00Z",
        "updatedAt": "2025-04-01T15:30:00Z",
        "GSI2PK": "ORG#xyz987",
        "GSI2SK": "EVENT#abcd1234"
      }
    ]
  }
}
```

**404 Not Found**
```json
{
  "status": "error",
  "message": "Organization not found"
}
```

### 3.3. Update Event's Publicity

`PATCH /organizations/:id/events/:eventId`

This endpoint allows users with "ADMIN" role to update an event's publicity status.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | `Bearer <token>` |  Yes  |
| Content-Type | application/json | Yes |

#### Request Body
```json
{
  "isPublic": false
}
```

#### Response

**200 OK**
```json
{
    "status": "Updating Event's publicity success!",
    "data": {
        "updatedEvent": {
            "GSI2PK": "pizzahut",
            "date": "2025-04-03T19:38:42.888Z",
            "updatedAt": "2025-04-03T19:38:42.888Z",
            "createdAt": "2025-04-03T19:38:42.888Z",
            "SK": "ENTITY",
            "isPublic": false,
            "description": "We're throwing a yet another rager",
            "PK": "EVENT#29d4e4cf-d070-4341-854c-9b4c0f71bf0b",
            "id": "29d4e4cf-d070-4341-854c-9b4c0f71bf0b",
            "GSI2SK": "EVENT#29d4e4cf-d070-4341-854c-9b4c0f71bf0b",
            "title": "Pizza Party at Pizza Hut, AGAIN"
        }
    }
}
```

**400 Bad Request**
```json
{
    "status": "error",
    "message": "No Event found!"
}
```
```json
{
    "status": "error",
    "message": "No User-Event found!"
}
```

**401 UnAuthorized**
```json
{
    "status": "error",
    "message": "You are NOT part of this Organization"
}
```
```json
{
    "status": "error",
    "message": "Only Admin roles can update Events"
}
```

**500 Server Error**
```json
{
    "status": "error",
    "message": "Updating Event failed!"
}
```
```json
{
    "status": "error",
    "message": "Finding Event failed!"
}
```
```json
{
    "status": "error",
    "message": "Finding User-Event by User failed!"
}
```

## 4. Photo Management

### 4.1. Upload a Photo

`POST /organizations/:id/events/:eventId/photos`

This endpoint allows organization admins to upload photos to an event.

#### Request Headers
| Key           | Value            | Required |
|--------------|----------------|----------|
| Authorization | `Bearer <token>` |  Yes  |
| Content-Type  | `multipart/form-data` |  Yes  |

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| photo | file | Yes | The photo file to upload (image files only) |
| title | string | No | Title for the photo |
| description | string | No | Description of the photo |

#### Response
**201 Created**
```json
{
  "status": "success",
  "data": {
    "photo": {
      "PK": "PHOTO#12345",
      "SK": "ENTITY",
      "id": "12345",
      "eventId": "event-id",
      "url": "https://presigned-url.amazonaws.com/photos/event-id/12345.jpg",
      "createdAt": "2025-04-05T14:30:00Z",
      "updatedAt": "2025-04-05T14:30:00Z",
      "uploadedBy": "user-id",
      "metadata": {
        "title": "Company Picnic",
        "description": "Team building activities",
        "size": 1024000,
        "mimeType": "image/jpeg",
        "s3Key": "photos/event-id/12345.jpg"
      },
      "GSI2PK": "EVENT#event-id",
      "GSI2SK": "PHOTO#12345"
    }
  }
}
```

**400 Bad Request**
```json
{
  "status": "error",
  "message": "No photo file uploaded"
}
```

```json
{
  "status": "error",
  "message": "File size limit exceeded. Maximum size is 5MB"
}
```

```json
{
  "status": "error",
  "message": "Only image files are allowed"
}
```

**403 Forbidden**
```json
{
  "status": "error",
  "message": "Only an Org Admin can perform this action. Please talk to your Admin for more information"
}
```

**404 Not Found**
```json
{
  "status": "error",
  "message": "Photo not found: photo-id"
}
```

```json
{
  "status": "error",
  "message": "Photo does not belong to the specified event"
}
```

**500 Server Error**
```json
{
  "status": "error",
  "message": "Failed to delete photo: S3 deletion failed"
}
```

## 5. Organization Membership

### 5.1 Apply to an Organization
`POST /organizations/:id`

Apply to join an organization. The organization must have at least one event.

#### Request Headers
| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| Authorization | Bearer [token] | Yes | JWT authentication token |

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| message | string | No | Optional message to the organization admins explaining why you want to join |
```json
{
  "message": "I would like to join this organization"
}
```

#### Response
**Status Codes:**
- 201: Created - Application submitted successfully
- 400: Bad Request - Cannot apply to an organization without any events
- 401: Unauthorized - Missing or invalid token
- 404: Not Found - Organization not found
- 409: Conflict - User has already applied or is already a member
- 500: Internal Server Error - Server error

**Success Response (201):**
```json
{
  "status": "success",
  "message": "Application submitted successfully",
  "data": {
    "request": {
      "PK": "ORG#ORGNAME",
      "SK": "REQUEST#userId",
      "organizationName": "OrgName",
      "userId": "userId",
      "requestDate": "2023-04-04T12:34:56.789Z",
      "message": "I would like to join this organization",
      "status": "PENDING",
      "type": "ORG_REQUEST"
    }
  }
}
```
**Error Response (400):**
```json
{
  "status": "error",
  "message": "Cannot apply to an organization without any events"
}
```

**Error Response (401):**
```json
{
  "status": "error",
  "message": "Authentication required"
}
```

**Error Response (404):**
```json
{
  "status": "error",
  "message": "Organization not found"
}
```

**Error Response (409):**
```json
{
  "status": "error",
  "message": "You are already a member of this organization"
}
```

**Error Response (500):**
```json
{
  "status": "error",
  "message": "Internal server error"
}
```

### 5.2 Get Pending Membership Requests
`GET /organizations/:id/requests`

Get all pending membership requests for an organization (admin only).

#### Request Headers
| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| Authorization | Bearer [token] | Yes | JWT authentication token |

#### Response
**Status Codes:**
- 200: OK - Requests retrieved successfully
- 401: Unauthorized - Missing or invalid token
- 403: Forbidden - User is not an admin of the organization
- 404: Not Found - Organization not found
- 500: Internal Server Error - Server error

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "requests": [
      {
        "PK": "ORG#ORGNAME",
        "SK": "REQUEST#userId",
        "organizationName": "OrgName",
        "userId": "userId",
        "requestDate": "2023-04-04T12:34:56.789Z",
        "message": "I would like to join this organization",
        "status": "PENDING",
        "type": "ORG_REQUEST",
        "GSI1PK": "REQUEST#userId",
        "GSI1SK": "ORG#ORGNAME",
        "userDetails": {
          "id": "userId",
          "email": "user@example.com",
          "firstName": "John",
          "lastName": "Doe"
        }
      }
    ]
  }
}
```

**Error Response (403):**
```json
{
  "status": "error",
  "message": "Only an Org Admin can perform this action. Please talk to your Admin for more information"
}
```

### 5.3 Approve a Membership Request
`PUT /organizations/:id/requests/:userId`

Approve a user's request to join an organization (admin only).

#### Request Headers
| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| Authorization | Bearer [token] | Yes | JWT authentication token |

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | Yes | Must be "approved" |

```json
{
  "status": "approved"
}
```

#### Response
**Status Codes:**
- 200: OK - Request approved successfully
- 400: Bad Request - Invalid status or organization has no events
- 401: Unauthorized - Missing or invalid token
- 403: Forbidden - User is not an admin of the organization
- 404: Not Found - Organization, user, or request not found
- 500: Internal Server Error - Server error

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Membership request approved",
  "data": {
    "membership": {
      "PK": "USER#userId",
      "SK": "ORG#ORGNAME",
      "userId": "userId",
      "organizationName": "OrgName",
      "role": "MEMBER",
      "joinedAt": "2023-04-04T12:34:56.789Z",
      "type": "USER_ORG",
      "GSI1PK": "ORG#ORGNAME",
      "GSI1SK": "USER#userId"
    }
  }
}
```

**Error Response (400):**
```json
{
  "status": "error",
  "message": "Cannot approve new members for an organization without events"
}
```

**Error Response (403):**
```json
{
  "status": "error",
  "message": "You must be an admin to approve membership requests"
}
```

**Error Response (404):**
```json
{
  "status": "error",
  "message": "Membership request not found"
}
```

### 5.4 Deny a Membership Request
`DELETE /organizations/:id/requests/:userId`

Deny a user's request to join an organization (admin only).

#### Request Headers
| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| Authorization | Bearer [token] | Yes | JWT authentication token |

#### Response
**Status Codes:**
- 200: OK - Request denied successfully
- 401: Unauthorized - Missing or invalid token
- 403: Forbidden - User is not an admin of the organization
- 404: Not Found - Organization or request not found
- 500: Internal Server Error - Server error

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Membership request denied"
}
```

**Error Response (403):**
```json
{
  "status": "error",
  "message": "You must be an admin to deny membership requests"
}
```

**Error Response (404):**
```json
{
  "status": "error",
  "message": "Membership request not found"
}
```

## 6. Guest Router

### 6.1 Get Public Organizations
`GET /guests`

Retrieves a list of public organizations. The response is paginated with a maximum of 9 organizations per request.

#### Request Parameters:
- `lastEvaluatedKey` (optional, query parameter) – Used for pagination.

#### Response:
```json
{
  "message": "Here are all organizations!",
  "data": {
    "organizations": [
      {
        "id": "<org_id>",
        "name": "Organization Name",
        "description": "Public description of the organization"
      }
    ]
  },
  "lastEvaluatedKey": "<pagination_key>"
}
```

### 6.2 Get Public Events of an Organization
`GET /guests/organizations/:id/events`

Retrieves all public events for a specific organization.

#### Path Parameters:
- `id` (required) – Organization ID.

#### Response:
```json
{
  "status": "success",
  "data": {
    "events": [
      {
        "eventId": "<event_id>",
        "name": "Event Name",
        "date": "YYYY-MM-DD",
        "description": "Public event description"
      }
    ]
  },
  "lastEvaluatedKey": "<pagination_key>"
}
```

## JWT Token

The JWT token contains the following payload:

```json
{
    "id": "user-uuid",
    "email": "user@example.com",
    "role": "USER",
    "iat": 1616923664,
    "exp": 1616923664
}
```

| Field | Description |
|-------|-------------|
| id | User's unique identifier |
| email | User's email address |
| role | User's role in the system |
| iat | Issued at timestamp |
| exp | Expiration timestamp (24 hours after issuance) |

## Status Code Summary

| Status Code | Description |
|------------|-------------|
| 200 OK | Request processed successfully |
| 201 Created | Resource created successfully |
| 204 No Content | Resource has nothing to show |
| 400 Bad Request | Invalid request data (missing fields, invalid values, etc.) |
| 401 Unauthorized | Authentication required or authentication failed |
| 404 Not Found | Data not available in the database |
| 403 Forbidden | User doesn't have permission for the requested action |
| 409 Conflict | Resource already exists |
| 500 Server Error | Server-side error occurred |

## Constants

### User Roles
- USER (Default role for new users)
- MEMBER (User who is part of an organization)
- ADMIN (User with admin privileges in an organization)

## Security Considerations

- Passwords are hashed using bcrypt before storage
- JWT tokens expire after 24 hours
- Authentication is required for all endpoints except registration and login
- Email addresses must be properly formatted
- Passwords must be at least 8 characters long
- logoUrl must be a valid URL can perform this action. Please talk to your Admin for more information"
`