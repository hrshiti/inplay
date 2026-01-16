const User = require('../models/User');
const Content = require('../models/Content');
const QuickByte = require('../models/QuickByte');
const ForYou = require('../models/ForYou');
const { sendTokenResponse } = require('../middlewares/auth');

// Register new user
const registerUser = async (userData) => {
  const { name, email, phone, password } = userData;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { phone }]
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new Error('User with this email already exists');
    }
    if (existingUser.phone === phone) {
      throw new Error('User with this phone number already exists');
    }
  }

  // Create user
  const user = await User.create({
    name,
    email,
    phone,
    password
  });

  return user;
};

// Login user
const loginUser = async (email, password) => {
  // Find user and include password for comparison
  const user = await User.findOne({ email, role: 'user' }).select('+password');

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Check if account is active
  if (!user.isActive) {
    throw new Error('Account is deactivated. Please contact support.');
  }

  // Check password
  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    throw new Error('Invalid credentials');
  }

  return user;
};

// Get user profile
const getUserProfile = async (userId) => {
  try {
    const user = await User.findById(userId)
      .populate('subscription.plan', 'name price duration')
      .populate('downloads.content', 'title poster type');

    if (!user) {
      throw new Error('User not found');
    }

    // Convert to object for manipulation
    const userObj = user.toObject();

    // Manually populate myList and likedContent to support multiple content collections
    const resolveContentList = async (list) => {
      if (!list || !Array.isArray(list) || list.length === 0) return [];

      const [contentItems, quickByteItems, forYouItems] = await Promise.all([
        Content.find({ _id: { $in: list } }).select('title poster thumbnail type backdrop image video seasons').lean(),
        QuickByte.find({ _id: { $in: list } }).select('title video thumbnail type likes views').lean(),
        ForYou.find({ _id: { $in: list } }).select('title video thumbnail type likes views').lean()
      ]);

      const itemMap = new Map();
      contentItems.forEach(i => itemMap.set(i._id.toString(), { ...i, type: i.type || 'movie' }));
      quickByteItems.forEach(i => itemMap.set(i._id.toString(), { ...i, type: 'reel' }));
      forYouItems.forEach(i => itemMap.set(i._id.toString(), { ...i, type: 'reel' }));

      // Map back preserving original order and ensuring id is valid
      return list
        .filter(id => id && id.toString())
        .map(id => itemMap.get(id.toString()))
        .filter(Boolean);
    };

    userObj.myList = await resolveContentList(user.myList);
    userObj.likedContent = await resolveContentList(user.likedContent);

    // 3. Resolve watchHistory for Continue Watching and History
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const watchHistoryIds = user.watchHistory.map(entry => entry.content);
    const watchedContentMap = new Map();
    // Fetch all content details (including QuickBytes and ForYou if possible)
    const [contentMeta, quickByteMeta, forYouMeta] = await Promise.all([
      Content.find({ _id: { $in: watchHistoryIds } }).select('title poster thumbnail type backdrop image video seasons').lean(),
      QuickByte.find({ _id: { $in: watchHistoryIds } }).select('title video thumbnail type likes views').lean(),
      ForYou.find({ _id: { $in: watchHistoryIds } }).select('title video thumbnail type likes views').lean()
    ]);

    contentMeta.forEach(i => watchedContentMap.set(i._id.toString(), { ...i, type: i.type || 'movie' }));
    quickByteMeta.forEach(i => watchedContentMap.set(i._id.toString(), { ...i, type: 'reel' }));
    forYouMeta.forEach(i => watchedContentMap.set(i._id.toString(), { ...i, type: 'reel' }));

    const fullHistory = user.watchHistory.map(entry => {
      if (!entry.content) return null;
      const details = watchedContentMap.get(entry.content.toString());
      if (!details) return null;
      return {
        ...entry, // Contains watchedAt, progress, watchedSeconds, totalDuration, completed
        ...details,
        id: details._id,
        image: details.poster?.url || details.thumbnail?.url || details.image
      };
    }).filter(Boolean);

    // Sort history by most recent
    userObj.history = fullHistory.sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt));

    // Filter for Continue Watching (incomplete AND within last 7 days)
    userObj.continueWatching = userObj.history.filter(item =>
      !item.completed &&
      item.progress < 95 &&
      new Date(item.watchedAt) > sevenDaysAgo
    );

    // Filter out password from response just in case
    delete userObj.password;

    return userObj;
  } catch (error) {
    console.error('Error in getUserProfile service:', error);
    throw error;
  }
};

