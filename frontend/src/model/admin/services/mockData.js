// Centralized Mock Data for Admin Panel
// Using same structure as User Panel

export const ADMIN_MOVIES = [
  {
    id: 1,
    title: "The Batman",
    image: "https://placehold.co/300x450/1a1a1a/ffffff?text=Batman",
    backdrop: "https://placehold.co/800x400/1a1a1a/ffffff?text=Batman+Backdrop",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    rating: 7.7,
    year: 2022,
    genre: "Crime",
    description: "In his second year of fighting crime, Batman uncovers corruption in Gotham City that connects to his own family while facing a serial killer known as the Riddler.",
    isPaid: true,
    price: 199,
    status: "published",
    views: 125000,
    likes: 8500,
    addedDate: "2024-01-15",
    isNewAndHot: true,
    isMovie: true
  },
  {
    id: 2,
    title: "Top Gun: Maverick",
    image: "https://placehold.co/300x450/2c3e50/ffffff?text=Top+Gun",
    backdrop: "https://placehold.co/800x400/2c3e50/ffffff?text=Top+Gun+Backdrop",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    rating: 8.4,
    year: 2022,
    genre: "Action",
    description: "After more than thirty years of service as one of the Navy's top aviators, Pete 'Maverick' Mitchell finds himself training a detachment of TOP GUN graduates for a specialized mission.",
    isPaid: false,
    status: "published",
    views: 250000,
    likes: 15000,
    addedDate: "2024-01-10",
    isRanking: true,
    isMovie: true,
    isPopular: true
  },
  {
    id: 3,
    title: "Spider-Man: No Way Home",
    image: "https://placehold.co/300x450/e74c3c/ffffff?text=Spider-Man",
    backdrop: "https://placehold.co/800x400/e74c3c/ffffff?text=Spider-Man+Backdrop",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    rating: 8.0,
    year: 2021,
    genre: "Action",
    description: "Peter Parker is unmasked and no longer able to separate his normal life from the high-stakes of being a super-hero. When he asks for help from Doctor Strange the stakes become even more dangerous.",
    isPaid: true,
    price: 249,
    status: "published",
    views: 300000,
    likes: 22000,
    addedDate: "2024-01-08",
    isNewAndHot: true,
    isMovie: true
  }
];

export const ADMIN_SERIES = [
  {
    id: 's1',
    title: "Mirzapur",
    image: "https://placehold.co/300x450/27ae60/ffffff?text=Mirzapur",
    rating: 8.5,
    year: 2018,
    genre: "Crime",
    description: "A shocking incident at a wedding procession ignites a series of events entangling the lives of two families in the lawless city of Mirzapur.",
    isPaid: true,
    price: 299,
    type: 'series',
    status: "published",
    totalSeasons: 3,
    totalEpisodes: 29,
    views: 180000,
    subscribers: 45000,
    addedDate: "2024-01-12",
    isOriginal: true,
    isTV: true
  },
  {
    id: 's2',
    title: "The Family Man",
    image: "https://placehold.co/300x450/3498db/ffffff?text=Family+Man",
    rating: 8.8,
    year: 2019,
    genre: "Action",
    description: "A working man from the National Investigation Agency tries to protect the nation from terrorism.",
    type: 'series',
    status: "published",
    totalSeasons: 2,
    totalEpisodes: 20,
    views: 220000,
    subscribers: 52000,
    addedDate: "2024-01-14",
    isOriginal: true,
    isTV: true,
    isPopular: true
  }
];

export const ADMIN_REELS = [
  {
    id: 'r1',
    title: "Pathaan",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    thumbnail: "https://placehold.co/300x533/1a1a1a/ffffff?text=Pathaan",
    duration: "00:45",
    views: 1250000,
    likes: 85000,
    comments: 4500,
    status: "published",
    createdDate: "2024-01-20"
  },
  {
    id: 'r2',
    title: "Drishyam 2",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnail: "https://placehold.co/300x533/2c3e50/ffffff?text=Drishyam+2",
    duration: "01:15",
    views: 950000,
    likes: 51000,
    comments: 7200,
    status: "published",
    createdDate: "2024-01-19"
  },
  {
    id: 'r3',
    title: "Kantara",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnail: "https://placehold.co/300x533/e74c3c/ffffff?text=Kantara",
    duration: "00:55",
    views: 850000,
    likes: 42000,
    comments: 3100,
    status: "published",
    createdDate: "2024-01-18"
  },
  {
    id: 'r4',
    title: "RRR",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    thumbnail: "https://placehold.co/300x533/27ae60/ffffff?text=RRR",
    duration: "01:05",
    views: 2500000,
    likes: 150000,
    comments: 12000,
    status: "published",
    createdDate: "2024-01-17"
  }
];

