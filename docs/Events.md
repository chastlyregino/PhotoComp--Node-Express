## Event Management 

### Create an organization Event

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

### Get Organization Events

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

### Update Event's Publicity

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