// Update user profile
const updateUserProfile = async (userId, updateData) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  // Prevent sensitive field updates
  const restrictedFields = ['password', 'email', 'role', 'subscription', 'isActive'];
  restrictedFields.forEach(field => delete updateData[field]);

  // Update user
  Object.assign(user, updateData);
  await user.save();

  return user;
};

// Change user password
const changeUserPassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');

  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  // Update password
  user.password = newPassword;
  await user.save();

  return { message: 'Password changed successfully' };
};

// Update user preferences
const updateUserPreferences = async (userId, preferences) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  user.preferences = { ...user.preferences, ...preferences };
  await user.save();

  return user.preferences;
};

// Add to user's my list
const addToMyList = async (userId, contentId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.myList.includes(contentId)) {
    user.myList.push(contentId);
    await user.save();
  }

  return user.myList;
};

// Remove from user's my list
const removeFromMyList = async (userId, contentId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  user.myList = user.myList.filter(id => id.toString() !== contentId.toString());
  await user.save();

  return user.myList;
};

// Get user's watch history
const getWatchHistory = async (userId, limit = 20) => {
  const user = await User.findById(userId)
    .populate('watchHistory.content', 'title poster type duration')
    .select('watchHistory');

  if (!user) {
    throw new Error('User not found');
  }

  // Sort by most recent
  const sortedHistory = user.watchHistory
    .sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt))
    .slice(0, limit);

  return sortedHistory;
};

// Update user avatar
const updateUserAvatar = async (userId, avatarUrl) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  user.avatar = avatarUrl;
  await user.save();

  return user;
};

// Logout user (client-side token removal)
const logoutUser = () => {
  return { message: 'User logged out successfully' };
};

// Toggle like
const toggleLike = async (userId, contentId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  // Initialize if undefined (migration safe)
  if (!user.likedContent) user.likedContent = [];

  const index = user.likedContent.findIndex(id => id.toString() === contentId.toString());

  let action = 'liked';
  let increment = 1;

  if (index === -1) {
    // Add like
    user.likedContent.push(contentId);
  } else {
    // Remove like (unlike)
    user.likedContent.splice(index, 1);
    action = 'unliked';
    increment = -1;
  }

  await user.save();

  // Update content likes count (Try ForYou first, then QuickByte, then Content)
  if (increment === 1) {
    let content = await ForYou.findByIdAndUpdate(contentId, { $inc: { likes: 1 } });
    if (!content) {
      content = await QuickByte.findByIdAndUpdate(contentId, { $inc: { likes: 1 } });
      if (!content) {
        await Content.findByIdAndUpdate(contentId, { $inc: { likes: 1 } });
      }
    }
  } else {
    let content = await ForYou.findOneAndUpdate({ _id: contentId, likes: { $gt: 0 } }, { $inc: { likes: -1 } });
    if (!content) {
      content = await QuickByte.findOneAndUpdate({ _id: contentId, likes: { $gt: 0 } }, { $inc: { likes: -1 } });
      if (!content) {
        await Content.findOneAndUpdate({ _id: contentId, likes: { $gt: 0 } }, { $inc: { likes: -1 } });
      }
    }
  }

  return { likedContent: user.likedContent, action };
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  updateUserAvatar,
  changeUserPassword,
  updateUserPreferences,
  addToMyList,
  removeFromMyList,
  getWatchHistory,
  logoutUser,
  toggleLike
};
