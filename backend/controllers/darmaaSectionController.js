const DarmaaSection = require('../models/DarmaaSection');
const QuickByte = require('../models/QuickByte');
const User = require('../models/User');

// @desc    Create a new Darmaa section
// @route   POST /api/admin/darmaa-sections
// @access  Private/Admin
const createSection = async (req, res) => {
  try {
    const { title, isActive, order, videos } = req.body;

    const section = new DarmaaSection({
      title,
      isActive,
      order: order || 0,
      videos: videos || [],
    });

    const createdSection = await section.save();
    
    // Populate videos for the response
    const populatedSection = await DarmaaSection.findById(createdSection._id).populate('videos');

    res.status(201).json({
      success: true,
      data: populatedSection
    });
  } catch (error) {
    console.error('Create Darmaa Section Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create section',
      error: error.message
    });
  }
};

// @desc    Get all Darmaa sections (Admin)
// @route   GET /api/admin/darmaa-sections
// @access  Private/Admin
const getAllSections = async (req, res) => {
  try {
    const sections = await DarmaaSection.find()
      .populate('videos')
      .sort({ order: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: sections.length,
      data: sections
    });
  } catch (error) {
    console.error('Get All Darmaa Sections Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sections',
      error: error.message
    });
  }
};

// @desc    Get active Darmaa sections (Public)
// @route   GET /api/public/darmaa-sections
// @access  Public
const getActiveSections = async (req, res) => {
  try {
    const sections = await DarmaaSection.find({ isActive: true })
      .populate('videos')
      .sort({ order: 1, createdAt: -1 })
      .lean();

    let isSubscribed = false;
    let freeEpisodesWatched = [];
    const userId = req.user?._id;
    if (userId) {
        const user = await User.findById(userId);
        if (user) {
            freeEpisodesWatched = user.freeEpisodesWatched || [];
            if (user.role === 'admin' || user.role === 'superadmin' || user.phone === '6268204871' || user.phone === '6268455485' || user.phone === '6260491554') {
                isSubscribed = true;
            } else if (user.subscription && user.subscription.isActive) {
                if (!user.subscription.endDate || new Date(user.subscription.endDate) >= new Date()) {
                    isSubscribed = true;
                }
            }
        }
    }

    const watchedMap = {};
    freeEpisodesWatched.forEach(item => {
        const cId = item.contentId?.toString();
        if (cId) {
            if (!watchedMap[cId]) {
                watchedMap[cId] = new Set();
            }
            watchedMap[cId].add(item.episodeIndex);
        }
    });

    let remainingPasses = 0; // unused after per-show refactor — kept for reference only

    const processedSections = sections.map(section => {
        if (section.videos && Array.isArray(section.videos)) {
            section.videos = section.videos.map(qb => {
                const isDarmaa = qb.targetCategory === 'Darmaa' || qb.targetCategory === 'Both';
                if (isDarmaa && !isSubscribed) {
                    const qbIdStr = qb._id?.toString();
                    if (qb.episodes && Array.isArray(qb.episodes)) {

                        // PER-SHOW free episode limit: count only episodes watched for THIS specific show
                        const watchedForThisShow = freeEpisodesWatched.filter(
                            item => item.contentId?.toString() === qbIdStr
                        ).length;
                        let remainingPasses = Math.max(0, 5 - watchedForThisShow);

                        qb.episodes = qb.episodes.map((ep, idx) => {
                            const isAlreadyWatched = watchedMap[qbIdStr] && watchedMap[qbIdStr].has(idx);

                            if (isAlreadyWatched) {
                                return { ...ep, isLocked: false };
                            } else {
                                if (remainingPasses > 0) {
                                    remainingPasses--;
                                    return { ...ep, isLocked: false };
                                } else {
                                    return {
                                        ...ep,
                                        isLocked: true,
                                        isPremium: true,
                                        url: '',
                                        secure_url: '',
                                        hls_url: '',
                                        video: ep.video ? {
                                            ...ep.video,
                                            url: '',
                                            secure_url: '',
                                            hls_url: ''
                                        } : null
                                    };
                                }
                            }
                        });

                        // Lock/redact primary video of the QuickByte if the first episode is locked
                        if (qb.episodes[0] && qb.episodes[0].isLocked) {
                            qb.isLocked = true;
                            qb.isPremium = true;
                            qb.video = qb.video ? {
                                ...qb.video,
                                url: '',
                                secure_url: '',
                                hls_url: ''
                            } : null;
                        }
                    }
                }
                return qb;
            });
        }
        return section;
    });
    
    res.status(200).json({
      success: true,
      data: processedSections
    });
  } catch (error) {
    console.error('Get Active Darmaa Sections Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active sections',
      error: error.message
    });
  }
};

// @desc    Update a Darmaa section
// @route   PUT /api/admin/darmaa-sections/:id
// @access  Private/Admin
const updateSection = async (req, res) => {
  try {
    const { title, isActive, order, videos } = req.body;

    let section = await DarmaaSection.findById(req.params.id);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    if (title !== undefined) section.title = title;
    if (isActive !== undefined) section.isActive = isActive;
    if (order !== undefined) section.order = order;
    if (videos !== undefined) section.videos = videos;

    await section.save();

    const updatedSection = await DarmaaSection.findById(req.params.id).populate('videos');

    res.status(200).json({
      success: true,
      data: updatedSection
    });
  } catch (error) {
    console.error('Update Darmaa Section Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update section',
      error: error.message
    });
  }
};

// @desc    Delete a Darmaa section
// @route   DELETE /api/admin/darmaa-sections/:id
// @access  Private/Admin
const deleteSection = async (req, res) => {
  try {
    const section = await DarmaaSection.findById(req.params.id);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    await DarmaaSection.deleteOne({ _id: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Section removed successfully'
    });
  } catch (error) {
    console.error('Delete Darmaa Section Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete section',
      error: error.message
    });
  }
};

module.exports = {
  createSection,
  getAllSections,
  getActiveSections,
  updateSection,
  deleteSection
};
