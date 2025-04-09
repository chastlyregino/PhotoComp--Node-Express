# Organization Photos Endpoints

## Get All Organization Photos

`GET /organizations/:id/photos`

This endpoint retrieves all photos across all events for an organization that the user is a member of. It provides a comprehensive view of all photos with their associated event information.

### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | Bearer your-jwt-token | Yes |

### Response

**200 OK**
```json
{
  "status": "success",
  "data": {
    "photos": [
      {
        "id": "photo-1",
        "eventId": "event-1",
        "url": "https://presigned-url.example.com/photo1.jpg",
        "uploadedBy": "user-id",
        "createdAt": "2025-04-01T15:30:00Z",
        "updatedAt": "2025-04-01T15:30:00Z",
        "metadata": {
          "title": "Company Picnic",
          "description": "Team building activities"
        },
        "event": {
          "id": "event-1",
          "title": "Annual Company Picnic",
          "date": "2025-04-01T12:00:00Z"
        }
      },
      {
        "id": "photo-2",
        "eventId": "event-2",
        "url": "https://presigned-url.example.com/photo2.jpg",
        "uploadedBy": "user-id",
        "createdAt": "2025-04-02T10:15:00Z",
        "updatedAt": "2025-04-02T10:15:00Z",
        "metadata": {
          "title": "Office Party",
          "description": "Celebrating company achievements"
        },
        "event": {
          "id": "event-2",
          "title": "Quarterly Review Party",
          "date": "2025-04-02T17:30:00Z"
        }
      }
    ],
    "count": 2
  }
}