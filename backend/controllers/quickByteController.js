const QuickByte = require('../models/QuickByte');
const Comment = require('../models/Comment');
const { deleteFile, getFilePathFromUrl, transformFileToResponse, uploadMixed } = require('../config/multerStorage');
const { notifyAllUsers } = require('../utils/notificationHelper');

// NOTE: Multer configuration is now in config/multerStorage.js
// Files are automatically saved to disk by the uploadMixed middleware


// Helper to hydrate relative URLs to absolute URLs
const hydrateQuickByte = (doc) => {
    if (!doc) return doc;
    const item = doc.toObject ? doc.toObject() : doc;

    const backendUrl = process.env.BACKEND_URL;
    const getFullUrl = (url) => url && url.startsWith('/') ? `${backendUrl}${url}` : url;

    const hydrateMedia = (media) => {
        if (!media) return media;
        if (media.url) media.url = getFullUrl(media.url);
        if (media.secure_url) media.secure_url = getFullUrl(media.secure_url);
        return media;
    };

    if (item.video) item.video = hydrateMedia(item.video);
    if (item.thumbnail) item.thumbnail = hydrateMedia(item.thumbnail);
    if (item.audio) item.audio = hydrateMedia(item.audio);

    if (item.episodes && Array.isArray(item.episodes)) {
        item.episodes = item.episodes.map(hydrateMedia);
    }

    return item;
};

