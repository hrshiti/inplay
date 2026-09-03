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

// Update user subscription plan (Admin 1-click assignment)
const updateUserSubscription = async (userId, subscriptionData) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const { planId, isActive, endDate: customEndDate } = subscriptionData;
  const CustomerSubscription = require('../models/CustomerSubscription');
  const SubscriptionPlan = require('../models/SubscriptionPlan');

  if (!planId || planId === '' || isActive === false) {
    user.subscription = {
      isActive: false,
      status: 'cancelled',
      paymentMethod: 'none',
      plan: null
    };
    await user.save();
    return hydrateUser(user);
  }

  let planDoc = null;
  if (planId) {
    planDoc = await SubscriptionPlan.findById(planId);
  }

  let finalEndDate = customEndDate ? new Date(customEndDate) : null;

  if (!finalEndDate || isNaN(finalEndDate.getTime())) {
    const duration = planDoc?.duration?.toLowerCase() || '';
    const now = new Date();

    if (duration === 'lifetime' || planDoc?.razorpayPlanId === 'LIFETIME_PLAN') {
      finalEndDate = new Date('2099-12-31T23:59:59.000Z');
    } else if (duration === 'yearly') {
      finalEndDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    } else if (duration === 'half-yearly' || duration === 'quarterly') {
      finalEndDate = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
    } else {
      finalEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  user.subscription = {
    isActive: true,
    status: 'active',
    plan: planId,
    endDate: finalEndDate,
    startDate: new Date(),
    paymentMethod: 'admin_manual'
  };

  await user.save();

  try {
    let custSub = await CustomerSubscription.findOne({ user: user._id });
    if (!custSub) {
      await CustomerSubscription.create({
        user: user._id,
        plan: planId,
        razorpaySubscriptionId: 'ADMIN_MANUAL',
        status: 'active',
        price: planDoc?.price || 0,
        startDate: new Date(),
        endDate: finalEndDate
      });
    } else {
      custSub.status = 'active';
      custSub.plan = planId;
      custSub.endDate = finalEndDate;
      await custSub.save();
    }
  } catch (e) {
    console.error('CustomerSubscription sync error:', e.message);
  }

  return hydrateUser(user);
};

// Create new user (Admin action)
const createUser = async (userData) => {
  const { name, email, phone, password, planId, role = 'user', isActive = true } = userData;

  if (!phone || phone.trim() === '') {
    throw new Error('Phone number is required');
  }

  const trimmedPhone = phone.trim();

  // Check if phone or email already exists
  const existingPhone = await User.findOne({ phone: trimmedPhone });
  if (existingPhone) {
    throw new Error(`User with phone number ${trimmedPhone} already exists`);
  }

  const userEmail = email && email.trim() !== '' ? email.trim() : `user_${trimmedPhone}@inplay.com`;
  const existingEmail = await User.findOne({ email: userEmail });
  if (existingEmail) {
    throw new Error(`User with email ${userEmail} already exists`);
  }

  const userName = name && name.trim() !== '' ? name.trim() : `User_${trimmedPhone.slice(-4)}`;
  const userPassword = password && password.trim() !== '' ? password.trim() : 'InPlay@123';

  // Create base user doc
  const user = new User({
    name: userName,
    email: userEmail,
    phone: trimmedPhone,
    password: userPassword,
    role: role || 'user',
    isActive: isActive !== undefined ? Boolean(isActive) : true,
    subscription: {
      isActive: false,
      status: 'none',
      paymentMethod: 'none',
      plan: null
    }
  });

  // Handle Subscription Plan if selected
  if (planId && planId !== '') {
    const SubscriptionPlan = require('../models/SubscriptionPlan');
    const CustomerSubscription = require('../models/CustomerSubscription');

    const planDoc = await SubscriptionPlan.findById(planId);
    let finalEndDate = new Date();
    const duration = planDoc?.duration?.toLowerCase() || '';

    if (duration === 'lifetime' || planDoc?.razorpayPlanId === 'LIFETIME_PLAN') {
      finalEndDate = new Date('2099-12-31T23:59:59.000Z');
    } else if (duration === 'yearly') {
      finalEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    } else if (duration === 'half-yearly' || duration === 'quarterly') {
      finalEndDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    } else {
      finalEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    user.subscription = {
      isActive: true,
      status: 'active',
      plan: planId,
      endDate: finalEndDate,
      startDate: new Date(),
      paymentMethod: 'admin_manual'
    };

    await user.save();

    try {
      await CustomerSubscription.create({
        user: user._id,
        plan: planId,
        razorpaySubscriptionId: 'ADMIN_MANUAL',
        status: 'active',
        price: planDoc?.price || 0,
        startDate: new Date(),
        endDate: finalEndDate
      });
    } catch (e) {
      console.error('CustomerSubscription creation error:', e.message);
    }
  } else {
    await user.save();
  }

  return hydrateUser(user);
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUserStatus,
  updateUserSubscription,
  getUserAnalytics,
  deleteUser
};


