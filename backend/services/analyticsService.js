const User = require('../models/User');
const Content = require('../models/Content');
const Payment = require('../models/Payment');
const SubscriptionPlan = require('../models/SubscriptionPlan');

// Get comprehensive dashboard analytics
const getDashboardAnalytics = async (startDate, endDate) => {
  // Set default date range (last 30 days)
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  // User analytics
  const userAnalytics = await getUserAnalytics(start, end);

  // Content analytics
  const contentAnalytics = await getContentAnalytics(start, end);

  // Revenue analytics
  const revenueAnalytics = await getRevenueAnalytics(start, end);

  // Subscription analytics
  const subscriptionAnalytics = await getSubscriptionAnalytics(start, end);

  // Recent activity
  const recentActivity = await getRecentActivity();

  return {
    period: { start, end },
    users: userAnalytics,
    content: contentAnalytics,
    revenue: revenueAnalytics,
    subscriptions: subscriptionAnalytics,
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
              },
              subscribedUsers: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$subscription.isActive', true] },
                        { $gt: ['$subscription.endDate', new Date()] }
                      ]
                    },
                    1,
                    0
                  ]
                }
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
    subscribedUsers: stats.totalStats[0]?.subscribedUsers || 0,
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
              totalDownloads: { $sum: '$downloads' },
              paidContent: {
                $sum: { $cond: [{ $eq: ['$isPaid', true] }, 1, 0] }
              }
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
      totalDownloads: 0,
      paidContent: 0
    },
    byType: stats.byType || [],
    byCategory: stats.byCategory || [],
    recentUploads: stats.recentUploads || []
  };
};

// Revenue analytics
const getRevenueAnalytics = async (startDate, endDate) => {
  const revenueStats = await Payment.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $facet: {
        overview: [
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$amount' },
              totalTransactions: { $sum: 1 },
              subscriptionRevenue: {
                $sum: { $cond: [{ $eq: ['$type', 'subscription'] }, '$amount', 0] }
              },
              contentRevenue: {
                $sum: { $cond: [{ $eq: ['$type', 'content_purchase'] }, '$amount', 0] }
              }
            }
          }
        ],
        dailyRevenue: [
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
              },
              revenue: { $sum: '$amount' },
              transactions: { $sum: 1 }
            }
          },
          {
            $sort: { '_id': 1 }
          },
          {
            $limit: 30
          }
        ],
        byPaymentMethod: [
          {
            $group: {
              _id: '$paymentMethod',
              revenue: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          },
          {
            $sort: { revenue: -1 }
          }
        ]
      }
    }
  ]);

  const stats = revenueStats[0];
  return {
    overview: stats.overview[0] || {
      totalRevenue: 0,
      totalTransactions: 0,
      subscriptionRevenue: 0,
      contentRevenue: 0
    },
    dailyRevenue: stats.dailyRevenue || [],
    byPaymentMethod: stats.byPaymentMethod || []
  };
};

// Subscription analytics
const getSubscriptionAnalytics = async (startDate, endDate) => {
  const subStats = await SubscriptionPlan.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: 'subscription.plan',
        as: 'subscribers'
      }
    },
    {
      $project: {
        name: 1,
        price: 1,
        subscriberCount: 1,
        revenue: 1,
        activeSubscribers: {
          $size: {
            $filter: {
              input: '$subscribers',
              cond: {
                $and: [
                  { $eq: ['$$this.subscription.isActive', true] },
                  { $gt: ['$$this.subscription.endDate', new Date()] }
                ]
              }
            }
          }
        }
      }
    },
    {
      $sort: { revenue: -1 }
    }
  ]);

  // Get churn rate and other metrics
  const churnStats = await User.aggregate([
    {
      $match: {
        'subscription.endDate': { $gte: startDate, $lte: endDate },
        'subscription.isActive': false
      }
    },
    {
      $group: {
        _id: null,
        churnedUsers: { $sum: 1 }
      }
    }
  ]);

  return {
    plans: subStats,
    churnRate: {
      churnedUsers: churnStats[0]?.churnedUsers || 0,
      period: { start: startDate, end: endDate }
    }
  };
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

  // Recent payments
  const recentPayments = await Payment.find({ status: 'completed' })
    .populate('user', 'name')
    .populate('content', 'title')
    .populate('subscriptionPlan', 'name')
    .select('type amount createdAt')
    .sort({ createdAt: -1 })
    .limit(limit);

  recentPayments.forEach(payment => {
    if (payment.user) {
      let message = '';
      if (payment.type === 'subscription' && payment.subscriptionPlan) {
        message = `${payment.user.name} subscribed to ${payment.subscriptionPlan.name}`;
      } else if (payment.type === 'content_purchase' && payment.content) {
        message = `${payment.user.name} purchased ${payment.content.title}`;
      } else {
        message = `${payment.user.name} made a payment of ₹${payment.amount}`;
      }

      activities.push({
        type: 'payment',
        message: message,
        timestamp: payment.createdAt,
        user: payment.user.name,
        amount: payment.amount
      });
    }
  });

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
  getRevenueAnalytics,
  getSubscriptionAnalytics,
  getRecentActivity
};
