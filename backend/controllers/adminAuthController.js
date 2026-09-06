const { validationResult } = require('express-validator');
const adminAuthService = require('../services/adminAuthService');
const { sendTokenResponse } = require('../middlewares/auth');

// @desc    Admin login
// @route   POST /api/admin/auth/login
// @access  Public
const adminLogin = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Login admin
    const admin = await adminAuthService.adminLogin(email, password);

    // Send token response
    await sendTokenResponse(admin, 200, res, 'Admin logged in successfully');
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current admin profile
// @route   GET /api/admin/auth/profile
// @access  Private (Admin only)
const getAdminProfile = async (req, res) => {
  try {
    const admin = await adminAuthService.getAdminProfile(req.user._id);

    res.status(200).json({
      success: true,
      data: admin
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update admin profile
// @route   PUT /api/admin/auth/profile
// @access  Private (Admin only)
const updateAdminProfile = async (req, res) => {
  try {
    const updateData = req.body;

    const admin = await adminAuthService.updateAdminProfile(req.user._id, updateData);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: admin
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Change admin password
// @route   PUT /api/admin/auth/change-password
// @access  Private (Admin only)
const changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const result = await adminAuthService.changeAdminPassword(
      req.user._id,
      currentPassword,
      newPassword
    );

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Admin logout
// @route   POST /api/admin/auth/logout
// @access  Private (Admin only)
const adminLogout = async (req, res) => {
  try {
    const result = adminAuthService.adminLogout();

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get or generate today's daily access code (Super Admin only)
// @route   GET /api/admin/auth/daily-code
// @access  Private (Super Admin)
const getDailyCode = async (req, res) => {
  try {
    const DailyAccessCode = require('../models/DailyAccessCode');
    const todayStr = new Date().toISOString().split('T')[0];

    let accessDoc = await DailyAccessCode.findOne({ date: todayStr });
    if (!accessDoc) {
      const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
      accessDoc = await DailyAccessCode.create({
        date: todayStr,
        code: randomCode,
        generatedBy: req.user._id
      });
    }

    res.status(200).json({
      success: true,
      date: todayStr,
      code: accessDoc.code
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Verify today's daily access code (Sub Admin)
// @route   POST /api/admin/auth/verify-daily-code
// @access  Private
const verifyDailyCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Daily access code is required'
      });
    }

    const DailyAccessCode = require('../models/DailyAccessCode');
    const Admin = require('../models/Admin');
    const todayStr = new Date().toISOString().split('T')[0];

    let accessDoc = await DailyAccessCode.findOne({ date: todayStr });
    if (!accessDoc) {
      // Auto generate if super admin hasn't visited page yet
      const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
      accessDoc = await DailyAccessCode.create({
        date: todayStr,
        code: randomCode
      });
    }

    if (accessDoc.code !== String(code).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid access code. Please get today\'s code from Super Admin.'
      });
    }

    await Admin.findByIdAndUpdate(req.user._id, {
      'dailyVerification.lastVerifiedDate': todayStr
    });

    res.status(200).json({
      success: true,
      message: 'Daily access code verified successfully!',
      date: todayStr
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  adminLogin,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  adminLogout,
  getDailyCode,
  verifyDailyCode
};
