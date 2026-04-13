const User = require('../models/User');

// Get all users with filters and pagination
const getAllUsers = async (filters = {}, page = 1, limit = 10) => {
  const query = {};

  // Apply filters
  if (filters.role) query.role = filters.role;
  if (filters.isActive !== undefined) query.isActive = filters.isActive;

  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { email: { $regex: filters.search, $options: 'i' } }
    ];
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  const users = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await User.countDocuments(query);

  // Hydrate users
  const hydratedUsers = users.map(user => hydrateUser(user));

  return {
    users: hydratedUsers,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// Helper to hydrate users
const hydrateUser = (doc) => {
  if (!doc) return doc;
  const user = doc.toObject ? doc.toObject() : doc;
  const backendUrl = process.env.BACKEND_URL;
  if (user.avatar && user.avatar.startsWith('/')) {
    user.avatar = `${backendUrl}${user.avatar}`;
  }
  return user;
};

// Get user by ID
const getUserById = async (userId) => {
  const user = await User.findById(userId)
    .select('-password')
    .populate('myList', 'title type')
    .populate('downloads.content', 'title type');

  if (!user) {
    throw new Error('User not found');
  }

  return hydrateUser(user);
};

// Update user status
const updateUserStatus = async (userId, isActive) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  user.isActive = isActive;
  await user.save();

  return hydrateUser(user);
};

// Get user analytics
const getUserAnalytics = async () => {
  const analytics = await User.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        inactiveUsers: {
          $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
        },
        adminUsers: {
          $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
        }
      }
    }
  ]);

  // Get user registration stats for last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentUsers = await User.find({
    createdAt: { $gte: thirtyDaysAgo }
  }).countDocuments();

  return {
    ...(analytics[0] || {
      totalUsers: 0,
       activeUsers: 0,
       inactiveUsers: 0,
       adminUsers: 0
    }),
    recentUsers
  };
};


// Delete user (admin action)
const deleteUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  // Prevent deleting admin users
  if (user.role === 'admin') {
    throw new Error('Cannot delete admin users');
  }



  // Delete user's downloads
  const Download = require('../models/Download');
  await Download.deleteMany({ user: userId });

  // Delete user
  await User.findByIdAndDelete(userId);

  return { message: 'User deleted successfully' };
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  getUserAnalytics,
  deleteUser
};
