# Event Management 

## Creating an Organization Event

`POST /organizations/:id/events`

This endpoint allows users with "ADMIN" role to create a new event for an organization. It now supports location data and automatic weather forecasts.

### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | `Bearer <token>` |  Yes  |
| Content-Type | `application/json` |  Yes  |

### Request Body
```json
{
  "title": "Annual Company Meetup",
  "description": "A networking event for all employees.",
  "date": "2025-05-01T18:00:00Z",
  "address": "123 Main St, Boston, MA 02108"
}
```

OR with direct coordinate specification:

```json
{
  "title": "Annual Company Meetup",
  "description": "A networking event for all employees.",
  "date": "2025-05-01T18:00:00Z",
  "location": {
    "latitude": 42.3601,
    "longitude": -71.0589,
    "name": "Boston City Hall"
  }
}
```

### Response
**201 Created**
```json
{
  "status": "success and email has been sent!",
  "data": {
    "userEvent": {
      "PK": "USER#userId",
      "SK": "EVENT#eventId",
      "GSI2PK": "EVENT#eventId", 
      "GSI2SK": "USER#userId"
    },
    "event": {
      "PK": "EVENT#abcd1234",
      "SK": "ENTITY",
      "title": "Annual Company Meetup",
      "description": "A networking event for all employees.",
      "isPublic": true,
      "date": "2025-05-01T18:00:00Z",
      "createdAt": "2025-04-01T15:30:00Z",
      "updatedAt": "2025-04-01T15:30:00Z",
      "location": {
        "latitude": 42.3601,
        "longitude": -71.0589,
        "name": "Boston City Hall"
      },
      "weather": {
        "temperature": 18.5,
        "weatherCode": 1,
        "weatherDescription": "Mainly clear",
        "windSpeed": 12.3,
        "precipitation": 0.5
      },
      "GSI2PK": "ORG#xyz987",
      "GSI2SK": "EVENT#abcd1234"
    },
    "geocoding": {
      "providedAddress": "123 Main St, Boston, MA 02108",
      "resolvedCoordinates": {
        "latitude": 42.3601,
        "longitude": -71.0589,
        "formattedAddress": "Boston City Hall, 1 City Hall Square, Boston, MA 02203, USA"
      }
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

## Get Organization Events

`GET /organizations/:id/events`

This endpoint retrieves all events for a specific organization that the user is a member of.

### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | `Bearer <token>` |  Yes  |

### Response
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
        "isPublic": true,
        "date": "2025-05-01T18:00:00Z",
        "createdAt": "2025-04-01T15:30:00Z",
        "updatedAt": "2025-04-01T15:30:00Z",
        "location": {
          "latitude": 42.3601,
          "longitude": -71.0589,
          "name": "Boston City Hall"
        },
        "weather": {
          "temperature": 18.5,
          "weatherCode": 1,
          "weatherDescription": "Mainly clear",
          "windSpeed": 12.3,
          "precipitation": 0.5
        },
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

## Update Event's Publicity

`PATCH /organizations/:id/events/:eventId`

This endpoint allows users with "ADMIN" role to update an event's publicity status.

### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | `Bearer <token>` |  Yes  |
| Content-Type | application/json | Yes |

### Request Body
```json
{
  "isPublic": false
}
```

### Response

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

## Refresh Weather Data for an Event

`POST /organizations/:id/events/:eid/weather/refresh`

This endpoint allows organization admins to refresh the weather forecast for an event.

### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | `Bearer <token>` |  Yes  |

### Response

**200 OK**
```json
{
  "status": "success",
  "data": {
    "event": {
      "id": "abcd1234",
      "title": "Annual Company Meetup",
      "weather": {
        "temperature": 19.2,
        "weatherCode": 2,
        "weatherDescription": "Partly cloudy",
        "windSpeed": 10.5,
        "precipitation": 0
      }
    }
  }
}
```

## Update Event Location Using Coordinates

`PATCH /organizations/:id/events/:eid/location`

Updates the event location using latitude and longitude, and fetches new weather data.

### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | `Bearer <token>` |  Yes  |
| Content-Type | application/json | Yes |

### Request Body

```json
{
  "latitude": 42.3601,
  "longitude": -71.0589,
  "name": "Boston City Hall"
}
```

### Response

**200 OK**
```json
{
  "status": "success",
  "data": {
    "event": {
      "id": "abcd1234",
      "title": "Annual Company Meetup",
      "location": {
        "latitude": 42.3601,
        "longitude": -71.0589,
        "name": "Boston City Hall"
      },
      "weather": {
        "temperature": 18.5,
        "weatherCode": 1,
        "weatherDescription": "Mainly clear",
        "windSpeed": 12.3,
        "precipitation": 0.5
      }
    }
  }
}
```

## Update Event Location Using Address

`PATCH /organizations/:id/events/:eid/location/address`

Updates the event location using an address string, which is geocoded to coordinates.

### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | `Bearer <token>` |  Yes  |
| Content-Type | application/json | Yes |

### Request Body

```json
{
  "address": "123 Main St, Boston, MA 02108"
}
```

### Response

**200 OK**
```json
{
  "status": "success",
  "data": {
    "event": {
      "id": "abcd1234",
      "title": "Annual Company Meetup",
      "location": {
        "latitude": 42.3601,
        "longitude": -71.0589,
        "name": "Boston, Massachusetts, USA"
      },
      "weather": {
        "temperature": 18.5,
        "weatherCode": 1,
        "weatherDescription": "Mainly clear",
        "windSpeed": 12.3,
        "precipitation": 0.5
      }
    },
    "geocoding": {
      "latitude": 42.3601,
      "longitude": -71.0589,
      "formattedAddress": "Boston, Massachusetts, USA"
    }
  }
}
```