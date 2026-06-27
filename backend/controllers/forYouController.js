const ForYou = require('../models/ForYou');
const Comment = require('../models/Comment');
const mediaService = require('../services/mediaService');
const { hydrateHlsUrl } = require('../utils/hlsUrl');
const { deleteFile, getFilePathFromUrl, transformFileToResponse, uploadMixed } = require('../config/multerStorage');

// NOTE: Multer configuration is now in config/multerStorage.js
// Files are automatically saved to disk by the uploadMixed middleware


// Helper to hydrate relative URLs to absolute URLs
const hydrateForYou = (doc) => {
    if (!doc) return doc;
    const item = doc.toObject ? doc.toObject() : doc;

    const backendUrl = process.env.BACKEND_URL;
    const getFullUrl = (url) => url && url.startsWith('/') ? `${backendUrl}${url}` : url;

    const hydrateMedia = (media) => {
        if (!media) return media;
        if (media.url) media.url = getFullUrl(media.url);
        if (media.secure_url) media.secure_url = getFullUrl(media.secure_url);
        if (media.hls_url) media.hls_url = hydrateHlsUrl(media.hls_url);
        return media;
    };

    if (item.video) item.video = hydrateMedia(item.video);
    if (item.thumbnail) item.thumbnail = hydrateMedia(item.thumbnail);
    if (item.audio) item.audio = hydrateMedia(item.audio);

    return item;
};

