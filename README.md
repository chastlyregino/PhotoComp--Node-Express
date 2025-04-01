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
| status | string | User status: "ACTIVE", "INACTIVE", or "PENDING". |
| createdAt | timestamp | Timestamp when the user was created (ISO 8601). |
| updatedAt | timestamp | Timestamp when the user was last updated (ISO 8601). |

### Organization Model

| Property | Type | Description |
|----------|------|-------------|
| id | string (UUID) | Unique identifier for the org. |
| name | string | Organization's unique name. |
| createdBy | string | User's ID (`USER#${user.id}` || user.PK) |
| createdAt | timestamp | Timestamp when the org was created (ISO 8601). |
| updatedAt | timestamp | Timestamp when the org was last updated (ISO 8601). |
| isPublic | boolean | returns if an org is public or not. |
| logoUrl | string | Photo URL of the org's logo. |

### User-Organization Model

| Property | Type | Description |
|----------|------|-------------|
| userId | string | User's ID (`USER#${user.id}` || userOrg.PK)  |
| organizationName | string | Org's name (`ORG#${org.name}` || userOrg.SK) |
| role | timestamp | User role: "USER", "MEMBER", or "ADMIN". |
| joinedAt | string | When user joined the org. |


## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register a new user |
| POST | /api/auth/login | Login and get authentication token |
| POST | /organizations | Create a new organization |

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

### 2.1 Create new Organization

`POST /organizations`

This endpoint allows users to create a new organizations. All new user-organizations are registered with the "USER" role by default and are given an "ADMIN" role. All new organizations are registered as a default "PUBLIC".

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Content-Type | application/json | Yes |

#### Request Body

```json
{
    "name": "Taco Bell",
    "logoUrl": "https://images.app.goo.gl/k7Yc6Yb6ebeaB9HB8"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Unique org name |
| logoUrl | string | Yes | Valid URL |

#### Response

**201 Created**
```json
{
    "status": "Created organization!",
    "data": {
        "user": "5e5bdb97-6bfa-44c0-b998-2e64568798ef",
        "org": "Taco Bell"
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

### User Status
- ACTIVE
- INACTIVE
- PENDING

## Database Model

The system uses a single-table design in DynamoDB with the following structure:

| Component | Description |
|-----------|-------------|
| PK | Primary partition key in format [USER: USER#{id}; ORG: ORG#{NAME}; USER-ORG: USER#{id}]  |
| SK | Primary sort key in format [USER/ORG: ENTITY; USER-ORG: ORG#{NAME}] |
| GSI1PK | Global Secondary Index partition key in format [USER: EMAIL#{email}; ORG: USER#{id}] |
| GSI1SK | Global Secondary Index sort key in format [USER: USER#{id}; ORG: ORG#{NAME}] |
| type | Item type identifier used for filtering (e.g., "USER", "ORGANIZATION", "USER_ORG") |

## Security Considerations

- Passwords are hashed using bcrypt before storage
- JWT tokens expire after 24 hours
- Authentication is required for all endpoints except registration and login
- Email addresses must be properly formatted
- Passwords must be at least 8 characters long
- logoUrl must be a valid URL
