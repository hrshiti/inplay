const DarmaaSection = require('../models/DarmaaSection');
const QuickByte = require('../models/QuickByte');

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
      .sort({ order: 1, createdAt: -1 });

    // Filter out sections that have no active videos if necessary,
    // assuming QuickByte itself has a status/isActive field if applicable.
    // We'll return them directly based on DarmaaSection.isActive
    
    res.status(200).json({
      success: true,
      data: sections
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