// @desc    Get all For You Reels
// @route   GET /api/foryou
// @access  Public
const getAllForYou = async (req, res) => {
    try {
        const query = {};
        if (req.query.status) {
            query.status = req.query.status;
        }

        const reels = await ForYou.find(query).sort({ createdAt: -1 }).lean();
        const hydratedReels = reels.map(reel => hydrateForYou(reel));

        res.status(200).json({
            success: true,
            data: hydratedReels
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

        // Determine intended status, force draft if video needs processing
        const intendedStatus = status || 'published';
        const forceDraft = files.video ? 'draft' : intendedStatus;

        const forYou = new ForYou({
            title,
            status: forceDraft,
            description: description || ''
        });

        // Transform uploaded video (already saved by multer)
        if (files.video && files.video[0]) {
            const result = transformFileToResponse(files.video[0]);
            forYou.video = result;
            mediaUrls.video = result.path;
        }

        // Transform uploaded thumbnail
        if (files.poster && files.poster[0]) {
            const result = transformFileToResponse(files.poster[0]);
            forYou.thumbnail = result;
            mediaUrls.thumbnail = result.path;
        }

        // Transform uploaded audio
        if (files.audio && files.audio[0]) {
            const result = transformFileToResponse(files.audio[0]);
            forYou.audio = {
                ...result,
                title: audioTitle || 'Original Audio'
            };
            mediaUrls.audio = result.path;
        }

        await forYou.save();

        // Async HLS Processing
        if (files.video && files.video[0]) {
            mediaService.handleVideoHLS(files.video[0].path, forYou._id, 'foryou').then(async (hlsUrl) => {
                if (hlsUrl) {
                    await ForYou.findByIdAndUpdate(forYou._id, { 'video.hls_url': hlsUrl, status: 'published' }).exec();
                    console.log(`HLS Master synced and Published for Reel: ${forYou.title}`);
                    
                    const { notifyAllUsers } = require('../utils/notificationHelper');
                    notifyAllUsers({
                        title: `New Reel Added in For You!`,
                        body: forYou.title,
                        imageUrl: forYou.thumbnail?.url || forYou.thumbnail?.secure_url,
                        data: {
                            type: 'foryou',
                            id: forYou._id.toString(),
                            link: `/for-you`
                        }
                    });
                }
            });
        } else if (forYou.status === 'published') {
            const { notifyAllUsers } = require('../utils/notificationHelper');
            notifyAllUsers({
                title: `New Reel Added in For You!`,
                body: forYou.title,
                imageUrl: forYou.thumbnail?.url || forYou.thumbnail?.secure_url,
                data: {
                    type: 'foryou',
                    id: forYou._id.toString(),
                    link: `/for-you`
                }
            });
        }

        res.status(201).json({
            success: true,
            message: 'Reel created successfully',
            data: hydrateForYou(forYou)
        });

    } catch (error) {
        // Cleanup uploaded files from disk
        if (mediaUrls.video) deleteFile(mediaUrls.video);
        if (mediaUrls.thumbnail) deleteFile(mediaUrls.thumbnail);
        if (mediaUrls.audio) deleteFile(mediaUrls.audio);

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

        // Delete files from local disk
        if (forYou.video?.url) {
            const path = getFilePathFromUrl(forYou.video.url);
            deleteFile(path);
        }
        if (forYou.thumbnail?.url) {
            const path = getFilePathFromUrl(forYou.thumbnail.url);
            deleteFile(path);
        }
        if (forYou.audio?.url) {
            const path = getFilePathFromUrl(forYou.audio.url);
            deleteFile(path);
        }

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

// @desc    Increment view count
// @route   POST /api/foryou/:id/view
// @access  Public
const incrementViews = async (req, res) => {
    try {
        const forYou = await ForYou.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        );

        if (!forYou) {
            return res.status(404).json({
                success: false,
                message: 'Reel not found'
            });
        }

        res.status(200).json({
            success: true,
            views: forYou.views
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const updateForYouHandler = async (req, res) => {
    try {
        const { title, status, audioTitle, description } = req.body;
        const files = req.files || {};
        const forYou = await ForYou.findById(req.params.id);

        if (!forYou) {
            return res.status(404).json({ success: false, message: 'Reel not found' });
        }

        if (title) forYou.title = title;
        if (status) forYou.status = status;
        if (description) forYou.description = description;

        // Update video
        if (files.video && files.video[0]) {
            // Delete old video from disk
            if (forYou.video?.url) {
                deleteFile(getFilePathFromUrl(forYou.video.url));
            }
            const result = transformFileToResponse(files.video[0]);
            forYou.video = result;

            // Trigger HLS Processing for new video
            mediaService.handleVideoHLS(files.video[0].path, forYou._id, 'foryou').then(hlsUrl => {
                if (hlsUrl) {
                    ForYou.findByIdAndUpdate(forYou._id, { 'video.hls_url': hlsUrl }).exec();
                }
            });
        }

        // Update poster
        if (files.poster && files.poster[0]) {
            if (forYou.thumbnail?.url) {
                deleteFile(getFilePathFromUrl(forYou.thumbnail.url));
            }
            forYou.thumbnail = transformFileToResponse(files.poster[0]);
        }

        // Update audio
        if (files.audio && files.audio[0]) {
            if (forYou.audio?.url) {
                deleteFile(getFilePathFromUrl(forYou.audio.url));
            }
            const result = transformFileToResponse(files.audio[0]);
            forYou.audio = {
                ...result,
                title: audioTitle || forYou.audio?.title || 'Original Audio'
            };
        } else if (audioTitle && forYou.audio) {
            forYou.audio.title = audioTitle;
        }

        await forYou.save();

        res.status(200).json({
            success: true,
            message: 'Reel updated successfully',
            data: hydrateForYou(forYou)
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getAllForYou,
    createForYou: [
        uploadMixed.fields([
            { name: 'video', maxCount: 1 },
            { name: 'poster', maxCount: 1 },
            { name: 'audio', maxCount: 1 }
        ]),
        createForYouHandler
    ],
    addComment,
    getComments,
    deleteComment,
    toggleCommentLike,
    incrementViews,
    deleteForYou,
    toggleLike,
    updateForYou: [
        uploadMixed.fields([
            { name: 'video', maxCount: 1 },
            { name: 'poster', maxCount: 1 },
            { name: 'audio', maxCount: 1 }
        ]),
        updateForYouHandler
    ]
};