export const ADMIN_USERS = [
  {
    id: 1,
    name: "Rahul Sharma",
    email: "rahul.sharma@email.com",
    avatar: "https://placehold.co/100x100/3498db/ffffff?text=RS",
    plan: "Premium",
    status: "active",
    joinDate: "2024-01-15",
    lastLogin: "2024-01-20",
    totalWatchTime: 45, // hours
    favoriteGenre: "Action",
    subscriptionExpiry: "2024-02-15",
    paymentMethod: "Credit Card"
  },
  {
    id: 2,
    name: "Priya Patel",
    email: "priya.patel@email.com",
    avatar: "https://placehold.co/100x100/e74c3c/ffffff?text=PP",
    plan: "Basic",
    status: "active",
    joinDate: "2024-01-10",
    lastLogin: "2024-01-19",
    totalWatchTime: 28,
    favoriteGenre: "Drama",
    subscriptionExpiry: "2024-02-10",
    paymentMethod: "UPI"
  },
  {
    id: 3,
    name: "Amit Kumar",
    email: "amit.kumar@email.com",
    avatar: "https://placehold.co/100x100/27ae60/ffffff?text=AK",
    plan: "VIP",
    status: "inactive",
    joinDate: "2023-12-20",
    lastLogin: "2024-01-05",
    totalWatchTime: 120,
    favoriteGenre: "Thriller",
    subscriptionExpiry: "2024-01-20",
    paymentMethod: "Debit Card"
  },
  {
    id: 4,
    name: "Sneha Gupta",
    email: "sneha.gupta@email.com",
    avatar: "https://placehold.co/100x100/9b59b6/ffffff?text=SG",
    plan: "Premium",
    status: "active",
    joinDate: "2024-01-18",
    lastLogin: "2024-01-20",
    totalWatchTime: 15,
    favoriteGenre: "Romance",
    subscriptionExpiry: "2024-02-18",
    paymentMethod: "Net Banking"
  }
];

export const ADMIN_SUBSCRIPTIONS = [
  {
    id: 1,
    name: "Basic",
    price: 199,
    currency: "INR",
    duration: "monthly",
    features: ["HD Quality", "1 Device", "Limited Downloads"],
    maxDevices: 1,
    maxDownloads: 10,
    status: "active",
    subscriberCount: 1250,
    revenue: 248750
  },
  {
    id: 2,
    name: "Premium",
    price: 399,
    currency: "INR",
    duration: "monthly",
    features: ["4K Quality", "4 Devices", "Unlimited Downloads", "Offline Viewing"],
    maxDevices: 4,
    maxDownloads: -1, // unlimited
    status: "active",
    subscriberCount: 2150,
    revenue: 858850
  },
  {
    id: 3,
    name: "VIP",
    price: 599,
    currency: "INR",
    duration: "monthly",
    features: ["4K Quality", "6 Devices", "Unlimited Downloads", "Early Access", "Exclusive Content"],
    maxDevices: 6,
    maxDownloads: -1,
    status: "active",
    subscriberCount: 450,
    revenue: 269550
  }
];

export const ADMIN_BANNERS = [
  {
    id: 1,
    title: "The Batman Hero Banner",
    image: "/assets/the batman.jpg",
    type: "hero",
    status: "active",
    position: 1,
    startDate: "2024-01-15",
    endDate: "2024-02-15",
    clicks: 12500,
    impressions: 50000,
    ctr: 25.0
  },
  {
    id: 2,
    title: "Premium Subscription Promo",
    image: "/assets/spiderman_no_way_home.jpg",
    type: "sidebar",
    status: "active",
    position: 2,
    startDate: "2024-01-10",
    endDate: "2024-03-10",
    clicks: 8200,
    impressions: 35000,
    ctr: 23.4
  },
  {
    id: 3,
    title: "New Series Launch",
    image: "/assets/mirzapur.jpeg",
    type: "hero",
    status: "inactive",
    position: 3,
    startDate: "2024-01-01",
    endDate: "2024-01-20",
    clicks: 4500,
    impressions: 25000,
    ctr: 18.0
  }
];

export const ADMIN_ACTIVITY_LOGS = [
  {
    id: 1,
    type: "user_signup",
    message: "New user Rahul Sharma signed up for Premium plan",
    timestamp: "2024-01-20T10:30:00Z",
    user: "Rahul Sharma",
    details: "Premium Plan - Credit Card"
  },
  {
    id: 2,
    type: "content_added",
    message: "New movie 'The Batman' added to library",
    timestamp: "2024-01-19T15:45:00Z",
    user: "Admin User",
    details: "Crime genre, HD quality"
  },
  {
    id: 3,
    type: "subscription_upgrade",
    message: "User Priya Patel upgraded to Premium plan",
    timestamp: "2024-01-18T09:15:00Z",
    user: "Priya Patel",
    details: "Basic → Premium (+₹200)"
  },
  {
    id: 4,
    type: "user_login",
    message: "User Amit Kumar logged in",
    timestamp: "2024-01-17T20:30:00Z",
    user: "Amit Kumar",
    details: "Mobile device"
  },
  {
    id: 5,
    type: "content_view",
    message: "High view count: 'Top Gun: Maverick' reached 250K views",
    timestamp: "2024-01-16T14:20:00Z",
    user: "System",
    details: "Action genre, Free content"
  }
];

// Analytics calculations
export const ADMIN_ANALYTICS = {
  totalUsers: ADMIN_USERS.length,
  activeUsers: ADMIN_USERS.filter(u => u.status === 'active').length,
  totalContent: ADMIN_MOVIES.length + ADMIN_SERIES.length + ADMIN_REELS.length,
  totalRevenue: ADMIN_SUBSCRIPTIONS.reduce((sum, sub) => sum + sub.revenue, 0),
  totalViews: ADMIN_MOVIES.reduce((sum, movie) => sum + movie.views, 0) +
    ADMIN_SERIES.reduce((sum, series) => sum + series.views, 0) +
    ADMIN_REELS.reduce((sum, reel) => sum + reel.views, 0),
  averageRating: (ADMIN_MOVIES.reduce((sum, m) => sum + m.rating, 0) +
    ADMIN_SERIES.reduce((sum, s) => sum + s.rating, 0)) /
    (ADMIN_MOVIES.length + ADMIN_SERIES.length),
  subscriptionDistribution: {
    Basic: ADMIN_USERS.filter(u => u.plan === 'Basic').length,
    Premium: ADMIN_USERS.filter(u => u.plan === 'Premium').length,
    VIP: ADMIN_USERS.filter(u => u.plan === 'VIP').length
  }
};
