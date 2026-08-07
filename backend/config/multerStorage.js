const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

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
    banners: path.join(UPLOAD_BASE, 'images', 'banners'),
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
    videos: [
        'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
        'video/webm', 'video/3gpp', 'video/mp2t', 'video/x-m4v'
    ],
    audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/aac', 'audio/ogg', 'audio/x-m4a', 'audio/mp4'],
};

// Extension fallback: browsers/OS often report a generic or unlisted mimetype
// (application/octet-stream, video/x-flv, "" ...) for perfectly valid media.
const ALLOWED_EXTENSIONS = {
    images: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    videos: ['.mp4', '.m4v', '.mov', '.avi', '.mkv', '.webm', '.3gp', '.ts', '.mpeg', '.mpg'],
    audio: ['.mp3', '.wav', '.aac', '.ogg', '.m4a'],
};

// Errors flagged this way are reported to the client as a 400 with the real
// message instead of being masked as a generic 500 by the global error handler.
const createUploadError = (message) => {
    const error = new Error(message);
    error.isUploadError = true;
    error.statusCode = 400;
    return error;
};

// A file matches a kind when either its mimetype or its extension is allowed
const matchesKind = (file, kind) => {
    if (ALLOWED_MIMETYPES[kind].includes(file.mimetype)) return true;
    return ALLOWED_EXTENSIONS[kind].includes(path.extname(file.originalname || '').toLowerCase());
};

// Resolve what a file actually is, so storage routing does not depend on a
// mimetype the browser may have reported wrongly
const detectKind = (file) => {
    if (matchesKind(file, 'images')) return 'images';
    if (matchesKind(file, 'videos')) return 'videos';
    if (matchesKind(file, 'audio')) return 'audio';
    return null;
};

const describeRejection = (file, allowedExtensions) =>
    `"${file.originalname}" is not a supported format (${file.mimetype || 'unknown type'}). ` +
    `Allowed: ${allowedExtensions.map(e => e.replace('.', '').toUpperCase()).join(', ')}.`;

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
        } else if (req.body.type === 'banner' || file.fieldname === 'banner') {
            uploadPath = UPLOAD_DIRS.banners;
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
    if (matchesKind(file, 'images')) {
        cb(null, true);
    } else {
        cb(createUploadError(describeRejection(file, ALLOWED_EXTENSIONS.images)), false);
    }
};

// File filter for videos
const videoFileFilter = (req, file, cb) => {
    if (matchesKind(file, 'videos')) {
        cb(null, true);
    } else {
        cb(createUploadError(describeRejection(file, ALLOWED_EXTENSIONS.videos)), false);
    }
};

// File filter for audio
const audioFileFilter = (req, file, cb) => {
    if (matchesKind(file, 'audio')) {
        cb(null, true);
    } else {
        cb(createUploadError(describeRejection(file, ALLOWED_EXTENSIONS.audio)), false);
    }
};

