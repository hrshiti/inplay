// User roles
const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin'
};

// Content types
const CONTENT_TYPES = {
  MOVIE: 'movie',
  SERIES: 'series',
  REEL: 'reel'
};

// Content status
const CONTENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  UNPUBLISHED: 'unpublished',
  ARCHIVED: 'archived'
};

// Payment status
const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

// Payment types
const PAYMENT_TYPES = {
  SUBSCRIPTION: 'subscription',
  CONTENT_PURCHASE: 'content_purchase'
};

// Subscription duration
const SUBSCRIPTION_DURATION = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly'
};

// Video quality options
const VIDEO_QUALITY = {
  SD: 'SD',
  HD: 'HD',
  UHD: '4K'
};

// Content categories
const CONTENT_CATEGORIES = [
  'Movies',
  'TV Shows',
  'Anime',
  'Documentary',
  'Sports',
  'Kids',
  'Comedy',
  'Drama',
  'Action',
  'Thriller',
  'Horror',
  'Romance',
  'Sci-Fi',
  'Fantasy'
];

// Genres
const GENRES = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'Horror',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Thriller',
  'War',
  'Western',
  'Biography',
  'History',
  'Music',
  'Sport'
];

// Languages
const LANGUAGES = [
  'Hindi',
  'English',
  'Tamil',
  'Telugu',
  'Malayalam',
  'Kannada',
  'Bengali',
  'Marathi',
  'Gujarati',
  'Punjabi',
  'Urdu'
];

// Download expiry (in days)
const DOWNLOAD_EXPIRY_DAYS = 30;

// Stream expiry (in minutes)
const STREAM_EXPIRY_MINUTES = 60;

// Maximum file sizes
const FILE_SIZE_LIMITS = {
  POSTER: 5 * 1024 * 1024, // 5MB
  BACKDROP: 10 * 1024 * 1024, // 10MB
  VIDEO: 2048 * 1024 * 1024, // 2GB (Increased for 30 min videos)
  TRAILER: 50 * 1024 * 1024 // 50MB
};

module.exports = {
  USER_ROLES,
  CONTENT_TYPES,
  CONTENT_STATUS,
  PAYMENT_STATUS,
  PAYMENT_TYPES,
  SUBSCRIPTION_DURATION,
  VIDEO_QUALITY,
  CONTENT_CATEGORIES,
  GENRES,
  LANGUAGES,
  DOWNLOAD_EXPIRY_DAYS,
  STREAM_EXPIRY_MINUTES,
  FILE_SIZE_LIMITS
};
