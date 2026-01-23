# Media Storage Flow Documentation

This document describes how media files (images, videos, audio) are handled, stored, and served in the InPlay backend.

## 1. Overview
The application uses local disk storage via the `multer` middleware to handle file uploads. Instead of relying on third-party cloud services like Cloudinary for every upload, files are stored directly on the server's filesystem and served as static content through Express.

## 2. Directory Structure
All uploaded files are stored in the `backend/uploads/` directory, organized into the following subdirectories:

```text
backend/uploads/
├── images/
│   ├── avatars/      # User profile pictures
│   ├── posters/      # Content posters
│   ├── backdrops/    # Content backdrop images
│   └── thumbnails/   # Video/Audio thumbnails
├── videos/           # MP4 and other video files
└── audio/            # MP3 and other audio files
```

## 3. Storage Configuration (`config/multerStorage.js`)
The core logic for storage is defined in [multerStorage.js](file:///d:/companyfolder/inplay/backend/config/multerStorage.js).

### Filename Generation
Files are renamed to ensure uniqueness and prevent overwriting:
`{prefix}{timestamp}_{randomString}_{originalName}{extension}`
*   **Prefix**: `img_`, `video_`, `audio_`, or specific types like `avatar_`.
*   **Timestamp**: `Date.now()`.
*   **Random String**: 6-character alphanumeric string.

### File Size Limits
- **Images**: 10MB
- **Videos**: 500MB
- **Audio**: 20MB
- **Avatars**: 5MB

### Allowed MIME Types
- **Images**: `jpeg`, `jpg`, `png`, `webp`, `gif`
- **Videos**: `mp4`, `mpeg`, `quicktime`, `avi`, `mkv`
- **Audio**: `mpeg`, `mp3`, `wav`, `aac`, `ogg`

## 4. URL Hydration
When a file is uploaded, the backend returns a fully hydrated (absolute) URL.

### Generation Logic
1.  **Relative Path**: Calculated relative to the `uploads/` base (e.g., `videos/video_123.mp4`).
2.  **Base URL**: Taken from the `BACKEND_URL` environment variable.
3.  **Result**: `https://api.yourdomain.com/uploads/videos/video_123.mp4`.

## 5. Serving Static Files
In [server.js](file:///d:/companyfolder/inplay/backend/server.js), the `uploads` directory is served statically:

```javascript
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
```
This makes any file in the `uploads` folder accessible via the `/uploads` URL path.

## 6. Utilities
The `multerStorage.js` file provides several helper functions:
- `getPublicUrl(filePath)`: Converts a local absolute path to a public URL.
- `deleteFile(filePath)`: Deletes a file from the disk.
- `getFilePathFromUrl(url)`: Extracts the local absolute path from a public URL.
- `transformFileToResponse(file)`: Formats the Multer file object into a response structure similar to Cloudinary's for backward compatibility.

## 7. Migration Note
While `cloudinary.js` configuration remains in the project, the primary flow has been moved to local storage to accommodate larger video files and reduce dependency on external APIs for basic storage needs.