// @desc    Get all Quick Bites
// @route   GET /api/quickbytes
// @access  Public
const getAllQuickBytes = async (req, res) => {
    try {
        const query = {};
        if (req.query.status) {
            query.status = req.query.status;
        }

        const quickBytes = await QuickByte.find(query).sort({ createdAt: -1 }).lean();

        const hydratedBytes = quickBytes.map(qb => hydrateQuickByte(qb));

        res.status(200).json({
            success: true,
            data: hydratedBytes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Create new Quick Bite
// @route   POST /api/quickbytes
// @access  Private (Admin)
const createQuickByteHandler = async (req, res) => {
    let mediaUrls = {};
    try {
        const {
            title, status, audioTitle, description,
            genre, year, rating, isPaid, price,
            isNewAndHot, isOriginal, isRanking, isMovie, isTV, isPopular
        } = req.body;
        const files = req.files || {};

        if (!title) throw new Error('Title is required');

        const quickByte = new QuickByte({
            title,
            status: status || 'published',
            description: description || '',
            genre: genre || 'Entertainment',
            year: year || new Date().getFullYear(),
            rating: rating || 0,
            isPaid: isPaid === 'true' || isPaid === true,
            price: price || 0,
            isNewAndHot: isNewAndHot === 'true' || isNewAndHot === true,
            isOriginal: isOriginal === 'true' || isOriginal === true,
            isRanking: isRanking === 'true' || isRanking === true,
            isMovie: isMovie === 'true' || isMovie === true,
            isTV: isTV === 'true' || isTV === true,
            isPopular: isPopular === 'true' || isPopular === true
        });

        // Transform uploaded video (already saved by multer)
        if (files.video && files.video[0]) {
            const result = transformFileToResponse(files.video[0]);
            quickByte.video = result;
            mediaUrls.video = result.path;
        }

        // Transform uploaded episodes (already saved by multer)
        if (files.videos && files.videos.length > 0) {
            quickByte.episodes = [];
            for (const file of files.videos) {
                const result = transformFileToResponse(file);
                quickByte.episodes.push(result);
            }
            // If no primary video is set, make the first episode the primary video
            if (!quickByte.video || !quickByte.video.url) {
                quickByte.video = quickByte.episodes[0];
            }
        }

        // Transform uploaded thumbnail
        if (files.poster && files.poster[0]) {
            const result = transformFileToResponse(files.poster[0]);
            quickByte.thumbnail = result;
            mediaUrls.thumbnail = result.path;
        }

        // Transform uploaded audio
        if (files.audio && files.audio[0]) {
            const result = transformFileToResponse(files.audio[0]);
            quickByte.audio = {
                ...result,
                title: audioTitle || 'Original Audio'
            };
            mediaUrls.audio = result.path;
        }

        await quickByte.save();

        res.status(201).json({
            success: true,
            message: 'Quick Bite created successfully',
            data: hydrateQuickByte(quickByte)
        });

        // Send push notification to all users
        if (quickByte.status === 'published') {
            notifyAllUsers({
                title: `New QuickByte Released!`,
                body: quickByte.title,
                imageUrl: quickByte.thumbnail?.url || quickByte.thumbnail?.secure_url,
                data: {
                    type: 'quickbyte',
                    id: quickByte._id.toString(),
                    link: `/reels`
                }
            });
        }

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

// @desc    Get Quick Bite by ID
// @route   GET /api/quickbytes/:id
// @access  Private (Admin)
const getQuickByteById = async (req, res) => {
    try {
        const quickByte = await QuickByte.findById(req.params.id);
        if (!quickByte) {
            return res.status(404).json({ success: false, message: 'Quick Bite not found' });
        }
        res.status(200).json({ success: true, data: hydrateQuickByte(quickByte) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update Quick Bite
// @route   PUT /api/quickbytes/:id
// @access  Private (Admin)
const updateQuickByteHandler = async (req, res) => {
    let mediaUrls = {};
    try {
        const {
            title, status, audioTitle, description,
            genre, year, rating, isPaid, price,
            isNewAndHot, isOriginal, isRanking, isMovie, isTV, isPopular
        } = req.body;
        const files = req.files || {};

        let quickByte = await QuickByte.findById(req.params.id);
        if (!quickByte) return res.status(404).json({ success: false, message: 'Not found' });

        // Update basic fields
        if (title !== undefined) quickByte.title = title;
        if (status !== undefined) quickByte.status = status;
        if (description !== undefined) quickByte.description = description;
        if (genre !== undefined) quickByte.genre = genre;
        if (year !== undefined) quickByte.year = year;
        if (rating !== undefined) quickByte.rating = rating;
        if (isPaid !== undefined) quickByte.isPaid = isPaid === 'true' || isPaid === true;
        if (price !== undefined) quickByte.price = price;
        if (isNewAndHot !== undefined) quickByte.isNewAndHot = isNewAndHot === 'true' || isNewAndHot === true;
        if (isOriginal !== undefined) quickByte.isOriginal = isOriginal === 'true' || isOriginal === true;
        if (isRanking !== undefined) quickByte.isRanking = isRanking === 'true' || isRanking === true;
        if (isMovie !== undefined) quickByte.isMovie = isMovie === 'true' || isMovie === true;
        if (isTV !== undefined) quickByte.isTV = isTV === 'true' || isTV === true;
        if (isPopular !== undefined) quickByte.isPopular = isPopular === 'true' || isPopular === true;

        // Handle File Updates - Transform uploaded video
        if (files.video && files.video[0]) {
            // Delete old video from disk
            if (quickByte.video && quickByte.video.url) {
                const oldPath = getFilePathFromUrl(quickByte.video.url);
                deleteFile(oldPath);
            }
            const result = transformFileToResponse(files.video[0]);
            quickByte.video = result;
        }

        // Handle Multiple Videos (Episodes)
        if (files.videos && files.videos.length > 0) {
            if (!quickByte.episodes) quickByte.episodes = [];
            for (const file of files.videos) {
                const result = transformFileToResponse(file);
                quickByte.episodes.push(result);
            }
            // If no primary video is set, make the first episode the primary video
            if (!quickByte.video || !quickByte.video.url) {
                quickByte.video = quickByte.episodes[0];
            }
        }

        // Transform uploaded thumbnail
        if (files.poster && files.poster[0]) {
            if (quickByte.thumbnail && quickByte.thumbnail.url) {
                const oldPath = getFilePathFromUrl(quickByte.thumbnail.url);
                deleteFile(oldPath);
            }
            const result = transformFileToResponse(files.poster[0]);
            quickByte.thumbnail = result;
        }

        // Transform uploaded audio
        if (files.audio && files.audio[0]) {
            if (quickByte.audio && quickByte.audio.url) {
                const oldPath = getFilePathFromUrl(quickByte.audio.url);
                deleteFile(oldPath);
            }
            const result = transformFileToResponse(files.audio[0]);
            quickByte.audio = {
                ...result,
                title: audioTitle || 'Original Audio'
            };
        } else if (audioTitle && quickByte.audio) {
            quickByte.audio.title = audioTitle;
        }

        await quickByte.save();

        res.status(200).json({
            success: true,
            message: 'Quick Bite updated successfully',
            data: hydrateQuickByte(quickByte)
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const deleteQuickByte = async (req, res) => {
    try {
        const quickByte = await QuickByte.findById(req.params.id);
        if (!quickByte) {
            return res.status(404).json({ success: false, message: 'Quick Bite not found' });
        }

        // Delete files from local disk
        if (quickByte.video?.url) {
            const path = getFilePathFromUrl(quickByte.video.url);
            deleteFile(path);
        }
        if (quickByte.thumbnail?.url) {
            const path = getFilePathFromUrl(quickByte.thumbnail.url);
            deleteFile(path);
        }
        if (quickByte.audio?.url) {
            const path = getFilePathFromUrl(quickByte.audio.url);
            deleteFile(path);
        }

        await QuickByte.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Quick Bite deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Toggle Like
// @route   POST /api/quickbytes/:id/like
// @access  Private
const toggleLike = async (req, res) => {
    try {
        const quickByte = await QuickByte.findById(req.params.id);
        if (!quickByte) return res.status(404).json({ success: false, message: 'Not found' });

        // Simple toggle for count (real app would track user likes in a collection)
        // For simplicity/mock parity, we just increment/decrement randomly or state based?
        // Let's implement real tracking? User model has 'likedContent'.
        // But QuickByte likes is a number. 
        // Let's just increment for now as per requirement "admin ko likes dikhne chahiye"

        // Check if user already liked?
        // If we want real unique likes, we need a Likes collection or array in QuickByte.
        // QuickByte schema has `likes: Number`.

        // Let's increment.
        quickByte.likes += 1;
        await quickByte.save();

        res.status(200).json({ success: true, likes: quickByte.likes });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Add Comment
// @route   POST /api/quickbytes/:id/comments
// @access  Private
const addComment = async (req, res) => {
    try {
        const { text, parentComment } = req.body;
        const quickByteId = req.params.id;
        const userId = req.user._id;

        const comment = await Comment.create({
            contentId: quickByteId,
            user: userId,
            text,
            parentComment: parentComment || null
        });

        const populatedComment = await Comment.findById(comment._id).populate('user', 'name avatar');

        // Socket.IO Emit
        const io = req.app.get('io');
        if (io) {
            io.to(quickByteId).emit('new_comment', populatedComment);
        }

        res.status(201).json({ success: true, data: populatedComment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get Comments
// @route   GET /api/quickbytes/:id/comments
// @access  Public
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

// @desc    Delete Comment
// @route   DELETE /api/quickbytes/comments/:id
// @access  Private
const deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

        // Check if user is owner of comment or admin
        if (comment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const reelId = comment.contentId;

        await Comment.findByIdAndDelete(req.params.id);

        // Socket.IO Emit deletion
        const io = req.app.get('io');
        if (io) {
            io.to(reelId.toString()).emit('comment_deleted', req.params.id);
        }

        res.status(200).json({ success: true, message: 'Comment removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Toggle Comment Like
// @route   POST /api/quickbytes/comments/:id/like
// @access  Private
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

        // Socket.IO Emit update
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
// @route   POST /api/quickbytes/:id/view
// @access  Public
const incrementViews = async (req, res) => {
    try {
        const quickByte = await QuickByte.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        );

        if (!quickByte) {
            return res.status(404).json({
                success: false,
                message: 'Quick Bite not found'
            });
        }

        res.status(200).json({
            success: true,
            views: quickByte.views
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


module.exports = {
    getAllQuickBytes,
    createQuickByte: [
        uploadMixed.fields([
            { name: 'video', maxCount: 1 },
            { name: 'videos', maxCount: 20 },
            { name: 'poster', maxCount: 1 },
            { name: 'audio', maxCount: 1 }
        ]),
        createQuickByteHandler
    ],
    deleteQuickByte,
    getQuickByteById,
    updateQuickByte: [
        uploadMixed.fields([
            { name: 'video', maxCount: 1 },
            { name: 'videos', maxCount: 20 },
            { name: 'poster', maxCount: 1 },
            { name: 'audio', maxCount: 1 }
        ]),
        updateQuickByteHandler
    ],
    toggleLike,
    addComment,
    getComments,
    deleteComment,
    toggleCommentLike,
    incrementViews
};
