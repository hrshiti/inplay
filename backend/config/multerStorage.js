const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

// Base upload directory
const UPLOAD_BASE = path.join(__dirname, '../uploads');

// Create subdirectories
const UPLOAD_DIRS = {
    images: path.join(UPLOAD_BASE, 'images'),
    videos: path.join(UPLOAD_BASE, 'videos'),
    audio: path.join(UPLOAD_BASE, 'audio'),
    thumbnails: path.join(UPLOAD_BASE, 'images', 'thumbnails'),
    posters: path.join(UPLOAD_BASE, 'images', 'posters'),
    backdrops: path.join(UPLOAD_BASE, 'images', 'backdrops'),
    avatars: path.join(UPLOAD_BASE, 'images', 'avatars'),
};

// Initialize all directories
Object.values(UPLOAD_DIRS).forEach(dir => ensureDirectoryExists(dir));

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
    IMAGE: 10 * 1024 * 1024,      // 10MB for images
    VIDEO: 10 * 1024 * 1024 * 1024,    // 10GB for videos (Increased from 500MB)
    AUDIO: 20 * 1024 * 1024,      // 20MB for audio
    AVATAR: 5 * 1024 * 1024,      // 5MB for avatars
};

// Allowed MIME types
const ALLOWED_MIMETYPES = {
    images: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    videos: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],
    audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/aac', 'audio/ogg'],
};

// Generate unique filename
const generateFileName = (originalname, prefix = '') => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(originalname).toLowerCase();
    const baseName = path.basename(originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    return `${prefix}${timestamp}_${randomString}_${baseName}${ext}`;
};

// Configure storage for images
const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = UPLOAD_DIRS.images;

        // Determine specific image type folder
        if (req.body.type === 'poster' || file.fieldname === 'poster') {
            uploadPath = UPLOAD_DIRS.posters;
        } else if (req.body.type === 'backdrop' || file.fieldname === 'backdrop') {
            uploadPath = UPLOAD_DIRS.backdrops;
        } else if (req.body.type === 'avatar' || file.fieldname === 'avatar') {
            uploadPath = UPLOAD_DIRS.avatars;
        } else if (req.body.type === 'thumbnail' || file.fieldname === 'thumbnail') {
            uploadPath = UPLOAD_DIRS.thumbnails;
        }

        ensureDirectoryExists(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const prefix = req.body.type ? `${req.body.type}_` : 'img_';
        cb(null, generateFileName(file.originalname, prefix));
    }
});

// Configure storage for videos
const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureDirectoryExists(UPLOAD_DIRS.videos);
        cb(null, UPLOAD_DIRS.videos);
    },
    filename: (req, file, cb) => {
        const prefix = 'video_';
        cb(null, generateFileName(file.originalname, prefix));
    }
});

// Configure storage for audio
const audioStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureDirectoryExists(UPLOAD_DIRS.audio);
        cb(null, UPLOAD_DIRS.audio);
    },
    filename: (req, file, cb) => {
        const prefix = 'audio_';
        cb(null, generateFileName(file.originalname, prefix));
    }
});

// File filter for images
const imageFileFilter = (req, file, cb) => {
    if (ALLOWED_MIMETYPES.images.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid image type. Allowed: ${ALLOWED_MIMETYPES.images.join(', ')}`), false);
    }
};

// File filter for videos
const videoFileFilter = (req, file, cb) => {
    if (ALLOWED_MIMETYPES.videos.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid video type. Allowed: ${ALLOWED_MIMETYPES.videos.join(', ')}`), false);
    }
};

// File filter for audio
const audioFileFilter = (req, file, cb) => {
    if (ALLOWED_MIMETYPES.audio.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid audio type. Allowed: ${ALLOWED_MIMETYPES.audio.join(', ')}`), false);
    }
};

// Generic file filter for mixed uploads
const mixedFileFilter = (req, file, cb) => {
    const allAllowedTypes = [
        ...ALLOWED_MIMETYPES.images,
        ...ALLOWED_MIMETYPES.videos,
        ...ALLOWED_MIMETYPES.audio
    ];

    if (allAllowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type: ${file.mimetype}`), false);
    }
};

