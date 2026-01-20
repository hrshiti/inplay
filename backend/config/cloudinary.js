const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload presets for different content types
const uploadPresets = {
  poster: {
    folder: 'inplay/posters',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 300, height: 450, crop: 'fill' },
      { quality: 'auto' }
    ]
  },
  backdrop: {
    folder: 'inplay/backdrops',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 1200, height: 675, crop: 'fill' },
      { quality: 'auto' }
    ]
  },
  video: {
    folder: 'inplay/videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'avi', 'mkv'],
    eager: [
      { width: 1280, height: 720, crop: 'fill', format: 'mp4', video_codec: 'h264' },
      { width: 854, height: 480, crop: 'fill', format: 'mp4', video_codec: 'h264' },
      { width: 640, height: 360, crop: 'fill', format: 'mp4', video_codec: 'h264' }
    ],
    eager_async: true
  },
  trailer: {
    folder: 'inplay/trailers',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'avi'],
    transformation: [
      { width: 854, height: 480, crop: 'fill' },
      { quality: 'auto', format: 'mp4' }
    ]
  },
  reel: {
    folder: 'inplay/reels',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov'],
    transformation: [
      { width: 720, height: 1280, crop: 'fill' },
      { quality: 'auto', format: 'mp4' }
    ]
  },
  avatar: {
    folder: 'inplay/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 200, height: 200, crop: 'thumb', gravity: 'face' },
      { quality: 'auto' }
    ]
  },
  audio: {
    folder: 'inplay/music',
    resource_type: 'video', // Cloudinary treats audio as 'video' resource type often, or 'raw'/'auto', but 'video' usually works for mp3/wav with duration
    allowed_formats: ['mp3', 'wav', 'aac'],
    transformation: [
      { quality: 'auto' } // Audio doesn't need resize
    ]
  }
};

// Generate signed URL for secure video access
const generateSignedUrl = (publicId, options = {}) => {
  const defaultOptions = {
    resource_type: 'video',
    type: 'authenticated',
    expires_at: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
    ...options
  };

  return cloudinary.url(publicId, {
    sign_url: true,
    ...defaultOptions
  });
};

// Generate HLS streaming URL
const generateHLSUrl = (publicId) => {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    format: 'm3u8',
    type: 'authenticated',
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
  });
};

// Upload file to Cloudinary
const uploadToCloudinary = async (file, presetType = 'video') => {
  // DEV BYPASS: If credentials are missing, SAVE TO LOCAL DISK so user sees THEIR content
  if (process.env.CLOUDINARY_API_KEY === 'your-api-key' || !process.env.CLOUDINARY_API_KEY) {
    console.warn("⚠️ CLOUDINARY KEYS MISSING: Saving to LOCAL DISK instead.");

    const fs = require('fs');
    const path = require('path');
    const uploadDir = path.join(__dirname, '../public/uploads');

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Handle array if passed
    const fileToSave = Array.isArray(file) ? file[0] : file;

    // Generate filename
    const ext = fileToSave.originalname ? path.extname(fileToSave.originalname) : (presetType === 'video' || presetType === 'reel' ? '.mp4' : '.jpg');
    const filename = `${presetType}_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`;
    const filePath = path.join(uploadDir, filename);

    // Save buffer to file
    try {
      if (fileToSave.buffer) {
        fs.writeFileSync(filePath, fileToSave.buffer);
      } else if (fileToSave.path) {
        fs.copyFileSync(fileToSave.path, filePath);
      } else {
        // Fallback dummy if no data (should not happen with multer memory storage)
        return {
          public_id: `dummy_err_${Date.now()}`,
          url: 'https://placehold.co/600x400/000/FFF?text=Error',
          secure_url: 'https://placehold.co/600x400/000/FFF?text=Error'
        };
      }

      const fileUrl = `${process.env.BACKEND_URL || 'http://localhost:5001'}/uploads/${filename}`;

      return {
        public_id: `local_${filename}`,
        url: fileUrl,
        secure_url: fileUrl,
        format: ext.replace('.', ''),
        size: fileToSave.size || 0,
        width: 0, // Unknown without processing
        height: 0,
        duration: 0 // Unknown without processing
      };

    } catch (err) {
      console.error("Local save failed", err);
      throw new Error("Failed to save local file");
    }
  }

  try {
    const preset = uploadPresets[presetType];
    if (!preset) {
      throw new Error(`Invalid preset type: ${presetType}`);
    }

    // Handle array if passed (like from upload.fields)
    const fileToUpload = Array.isArray(file) ? file[0] : file;

    if (!fileToUpload) {
      throw new Error('No file provided for upload');
    }

    // Prepare content for upload
    let contentToUpload;

    if (fileToUpload.path) {
      // If it's a disk path (unlikely with memoryStorage, but good for compatibility)
      contentToUpload = fileToUpload.path;
    } else if (fileToUpload.buffer) {
      // Convert buffer to Data URI for uploader.upload()
      const b64 = fileToUpload.buffer.toString('base64');
      contentToUpload = `data:${fileToUpload.mimetype};base64,${b64}`;
    } else if (typeof fileToUpload === 'string') {
      // If it's already a string (URL or path)
      contentToUpload = fileToUpload;
    } else {
      throw new Error('Invalid file object: must have path or buffer');
    }

    const result = await cloudinary.uploader.upload(contentToUpload, {
      ...preset,
      timeout: 120000 // Increase timeout to 120 seconds for larger files
    });

    return {
      public_id: result.public_id,
      url: result.url,
      secure_url: result.secure_url,
      format: result.format,
      size: result.bytes,
      width: result.width,
      height: result.height,
      duration: result.duration || 0
    };
  } catch (error) {
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

// Delete file from Cloudinary
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return true;
  } catch (error) {
    throw new Error(`Cloudinary delete failed: ${error.message}`);
  }
};

// Get video info
const getVideoInfo = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: 'video'
    });
    return result;
  } catch (error) {
    throw new Error(`Failed to get video info: ${error.message}`);
  }
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
  generateSignedUrl,
  generateHLSUrl,
  getVideoInfo,
  uploadPresets
};
