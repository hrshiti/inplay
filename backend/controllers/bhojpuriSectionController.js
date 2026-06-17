const BhojpuriSection = require('../models/BhojpuriSection');

// @desc    Create a new Bhojpuri section
// @route   POST /api/admin/bhojpuri-sections
// @access  Private/Admin
const createSection = async (req, res) => {
  try {
    const { title, isActive, order, videos } = req.body;

    const section = new BhojpuriSection({
      title,
      isActive,
      order: order || 0,
      videos: videos || [],
    });

    const createdSection = await section.save();
    
    // Populate videos for the response
    const populatedSection = await BhojpuriSection.findById(createdSection._id).populate('videos');

    res.status(201).json({
      success: true,
      data: populatedSection
    });
  } catch (error) {
    console.error('Create Bhojpuri Section Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create section',
      error: error.message
    });
  }
};

// @desc    Get all Bhojpuri sections (Admin)
// @route   GET /api/admin/bhojpuri-sections
// @access  Private/Admin
const getAllSections = async (req, res) => {
  try {
    const sections = await BhojpuriSection.find()
      .populate('videos')
      .sort({ order: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: sections.length,
      data: sections
    });
  } catch (error) {
    console.error('Get All Bhojpuri Sections Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sections',
      error: error.message
    });
  }
};

// @desc    Get active Bhojpuri sections (Public)
// @route   GET /api/public/bhojpuri-sections
// @access  Public
const getActiveSections = async (req, res) => {
  try {
    const sections = await BhojpuriSection.find({ isActive: true })
      .populate('videos')
      .sort({ order: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: sections
    });
  } catch (error) {
    console.error('Get Active Bhojpuri Sections Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active sections',
      error: error.message
    });
  }
};

// @desc    Update a Bhojpuri section
// @route   PUT /api/admin/bhojpuri-sections/:id
// @access  Private/Admin
const updateSection = async (req, res) => {
  try {
    const { title, isActive, order, videos } = req.body;

    let section = await BhojpuriSection.findById(req.params.id);

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

    const updatedSection = await BhojpuriSection.findById(req.params.id).populate('videos');

    res.status(200).json({
      success: true,
      data: updatedSection
    });
  } catch (error) {
    console.error('Update Bhojpuri Section Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update section',
      error: error.message
    });
  }
};

// @desc    Delete a Bhojpuri section
// @route   DELETE /api/admin/bhojpuri-sections/:id
// @access  Private/Admin
const deleteSection = async (req, res) => {
  try {
    const section = await BhojpuriSection.findById(req.params.id);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    await BhojpuriSection.deleteOne({ _id: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Section removed successfully'
    });
  } catch (error) {
    console.error('Delete Bhojpuri Section Error:', error);
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
