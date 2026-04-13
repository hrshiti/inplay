const User = require('../models/User');
const Content = require('../models/Content');
const QuickByte = require('../models/QuickByte');
const AudioSeries = require('../models/AudioSeries');
const ForYou = require('../models/ForYou');
const Promotion = require('../models/Promotion');
const Tab = require('../models/Tab');

// Get comprehensive dashboard analytics
const getDashboardAnalytics = async (startDate, endDate) => {
  // Set default date range (last 30 days)
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  // User analytics
  const userAnalytics = await getUserAnalytics(start, end);

  // Content analytics
  const contentAnalytics = await getContentAnalytics(start, end);

  // Quick Bites analytics
  const quickByteAnalytics = await getQuickByteAnalytics(start, end);

  // Audio Series analytics
  const audioSeriesAnalytics = await getAudioSeriesAnalytics(start, end);

  // For You analytics
  const forYouAnalytics = await getForYouAnalytics(start, end);

  // Promotion analytics
  const promotionAnalytics = await getPromotionAnalytics();

  // Tab analytics
  const tabAnalytics = await getTabAnalytics();

  // Recent activity
  const recentActivity = await getRecentActivity();

  // Calculate Global Total Views
  const globalTotalViews =
    (contentAnalytics.overview.totalViews || 0) +
    (quickByteAnalytics.totalViews || 0) +
    (audioSeriesAnalytics.totalViews || 0) +
    (forYouAnalytics.totalViews || 0);

  // Update content overview to reflect global total if that's what's displayed as "Total Views"
  contentAnalytics.overview.globalTotalViews = globalTotalViews;

  return {
    period: { start, end },
    users: userAnalytics,
    content: contentAnalytics,
    quickBites: quickByteAnalytics,
    audioSeries: audioSeriesAnalytics,
    forYou: forYouAnalytics,
    promotions: promotionAnalytics,
    tabs: tabAnalytics,
    recentActivity
  };
};

// User analytics
const getUserAnalytics = async (startDate, endDate) => {
  const userStats = await User.aggregate([
    {
      $facet: {
        totalStats: [
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              activeUsers: {
                $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
              }
            }
          }
        ],
        newUsers: [
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 }
            }
          }
        ],
        topGenres: [
          {
            $unwind: '$preferences.favoriteGenres'
          },
          {
            $group: {
              _id: '$preferences.favoriteGenres',
              count: { $sum: 1 }
            }
          },
          {
            $sort: { count: -1 }
          },
          {
            $limit: 5
          }
        ]
      }
    }
  ]);

  const stats = userStats[0];
  return {
    totalUsers: stats.totalStats[0]?.totalUsers || 0,
    activeUsers: stats.totalStats[0]?.activeUsers || 0,
    newUsers: stats.newUsers[0]?.count || 0,
    topGenres: stats.topGenres || []
  };
};

// Content analytics
const getContentAnalytics = async (startDate, endDate) => {
  const contentStats = await Content.aggregate([
    {
      $facet: {
        overview: [
          {
            $group: {
              _id: null,
              totalContent: { $sum: 1 },
              publishedContent: {
                $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
              },
              totalViews: { $sum: '$views' },
              totalLikes: { $sum: '$likes' },
              totalDownloads: { $sum: '$downloads' }
            }
          }
        ],
        byType: [
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 },
              views: { $sum: '$views' },
              likes: { $sum: '$likes' }
            }
          },
          {
            $sort: { count: -1 }
          }
        ],
        byCategory: [
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
              views: { $sum: '$views' }
            }
          },
          {
            $sort: { views: -1 }
          },
          {
            $limit: 10
          }
        ],
        recentUploads: [
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $sort: { createdAt: -1 }
          },
          {
            $limit: 5
          },
          {
            $project: {
              title: 1,
              type: 1,
              status: 1,
              createdAt: 1
            }
          }
        ]
      }
    }
  ]);

  const stats = contentStats[0];
  return {
    overview: stats.overview[0] || {
      totalContent: 0,
      publishedContent: 0,
      totalViews: 0,
      totalLikes: 0,
      totalDownloads: 0
    },
    byType: stats.byType || [],
    byCategory: stats.byCategory || [],
    recentUploads: stats.recentUploads || []
  };
};


// Quick Bites analytics
const getQuickByteAnalytics = async (startDate, endDate) => {
  const stats = await QuickByte.aggregate([
    {
      $facet: {
        total: [{ $count: 'count' }],
        views: [{ $group: { _id: null, totalViews: { $sum: '$views' } } }],
        published: [{ $match: { status: 'published' } }, { $count: 'count' }]
      }
    }
  ]);

  return {
    total: stats[0].total[0]?.count || 0,
    totalViews: stats[0].views[0]?.totalViews || 0,
    published: stats[0].published[0]?.count || 0
  };
};

// Audio Series analytics
const getAudioSeriesAnalytics = async (startDate, endDate) => {
  const stats = await AudioSeries.aggregate([
    {
      $facet: {
        total: [{ $count: 'count' }],
        views: [{ $group: { _id: null, totalViews: { $sum: '$totalViews' } } }],
        active: [{ $match: { isActive: true } }, { $count: 'count' }]
      }
    }
  ]);

  return {
    total: stats[0].total[0]?.count || 0,
    totalViews: stats[0].views[0]?.totalViews || 0,
    active: stats[0].active[0]?.count || 0
  };
};

// For You analytics
const getForYouAnalytics = async (startDate, endDate) => {
  const stats = await ForYou.aggregate([
    {
      $facet: {
        total: [{ $count: 'count' }],
        views: [{ $group: { _id: null, totalViews: { $sum: '$views' } } }],
        published: [{ $match: { status: 'published' } }, { $count: 'count' }]
      }
    }
  ]);

  return {
    total: stats[0].total[0]?.count || 0,
    totalViews: stats[0].views[0]?.totalViews || 0,
    published: stats[0].published[0]?.count || 0
  };
};

// Promotion analytics
const getPromotionAnalytics = async () => {
  const total = await Promotion.countDocuments();
  const active = await Promotion.countDocuments({ isActive: true });
  return { total, active };
};

// Tab analytics
const getTabAnalytics = async () => {
  const total = await Tab.countDocuments();
  const active = await Tab.countDocuments({ isActive: true });
  return { total, active };
};

// Recent activity
const getRecentActivity = async (limit = 10) => {
  const activities = [];

  // Recent user registrations
  const newUsers = await User.find({})
    .select('name email createdAt')
    .sort({ createdAt: -1 })
    .limit(limit); // Increased limit as we might filter some out

  newUsers.forEach(user => {
    activities.push({
      type: 'user_registration',
      message: `New user ${user.name} registered`,
      timestamp: user.createdAt,
      user: user.name
    });
  });

  // Payment activity removed as payments are no longer part of the app


  // Recent content uploads
  const recentContent = await Content.find({})
    .populate('createdBy', 'name')
    .select('title type status createdAt')
    .sort({ createdAt: -1 })
    .limit(limit);

  recentContent.forEach(content => {
    // Check if createdBy exists
    const creatorName = content.createdBy ? content.createdBy.name : 'System';
    activities.push({
      type: 'content_upload',
      message: `New ${content.type} "${content.title}" uploaded`,
      timestamp: content.createdAt,
      user: creatorName
    });
  });

  // Sort all activities by timestamp
  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return activities.slice(0, limit);
};

module.exports = {
  getDashboardAnalytics,
  getUserAnalytics,
  getContentAnalytics,
  getRecentActivity
};
