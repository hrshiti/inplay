const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadToCloudinary } = require('../config/cloudinary');
const { protect, authorize } = require('../middlewares/auth');

// Setup memory storage for multer
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for audio/images
});

// @desc    Upload file (image or audio)
// @route   POST /api/upload
// @access  Private/Admin
router.post('/', protect, authorize('admin'), upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const type = req.body.type || 'image'; // 'image' or 'audio' or 'poster'

        // Map frontend type to cloudinary preset key
        let presetType = 'poster'; // default
        if (type === 'audio') presetType = 'audio';
        else if (type === 'backdrop') presetType = 'backdrop';
        else if (type === 'avatar') presetType = 'avatar';
        else if (type === 'poster') presetType = 'poster';

        const result = await uploadToCloudinary(req.file, presetType);

        res.status(200).json({
            success: true,
            data: {
                url: result.secure_url,
                public_id: result.public_id,
                duration: result.duration, // Cloudinary returns duration for audio/video
                format: result.format
            }
        });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ success: false, message: 'Upload failed', error: err.message });
    }
});

module.exports = router;
