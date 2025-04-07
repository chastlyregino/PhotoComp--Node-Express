# 4. Photo Management

## 4.1. Upload a Photo

`POST /organizations/:id/events/:eventId/photos`

This endpoint allows organization admins to upload photos to an event.

### Request Headers
| Key           | Value            | Required |
|--------------|----------------|----------|
| Authorization | `Bearer <token>` |  Yes  |
| Content-Type  | `multipart/form-data` |  Yes  |

### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| photo | file | Yes | The photo file to upload (image files only) |
| title | string | No | Title for the photo |
| description | string | No | Description of the photo |

### Response
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

## 4.2. Get All Photos for an Event

`GET /organizations/:id/events/:eventId/photos`

This endpoint retrieves all photos for a specific event. Only members of the organization can access this endpoint.

### Request Headers
| Key           | Value            | Required |
|--------------|----------------|----------|
| Authorization | `Bearer <token>` |  Yes  |

### Response
**200 OK**
```json
{
  "status": "success",
  "data": {
    "photos": [
      {
        "id": "photo-1",
        "eventId": "event-id",
        "url": "https://presigned-url.amazonaws.com/photos/event-id/photo-1.jpg",
        "createdAt": "2025-04-05T14:30:00Z",
        "updatedAt": "2025-04-05T14:30:00Z",
        "uploadedBy": "user-id",
        "metadata": {
          "title": "Team Photo",
          "description": "The whole team together"
        }
      },
      {
        "id": "photo-2",
        "eventId": "event-id",
        "url": "https://presigned-url.amazonaws.com/photos/event-id/photo-2.jpg",
        "createdAt": "2025-04-05T15:30:00Z",
        "updatedAt": "2025-04-05T15:30:00Z",
        "uploadedBy": "user-id",
        "metadata": {
          "title": "Award Ceremony",
          "description": "Recognizing achievements"
        }
      }
    ]
  }
}
```

**403 Forbidden**
```json
{
  "status": "error",
  "message": "You are not a member of this organization"
}
```

**404 Not Found**
```json
{
  "status": "error",
  "message": "Event not found"
}
```

## 4.3. Get a Download URL for a Specific Photo

`GET /organizations/:id/events/:eventId/photos/:photoId/download`

This endpoint provides a pre-signed URL for downloading a specific photo. Users must be attending the event to access the photo download.

### Request Headers
| Key           | Value            | Required |
|--------------|----------------|----------|
| Authorization | `Bearer <token>` |  Yes  |

### Response
**200 OK**
```json
{
  "status": "success",
  "data": {
    "downloadUrl": "https://download-url.amazonaws.com/photos/event-id/photo-id.jpg?Content-Disposition=attachment%3B%20filename%3D%22event-photo.jpg%22&X-Amz-Algorithm=..."
  }
}
```

**403 Forbidden**
```json
{
  "status": "error",
  "message": "You do not have access to photos from this event"
}
```

**404 Not Found**
```json
{
  "status": "error",
  "message": "Photo not found"
}
```

```json
{
  "status": "error",
  "message": "Photo does not belong to the specified event"
}
```

## 4.4. Delete a Photo

`DELETE /organizations/:id/events/:eventId/photos/:photoId`

This endpoint allows organization admins to delete a photo from an event.

### Request Headers
| Key           | Value            | Required |
|--------------|----------------|----------|
| Authorization | `Bearer <token>` |  Yes  |

### Response
**200 OK**
```json
{
  "status": "success",
  "message": "Photo deleted successfully"
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
