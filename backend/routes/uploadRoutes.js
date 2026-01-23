const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const { uploadMixed, transformFileToResponse } = require('../config/multerStorage');

// @desc    Upload file (image, video, or audio)
// @route   POST /api/upload
// @access  Private/Admin
router.post('/', protect, authorize('admin'), uploadMixed.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Transform the uploaded file to match Cloudinary response format
        const result = transformFileToResponse(req.file);

        // Hydrate URL if local
        const backendUrl = process.env.BACKEND_URL;
        const finalUrl = result.secure_url && result.secure_url.startsWith('/')
            ? `${backendUrl}${result.secure_url}`
            : result.secure_url;

        res.status(200).json({
            success: true,
            data: {
                url: finalUrl,
                public_id: result.public_id,
                duration: result.duration,
                format: result.format,
                size: result.size
            }
        });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ success: false, message: 'Upload failed', error: err.message });
    }
});

module.exports = router;

