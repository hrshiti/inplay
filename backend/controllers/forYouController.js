const ForYou = require('../models/ForYou');
const Comment = require('../models/Comment');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max
    },
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype.startsWith('image/') ||
            file.mimetype.startsWith('video/') ||
            file.mimetype.startsWith('audio/')
        ) {
            cb(null, true);
        } else {
            cb(new Error('Only image, video, and audio files are allowed'));
        }
    }
});

// @desc    Get all For You Reels
// @route   GET /api/foryou
// @access  Public
const getAllForYou = async (req, res) => {
    try {
        const query = {};
        if (req.query.status) {
            query.status = req.query.status;
        }

        const reels = await ForYou.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: reels
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Create new For You Reel
// @route   POST /api/foryou
// @access  Private (Admin)
const createForYouHandler = async (req, res) => {
    let mediaUrls = {};
    try {
        const { title, status, audioTitle, description } = req.body;
        const files = req.files || {};

        if (!title) throw new Error('Title is required');

        const forYou = new ForYou({
            title,
            status: status || 'published',
            description: description || ''
        });

        // Upload Video
        if (files.video && files.video[0]) {
            const result = await uploadToCloudinary(files.video[0], 'reel');
            forYou.video = result;
            mediaUrls.video = result.public_id;
        }

        // Upload Thumbnail
        if (files.poster && files.poster[0]) {
            const result = await uploadToCloudinary(files.poster[0], 'poster');
            forYou.thumbnail = result;
            mediaUrls.thumbnail = result.public_id;
        }

        // Upload Audio
        if (files.audio && files.audio[0]) {
            const result = await uploadToCloudinary(files.audio[0], 'video');
            forYou.audio = {
                ...result,
                title: audioTitle || 'Original Audio'
            };
            mediaUrls.audio = result.public_id;
        }

        await forYou.save();

        res.status(201).json({
            success: true,
            message: 'Reel created successfully',
            data: forYou
        });

    } catch (error) {
        // Cleanup
        if (mediaUrls.video) await deleteFromCloudinary(mediaUrls.video, 'video');
        if (mediaUrls.thumbnail) await deleteFromCloudinary(mediaUrls.thumbnail, 'image');
        if (mediaUrls.audio) await deleteFromCloudinary(mediaUrls.audio, 'video');

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const deleteForYou = async (req, res) => {
    try {
        const forYou = await ForYou.findById(req.params.id);
        if (!forYou) {
            return res.status(404).json({ success: false, message: 'Reel not found' });
        }

        if (forYou.video?.public_id) await deleteFromCloudinary(forYou.video.public_id, 'video');
        if (forYou.thumbnail?.public_id) await deleteFromCloudinary(forYou.thumbnail.public_id, 'image');
        if (forYou.audio?.public_id) await deleteFromCloudinary(forYou.audio.public_id, 'video');

        await ForYou.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Reel deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const toggleLike = async (req, res) => {
    try {
        const forYou = await ForYou.findById(req.params.id);
        if (!forYou) return res.status(404).json({ success: false, message: 'Not found' });

        forYou.likes += 1;
        await forYou.save();

        res.status(200).json({ success: true, likes: forYou.likes });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// COMMENT LOGIC
const addComment = async (req, res) => {
    try {
        const { text, parentComment } = req.body;
        const forYouId = req.params.id;
        const userId = req.user._id;

        const comment = await Comment.create({
            contentId: forYouId,
            user: userId,
            text,
            parentComment: parentComment || null
        });

        const populatedComment = await Comment.findById(comment._id).populate('user', 'name avatar');

        const io = req.app.get('io');
        if (io) {
            io.to(forYouId).emit('new_comment', populatedComment);
        }

        res.status(201).json({ success: true, data: populatedComment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getComments = async (req, res) => {
    try {
        const comments = await Comment.find({ contentId: req.params.id })
            .populate('user', 'name avatar')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: comments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

        if (comment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const forYouId = comment.contentId;
        await Comment.findByIdAndDelete(req.params.id);

        const io = req.app.get('io');
        if (io) {
            io.to(forYouId.toString()).emit('comment_deleted', req.params.id);
        }

        res.status(200).json({ success: true, message: 'Comment removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const toggleCommentLike = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

        const userId = req.user._id;
        const index = comment.likes.indexOf(userId);

        if (index === -1) {
            comment.likes.push(userId);
        } else {
            comment.likes.splice(index, 1);
        }

        await comment.save();

        const io = req.app.get('io');
        if (io) {
            io.to(comment.contentId.toString()).emit('comment_like_updated', {
                commentId: comment._id,
                likes: comment.likes,
                userId: userId
            });
        }

        res.status(200).json({ success: true, data: comment.likes });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAllForYou,
    createForYou: [
        upload.fields([
            { name: 'video', maxCount: 1 },
            { name: 'poster', maxCount: 1 },
            { name: 'audio', maxCount: 1 }
        ]),
        createForYouHandler
    ],
    deleteForYou,
    toggleLike,
    addComment,
    getComments,
    deleteComment,
    toggleCommentLike
};
