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

// Helper to hydrate content items (Content, QuickByte, ForYou)
const hydrateContentItem = (item) => {
  if (!item) return item;
  const backendUrl = process.env.BACKEND_URL;
  const getFullUrl = (url) => url && url.startsWith('/') ? `${backendUrl}${url}` : url;

  const hydrateMedia = (media) => {
    if (!media) return media;
    if (media.url) media.url = getFullUrl(media.url);
    if (media.secure_url) media.secure_url = getFullUrl(media.secure_url);
    return media;
  };

  if (item.poster) item.poster = hydrateMedia(item.poster);
  if (item.backdrop) item.backdrop = hydrateMedia(item.backdrop);
  if (item.video) item.video = hydrateMedia(item.video);
  if (item.thumbnail) item.thumbnail = hydrateMedia(item.thumbnail);
  if (item.coverImage && item.coverImage.startsWith('/')) item.coverImage = getFullUrl(item.coverImage); // For audio series
  if (item.image && typeof item.image === 'string' && item.image.startsWith('/')) item.image = getFullUrl(item.image);

  // Handle seasons/episodes if present (full content object)
  if (item.seasons && Array.isArray(item.seasons)) {
    item.seasons.forEach(season => {
      if (season.episodes && Array.isArray(season.episodes)) {
        season.episodes.forEach(episode => {
          if (episode.video) episode.video = hydrateMedia(episode.video);
          if (episode.thumbnail) episode.thumbnail = hydrateMedia(episode.thumbnail);
        });
      }
    });
  }

  return item;
};

// Start getUserProfile
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

    // Hydrate everything in userObj
    if (userObj.avatar && userObj.avatar.startsWith('/')) {
      const backendUrl = process.env.BACKEND_URL;
      userObj.avatar = `${backendUrl}${userObj.avatar}`;
    }

    if (userObj.myList && Array.isArray(userObj.myList)) {
      userObj.myList = userObj.myList.map(hydrateContentItem);
    }

    if (userObj.likedContent && Array.isArray(userObj.likedContent)) {
      userObj.likedContent = userObj.likedContent.map(hydrateContentItem);
    }

    if (userObj.history && Array.isArray(userObj.history)) {
      userObj.history = userObj.history.map(item => {
        // Hydrate the content details merged into history item
        return hydrateContentItem(item);
      });
    }

    if (userObj.continueWatching && Array.isArray(userObj.continueWatching)) {
      userObj.continueWatching = userObj.continueWatching.map(hydrateContentItem);
    }

    // Check downloads
    if (userObj.downloads && Array.isArray(userObj.downloads)) {
      // Downloads content is populated but might need hydration if it was relative
      // But downloads usually store snapshot. Snapshot was generated with absolute URLs in downloadService? 
      // Yes, we updated downloadService to save absolute URLs.
      // But let's be safe if population is used directly from Content model.
      // Line 64: .populate('downloads.content', 'title poster type');
      // If populated from Content, it has relative paths!
      // We need to hydrate `downloads.content`.
      userObj.downloads.forEach(d => {
        if (d.content) hydrateContentItem(d.content);
      });
    }

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

  // Hydrate avatar if returning
  const userObj = user.toObject();
  if (userObj.avatar && userObj.avatar.startsWith('/')) {
    const backendUrl = process.env.BACKEND_URL;
    userObj.avatar = `${backendUrl}${userObj.avatar}`;
  }
  return userObj;
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

  const userObj = user.toObject();
  if (userObj.avatar && userObj.avatar.startsWith('/')) {
    const backendUrl = process.env.BACKEND_URL;
    userObj.avatar = `${backendUrl}${userObj.avatar}`;
  }
  return userObj;
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
