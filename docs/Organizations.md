## Organization Endpoints

### Create New Organization

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

### Get All Organizations of User

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

### Update an Organization

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
