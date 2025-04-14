# Image Resizing Feature

## Overview

The PhotoComp API automatically generates multiple sizes of each uploaded photo to optimize display in different contexts and prevent pixelation when smaller images are displayed in larger containers. This feature ensures that photos always look their best at any display size while minimizing bandwidth usage.

## Image Sizes

When a photo is uploaded, the system automatically creates the following sizes:

| Size | Width | Quality | Use Case |
|------|-------|---------|----------|
| thumbnail | 200px | 80% | Previews, thumbnails, list views |
| medium | 800px | 85% | Gallery views, detail cards |
| large | 1600px | 90% | Full-screen views, high-quality displays |
| original | Unchanged | 100% | Maximum quality, downloads, archival |

All resized images maintain their original aspect ratio and are never upscaled beyond their original dimensions.

## Photo Model

The photo model has been extended to include URLs for all available sizes:

```json
{
  "id": "photo-id-123",
  "eventId": "event-id-456",
  "url": "https://presigned-url.example.com/photos/original.jpg", // For backward compatibility
  "urls": {
    "original": "https://presigned-url.example.com/photos/original.jpg",
    "thumbnail": "https://presigned-url.example.com/photos/thumbnail.jpg",
    "medium": "https://presigned-url.example.com/photos/medium.jpg",
    "large": "https://presigned-url.example.com/photos/large.jpg"
  },
  "metadata": {
    "title": "Company Event",
    "description": "Team building activities",
    "width": 3000,
    "height": 2000,
    "size": 5242880
  },
  "createdAt": "2025-04-05T14:30:00Z",
  "uploadedBy": "user-id-789"
}
```

## API Endpoints

### Get Photos with Size Preference

When retrieving photos, you can specify a preferred size to use for the main display URL.

`GET /organizations/:id/photos?size=medium`

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| size | string | "medium" | Preferred image size: "thumbnail", "medium", "large", or "original" |

#### Response

```json
{
  "status": "success",
  "data": {
    "photos": [
      {
        "id": "photo-id-123",
        "eventId": "event-id-456",
        "url": "https://presigned-url.example.com/photos/original.jpg",
        "urls": {
          "original": "https://presigned-url.example.com/photos/original.jpg",
          "thumbnail": "https://presigned-url.example.com/photos/thumbnail.jpg",
          "medium": "https://presigned-url.example.com/photos/medium.jpg",
          "large": "https://presigned-url.example.com/photos/large.jpg"
        },
        "displayUrl": "https://presigned-url.example.com/photos/medium.jpg",
        "availableSizes": ["original", "thumbnail", "medium", "large"],
        "dimensions": {
          "width": 3000,
          "height": 2000
        },
        "event": {
          "id": "event-id-456",
          "title": "Annual Company Picnic",
          "date": "2025-05-01T12:00:00Z"
        }
      }
    ],
    "count": 1,
    "preferredSize": "medium"
  }
}
```

### Download Photo with Specific Size

When downloading a photo, you can specify which size you want to download.

`GET /organizations/:id/events/:eventId/photos/:photoId/download?size=large`

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| size | string | "original" | Image size to download: "thumbnail", "medium", "large", or "original" |

#### Response

```json
{
  "status": "success",
  "data": {
    "downloadUrl": "https://download-url.example.com/photos/large.jpg?Content-Disposition=...",
    "size": "large"
  }
}
```

## Backward Compatibility

The system handles both new multi-size images and legacy single-size images transparently:

- For legacy photos, all operations will use the original single URL
- For new photos, the system will provide all available sizes
- If a requested size isn't available, the system falls back to the original

## Implementation Notes

- Images are resized during upload using the Sharp library
- Original aspect ratio is always preserved
- Images are never upscaled to prevent quality loss
- All sizes use appropriate compression to minimize file size while maintaining quality
- Metadata includes original dimensions for layout planning