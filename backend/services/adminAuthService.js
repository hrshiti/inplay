const Admin = require('../models/Admin');
const { generateToken, sendTokenResponse } = require('../middlewares/auth');

const adminLogin = async (email, password) => {
  // Check if ANY admin exists in the system
  const adminExists = await Admin.findOne({});

  if (!adminExists) {
    // FIRST TIME: Act as registration
    // Create the first admin
    const firstAdmin = await Admin.create({
      name: 'InPlay Admin',
      email,
      password, // Password will be hashed by Admin model pre-save hook
      isActive: true
    });
    return firstAdmin;
  }

  // SUBSEQUENT TIMES: Act as login
  // Find the specific admin with this email
  const admin = await Admin.findOne({ email }).select('+password');

  if (!admin) {
    // If admin exists but not with this email
    throw new Error('Admin already available');
  }

  // Check if account is active
  if (!admin.isActive) {
    throw new Error('Account is deactivated');
  }

  // Check password
  const isPasswordMatch = await admin.comparePassword(password);
  if (!isPasswordMatch) {
    throw new Error('Invalid credentials');
  }

  return admin;
};

// Get admin profile
const getAdminProfile = async (adminId) => {
  const admin = await Admin.findById(adminId);

  if (!admin) {
    throw new Error('Admin not found');
  }

  return admin;
};

// Update admin profile
const updateAdminProfile = async (adminId, updateData) => {
  const admin = await Admin.findById(adminId);

  if (!admin) {
    throw new Error('Admin not found');
  }

  // Update admin
  Object.assign(admin, updateData);
  await admin.save();

  return admin;
};

// Change admin password
const changeAdminPassword = async (adminId, currentPassword, newPassword) => {
  const admin = await Admin.findById(adminId).select('+password');

  if (!admin) {
    throw new Error('Admin not found');
  }

  // Verify current password
  const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  // Update password
  admin.password = newPassword;
  await admin.save();

  return { message: 'Password changed successfully' };
};

// Logout admin (client-side token removal)
const adminLogout = () => {
  return { message: 'Admin logged out successfully' };
};

module.exports = {
  adminLogin,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  adminLogout
};