// Multer upload instances
const uploadImage = multer({
    storage: imageStorage,
    limits: { fileSize: FILE_SIZE_LIMITS.IMAGE },
    fileFilter: imageFileFilter
});

const uploadVideo = multer({
    storage: videoStorage,
    limits: { fileSize: FILE_SIZE_LIMITS.VIDEO },
    fileFilter: videoFileFilter
});

const uploadAudio = multer({
    storage: audioStorage,
    limits: { fileSize: FILE_SIZE_LIMITS.AUDIO },
    fileFilter: audioFileFilter
});

const uploadAvatar = multer({
    storage: imageStorage,
    limits: { fileSize: FILE_SIZE_LIMITS.AVATAR },
    fileFilter: imageFileFilter
});

// Mixed upload for content (images + videos + audio)
const uploadMixed = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            let uploadPath;

            // Determine destination based on file type
            if (file.mimetype.startsWith('image/')) {
                if (file.fieldname === 'poster') {
                    uploadPath = UPLOAD_DIRS.posters;
                } else if (file.fieldname === 'backdrop') {
                    uploadPath = UPLOAD_DIRS.backdrops;
                } else {
                    uploadPath = UPLOAD_DIRS.images;
                }
            } else if (file.mimetype.startsWith('video/')) {
                uploadPath = UPLOAD_DIRS.videos;
            } else if (file.mimetype.startsWith('audio/')) {
                uploadPath = UPLOAD_DIRS.audio;
            } else {
                uploadPath = UPLOAD_DIRS.images; // fallback
            }

            ensureDirectoryExists(uploadPath);
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            let prefix = 'file_';
            if (file.mimetype.startsWith('image/')) prefix = 'img_';
            if (file.mimetype.startsWith('video/')) prefix = 'video_';
            if (file.mimetype.startsWith('audio/')) prefix = 'audio_';

            cb(null, generateFileName(file.originalname, prefix));
        }
    }),
    limits: { fileSize: FILE_SIZE_LIMITS.VIDEO }, // Use max limit
    fileFilter: mixedFileFilter
});

// Helper function to generate public URL for uploaded file
const getPublicUrl = (filePath) => {
    if (!filePath) return null;

    // Get relative path from uploads directory
    const relativePath = path.relative(UPLOAD_BASE, filePath);

    // Generate URL (works for both dev and production)
    const baseUrl = process.env.BACKEND_URL;
    return `${baseUrl}/uploads/${relativePath.replace(/\\/g, '/')}`;
};

// Helper function to delete file from disk
const deleteFile = (filePath) => {
    try {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
};

// Helper to extract file path from URL
const getFilePathFromUrl = (url) => {
    if (!url) return null;

    try {
        // Extract the path after /uploads/
        const match = url.match(/\/uploads\/(.+)$/);
        if (match && match[1]) {
            return path.join(UPLOAD_BASE, match[1].replace(/\//g, path.sep));
        }
        return null;
    } catch (error) {
        console.error('Error extracting file path from URL:', error);
        return null;
    }
};

// Transform uploaded file to Cloudinary-like response format
const transformFileToResponse = (file) => {
    if (!file) return null;

    // Get relative path (e.g. "videos/myvideo.mp4")
    const relativePath = path.relative(UPLOAD_BASE, file.path);
    // Convert to URL path (e.g. "/uploads/videos/myvideo.mp4")
    const urlPath = `/uploads/${relativePath.replace(/\\/g, '/')}`;

    return {
        // public_id can be the relative path for local files
        public_id: urlPath,
        url: urlPath,
        secure_url: urlPath,
        format: path.extname(file.filename).replace('.', ''),
        size: file.size,
        bytes: file.size,
        width: 0,
        height: 0,
        duration: 0,
        originalname: file.originalname,
        filename: file.filename,
        path: file.path // absolute path for internal server use
    };
};

module.exports = {
    uploadImage,
    uploadVideo,
    uploadAudio,
    uploadAvatar,
    uploadMixed,
    getPublicUrl,
    deleteFile,
    getFilePathFromUrl,
    transformFileToResponse,
    FILE_SIZE_LIMITS,
    ALLOWED_MIMETYPES,
    UPLOAD_DIRS,
    UPLOAD_BASE
};
