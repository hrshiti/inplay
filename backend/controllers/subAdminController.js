const Admin = require('../models/Admin');

// @desc    Get all sub-admins
// @route   GET /api/admin/sub-admins
// @access  Private (Super Admin)
const getSubAdmins = async (req, res) => {
  try {
    const subAdmins = await Admin.find({ role: 'sub_admin' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: subAdmins.length,
      data: subAdmins
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new sub-admin
// @route   POST /api/admin/sub-admins
// @access  Private (Super Admin)
const createSubAdmin = async (req, res) => {
  try {
    const { name, email, password, permittedTabs = [], canDelete = false, isActive = true } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required'
      });
    }

    const existingAdmin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    const subAdmin = new Admin({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password.trim(),
      role: 'sub_admin',
      permittedTabs: Array.isArray(permittedTabs) ? permittedTabs : [],
      canDelete: Boolean(canDelete),
      isActive: Boolean(isActive)
    });

    await subAdmin.save();

    const subAdminObj = subAdmin.toObject();
    delete subAdminObj.password;

    res.status(201).json({
      success: true,
      message: 'Sub-admin created successfully',
      data: subAdminObj
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update sub-admin
// @route   PUT /api/admin/sub-admins/:id
// @access  Private (Super Admin)
const updateSubAdmin = async (req, res) => {
  try {
    const { name, email, password, permittedTabs, canDelete, isActive } = req.body;

    const subAdmin = await Admin.findById(req.params.id);
    if (!subAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Sub-admin account not found'
      });
    }

    if (name) subAdmin.name = name.trim();
    if (email) subAdmin.email = email.toLowerCase().trim();
    if (password && password.trim() !== '') subAdmin.password = password.trim();
    if (permittedTabs !== undefined) subAdmin.permittedTabs = Array.isArray(permittedTabs) ? permittedTabs : [];
    if (canDelete !== undefined) subAdmin.canDelete = Boolean(canDelete);
    if (isActive !== undefined) subAdmin.isActive = Boolean(isActive);

    await subAdmin.save();

    const subAdminObj = subAdmin.toObject();
    delete subAdminObj.password;

    res.status(200).json({
      success: true,
      message: 'Sub-admin updated successfully',
      data: subAdminObj
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete sub-admin
// @route   DELETE /api/admin/sub-admins/:id
// @access  Private (Super Admin)
const deleteSubAdmin = async (req, res) => {
  try {
    const subAdmin = await Admin.findById(req.params.id);
    if (!subAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Sub-admin account not found'
      });
    }

    if (subAdmin.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete Super Admin account'
      });
    }

    await Admin.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Sub-admin deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getSubAdmins,
  createSubAdmin,
  updateSubAdmin,
  deleteSubAdmin
};