// Generic file filter for mixed uploads
const mixedFileFilter = (req, file, cb) => {
    const kind = detectKind(file);

    if (kind) {
        // Remember the resolved kind so storage puts the file in the right folder
        file.detectedKind = kind;
        cb(null, true);
    } else {
        const allowed = [
            ...ALLOWED_EXTENSIONS.images,
            ...ALLOWED_EXTENSIONS.videos,
            ...ALLOWED_EXTENSIONS.audio
        ];
        cb(createUploadError(describeRejection(file, allowed)), false);
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

            // Prefer the kind resolved by the filter (mimetype can be wrong/generic)
            const kind = file.detectedKind || detectKind(file);

            if (kind === 'images') {
                if (file.fieldname === 'poster') {
                    uploadPath = UPLOAD_DIRS.posters;
                } else if (file.fieldname === 'backdrop') {
                    uploadPath = UPLOAD_DIRS.backdrops;
                } else if (file.fieldname === 'banner') {
                    uploadPath = UPLOAD_DIRS.banners;
                } else {
                    uploadPath = UPLOAD_DIRS.images;
                }
            } else if (kind === 'videos') {
                uploadPath = UPLOAD_DIRS.videos;
            } else if (kind === 'audio') {
                uploadPath = UPLOAD_DIRS.audio;
            } else {
                uploadPath = UPLOAD_DIRS.images; // fallback
            }

            ensureDirectoryExists(uploadPath);
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const kind = file.detectedKind || detectKind(file);
            const prefixes = { images: 'img_', videos: 'video_', audio: 'audio_' };

            cb(null, generateFileName(file.originalname, prefixes[kind] || 'file_'));
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
    const baseUrl = process.env.BACKEND_URL || '';
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const relativeUrl = `/uploads/${relativePath.replace(/\\/g, '/')}`;
    
    return cleanBaseUrl ? `${cleanBaseUrl}${relativeUrl}` : relativeUrl;
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

// Helper function to convert a single file to WebP
const convertFileToWebp = async (file) => {
    if (!file || !file.path) return;

    // Check if the file is an image
    const isImage = file.mimetype.startsWith('image/') || 
                    /\.(jpg|jpeg|png|gif|bmp|tiff|webp)$/i.test(file.originalname);
    
    if (!isImage) return;

    const originalPath = file.path;
    const ext = path.extname(originalPath);
    
    // Create new .webp path in the same folder
    const dir = path.dirname(originalPath);
    const baseWithoutExt = path.basename(originalPath, ext);
    const newFilename = `${baseWithoutExt}.webp`;
    const newPath = path.join(dir, newFilename);

    try {
        // Convert using sharp
        await sharp(originalPath)
            .webp({ quality: 80 })
            .toFile(newPath);

        // Delete the original file if it is not already .webp or is a different file
        if (originalPath !== newPath) {
            if (fs.existsSync(originalPath)) {
                fs.unlinkSync(originalPath);
            }
        }

        // Update the file object properties
        file.path = newPath;
        file.filename = newFilename;
        file.mimetype = 'image/webp';
        file.size = fs.statSync(newPath).size;
        file.originalname = path.basename(file.originalname, path.extname(file.originalname)) + '.webp';
    } catch (error) {
        console.error(`Error converting image file ${originalPath} to webp:`, error);
        // Fallback: Proceed with the original file if conversion fails
    }
};

// Express middleware to convert uploaded images to WebP
const convertImagesToWebpMiddleware = async (req, res, next) => {
    try {
        if (req.file) {
            await convertFileToWebp(req.file);
        }

        if (req.files) {
            if (Array.isArray(req.files)) {
                for (const file of req.files) {
                    await convertFileToWebp(file);
                }
            } else if (typeof req.files === 'object') {
                for (const fieldName of Object.keys(req.files)) {
                    const files = req.files[fieldName];
                    if (Array.isArray(files)) {
                        for (const file of files) {
                            await convertFileToWebp(file);
                        }
                    }
                }
            }
        }
        next();
    } catch (error) {
        console.error('Error in convertImagesToWebpMiddleware:', error);
        next(); // Proceed anyway so request doesn't fail
    }
};

// Helper to wrap original multer middleware with WebP conversion
const wrapWithWebp = (multerMiddleware) => {
    return (req, res, next) => {
        multerMiddleware(req, res, async (err) => {
            if (err) {
                return next(err);
            }
            try {
                await convertImagesToWebpMiddleware(req, res, () => {});
                next();
            } catch (webpErr) {
                console.error("WebP conversion failed, proceeding with original files:", webpErr);
                next();
            }
        });
    };
};

// Helper to wrap all methods of a multer instance
const wrapMulterInstance = (multerInstance) => {
    const originalSingle = multerInstance.single;
    const originalArray = multerInstance.array;
    const originalFields = multerInstance.fields;
    const originalAny = multerInstance.any;

    multerInstance.single = function(...args) {
        return wrapWithWebp(originalSingle.apply(this, args));
    };
    multerInstance.array = function(...args) {
        return wrapWithWebp(originalArray.apply(this, args));
    };
    multerInstance.fields = function(...args) {
        return wrapWithWebp(originalFields.apply(this, args));
    };
    multerInstance.any = function(...args) {
        return wrapWithWebp(originalAny.apply(this, args));
    };

    return multerInstance;
};

// Wrap the exported multer uploaders
const wrappedUploadImage = wrapMulterInstance(uploadImage);
const wrappedUploadAvatar = wrapMulterInstance(uploadAvatar);
const wrappedUploadMixed = wrapMulterInstance(uploadMixed);

module.exports = {
    uploadImage: wrappedUploadImage,
    uploadVideo,
    uploadAudio,
    uploadAvatar: wrappedUploadAvatar,
    uploadMixed: wrappedUploadMixed,
    convertImagesToWebpMiddleware,
    getPublicUrl,
    deleteFile,
    getFilePathFromUrl,
    transformFileToResponse,
    createUploadError,
    FILE_SIZE_LIMITS,
    ALLOWED_MIMETYPES,
    ALLOWED_EXTENSIONS,
    UPLOAD_DIRS,
    UPLOAD_BASE
};
