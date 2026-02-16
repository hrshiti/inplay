import { useEffect, useRef, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Play, Download, Search, Folder, User, Star, Crown, Layout, Sparkles, Plus, Check, Headphones, Clapperboard } from 'lucide-react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

gsap.registerPlugin(ScrollTrigger);
// Prevent removeChild error by disabling 100vh fix script and limiting refresh events
ScrollTrigger.config({ ignoreMobileResize: true, autoRefreshEvents: "DOMContentLoaded,load,visibilitychange" });

// Mock Data
import { MOVIES, CONTINUE_WATCHING } from './data';
import { HINDI_SERIES, BHOJPURI_CONTENT, SONGS, TRENDING_NOW, ACTION_MOVIES, ORIGINALS } from './newData';
// import { ADMIN_REELS } from './model/admin/services/mockData'; // Removed
// import SubscriptionPage from './SubscriptionPage'; // Removed
import MySpacePage from './MySpacePage';
import MovieDetailsPage from './MovieDetailsPage';
import ForYouPage from './ForYouPage';
import SplashScreen from './SplashScreen';
import HistoryPage from './HistoryPage';
import MyListPage from './MyListPage';
import LikedVideosPage from './LikedVideosPage';
import DownloadsPage from './DownloadsPage';
import SearchPage from './SearchPage';
import SettingsPage from './SettingsPage';
import CategoryPage from './pages/CategoryPage';
import AudioSeriesUserPage from './pages/AudioSeriesUserPage';
import DynamicTabPage from './DynamicTabPage';
import MembershipPlansPage from './pages/MembershipPlansPage';

import VideoPlayer from './VideoPlayer';
import { AdminRoutes } from './model/admin';
import AdminLogin from './model/admin/components/AdminLogin';
import ProtectedRoute from './model/admin/components/ProtectedRoute';
import Login from './Login';
import Signup from './Signup';
import authService from './services/api/authService';
import contentService from './services/api/contentService';
import paymentService from './services/api/paymentService';
import AdPromotionPage from './model/admin/pages/AdPromotionPage';
import AdCarousel from './model/components/AdCarousel';
import promotionService from './services/api/promotionService';
import { getImageUrl } from './utils/imageUtils';
import { registerFCMTokenWithBackend, setupForegroundNotificationHandler, requestNotificationPermission } from './services/pushNotificationService';

import Header from './Header';
import { AudioPlayerProvider } from './contexts/AudioPlayerContext';
import FloatingAudioPlayer from './components/FloatingAudioPlayer';

const FILTERS = ['All', 'Movies', 'TV Shows', 'Anime'];

function App() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Home');
  const [activeFilter, setActiveFilter] = useState('Popular');
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [playingMovie, setPlayingMovie] = useState(null);
  const [playingEpisode, setPlayingEpisode] = useState(null);
  const [myList, setMyList] = useState([]); // Fetched from backend
  const [likedVideos, setLikedVideos] = useState([]);
  const [purchasedContent, setPurchasedContent] = useState([]); // Track paid content IDs
  const [continueWatching, setContinueWatching] = useState([]);
  const [watchHistory, setWatchHistory] = useState([]);
  const [toast, setToast] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [quickBites, setQuickBites] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [contentSections, setContentSections] = useState({
    bhojpuri: [],
    trending_now: [],
    trending_song: [],
    hindi_series: [],
    action: [],
    new_release: [],
    originals: [],
    broadcast: []
  });
  const [qbContinueWatching, setQbContinueWatching] = useState([]);
  const [dynamicStructure, setDynamicStructure] = useState([]);

  // Keyboard Detection for Mobile
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    // Only run on mobile devices
    if (window.innerWidth > 768) return;

    const initialHeight = window.innerHeight;

    const handleResize = () => {
      // If current height is significantly smaller (e.g. < 80% of original), keyboard is likely open
      if (window.innerHeight < initialHeight * 0.8) {
        setIsKeyboardOpen(true);
      } else {
        setIsKeyboardOpen(false);
      }
    };

    // Use VisualViewport API if available (more reliable on modern mobile browsers)
    if (window.visualViewport) {
      const handleVisualResize = () => {
        if (window.visualViewport.height < initialHeight * 0.8) {
          setIsKeyboardOpen(true);
        } else {
          setIsKeyboardOpen(false);
        }
      };
      window.visualViewport.addEventListener('resize', handleVisualResize);
      return () => window.visualViewport.removeEventListener('resize', handleVisualResize);
    }

    // Fallback to window resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const updateQuickByteProgress = () => {
    if (quickBites.length > 0) {
      try {
        const progress = JSON.parse(localStorage.getItem('inplay_quickbyte_progress') || '{}');
        const continued = quickBites.map(item => {
          const contentId = item._id || item.id;
          const prog = progress[contentId];
          if (prog && prog.watchedSeconds > 0) {
            // Merge the full QuickByte item with progress data
            // This ensures we have thumbnail, episodes, etc. from the original item
            return {
              ...item,  // Full QuickByte data (including thumbnail, episodes, etc.)
              ...prog   // Progress data (watchedSeconds, episodeIndex, timestamp, duration)
            };
          }
          return null;
        })
          .filter(item => item !== null)
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        setQbContinueWatching(continued);
      } catch (e) {
        console.error("Error parsing progress", e);
      }
    }
  };

  useEffect(() => {
    updateQuickByteProgress();
  }, [quickBites]);

  const handleResumeQuickByte = (item) => {
    let episode = null;
    // Try to find the specific episode object
    if (item.episodes && item.episodes[item.episodeIndex]) {
      episode = item.episodes[item.episodeIndex];
    } else if (item.seasons) {
      const allEps = item.seasons.flatMap(s => s.episodes || []);
      episode = allEps[item.episodeIndex];
    }

    // Play with accumulated progress
    // Ensure we pass the 'watchedSeconds' so the player resumes

    // IMPORTANT: Explicitly set flags to forces Vertical Player Mode in VideoPlayer.jsx
    const quickByteItem = {
      ...item,
      watchedSeconds: item.watchedSeconds,
      isVertical: true,
      type: 'quick_byte',
      category: 'Quick Bites'
    };

    handlePlay(quickByteItem, episode);
  };
  const [allContent, setAllContent] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const categoryMatch = location.pathname.match(/^\/category\/(.+)/);
  const categorySlug = categoryMatch ? categoryMatch[1] : null;

  // Track the source tab for correct "More Like This" recommendations
  const [selectedSourceTab, setSelectedSourceTab] = useState(null);

  const handleContentSelect = (movie, sourceTab = null) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    // Check if content is 'For You' style (Quick Byte/Vertical)
    if (movie.type === 'quick_byte' || movie.isVertical || (movie.category === 'Quick Bites')) {
      navigate(`/watch/${movie._id || movie.id}`, {
        state: {
          movie: { ...movie, isVertical: true, type: 'quick_byte' },
          episode: null
        }
      });
    } else {
      navigate(`/content/${movie._id || movie.id}`, { state: { movie, sourceTab } });
    }
  };




  const loadUserProfile = async () => {
    const token = localStorage.getItem('inplay_token');
    if (!token) return;
    try {
      const profile = await authService.getProfile();
      setCurrentUser(profile);
      setMyList(profile.myList || []);
      setLikedVideos(profile.likedContent || []);
      setContinueWatching(profile.continueWatching || []);
      setWatchHistory(profile.history || []);
      setPurchasedContent(profile.purchasedContent || []);
      return profile;
    } catch (err) {
      console.error('Failed to load user profile:', err);
    }
  };

  const handleAuthSuccess = () => {
    const savedUser = localStorage.getItem('inplay_current_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setMyList(user.myList || []);
      setLikedVideos(user.likedContent || []);
      setPurchasedContent(user.purchasedContent || []);
    }
  };
  // Use Trending Now content for Hero Slideshow
  const heroMovies = contentSections.trending_now.length > 0 ? contentSections.trending_now : [];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const structure = await contentService.getDynamicStructure();
        setDynamicStructure(structure);

        const reels = await contentService.getQuickBytes(20);
        setQuickBites(reels);

        const allContent = await contentService.getAllContent();
        const sections = {
          bhojpuri: [],
          trending_now: [],
          trending_song: [],
          hindi_series: [],
          action: [],
          new_release: [],
          originals: [],
          broadcast: []
        };

        if (Array.isArray(allContent)) {
          allContent.forEach(item => {
            if (item.type === 'bhojpuri') sections.bhojpuri.push(item);
            else if (item.type === 'trending_song') sections.trending_song.push(item);
            else if (item.type === 'hindi_series') sections.hindi_series.push(item);
            else if (item.type === 'action') sections.action.push(item);

            if (item.isBroadcast) sections.broadcast.push(item);

            if (item.type === 'trending_now' || item.isPopular || item.isNewAndHot || item.isRanking || item.isMovie || item.isTV) sections.trending_now.push(item);
            if (item.type === 'new_release') sections.new_release.push(item);

            if (item.isOriginal) sections.originals.push(item);
          });
        }

        try {
          const newReleases = await contentService.getNewReleases();
          sections.new_release = newReleases || [];
        } catch (error) {
          console.error("Failed to fetch new releases", error);
        }

        setContentSections(sections);
        setAllContent(allContent || []);

        try {
          const promoData = await promotionService.getActivePromotions();
          setPromotions(promoData);
        } catch (err) {
          console.error("Failed to fetch promotions", err);
        }

      } catch (error) {
        console.error("Failed to fetch content", error);
        setQuickBites([]);
      }
    };
    fetchData();
  }, []);

  // Auto-scroll for New Releases
  useEffect(() => {
    const container = document.querySelector('.nr-auto-scroll');
    if (!container || !contentSections.new_release?.length) return;

    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % contentSections.new_release.length;
      const scrollStep = 350; // Total width of flex item + gap (roughly)

      if (currentIndex === 0) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: scrollStep, behavior: 'smooth' });
      }

      // If we reached the end visually, reset
      if (container.scrollLeft >= (container.scrollWidth - container.clientWidth - 10)) {
        setTimeout(() => {
          container.scrollTo({ left: 0, behavior: 'instant' });
          currentIndex = 0;
        }, 500);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [contentSections.new_release]);

  // Route mapping
  const filterMap = {
    'popular': 'Popular',
    'new-and-hot': 'New & Hot',
    'originals': 'Originals',
    'rankings': 'Rankings',
    'movies': 'Movies',
    'tv': 'TV',
    'broadcast': 'Broadcast',
    'mms': 'Mms',
    'crime-show': 'Crime Show',
    'audio-series': 'Audio Series',
    'short-film': 'Short Film',
    // Added missing categories
    'bhojpuri': 'Bhojpuri',
    'hindi-series': 'Hindi Series',
    'trending-sound': 'Trending Sound',
    'action': 'Action'
  };

  const reverseFilterMap = {
    'Popular': '',
    'New & Hot': 'new-and-hot',
    'Originals': 'originals',
    'Rankings': 'rankings',
    'Movies': 'movies',
    'TV': 'tv',
    'Broadcast': 'broadcast',
    'Crime Show': 'crime-show',
    'Mms': 'mms',
    'Audio Series': 'audio-series',
    'Short Film': 'short-film',
    // Added missing categories
    'Bhojpuri': 'bhojpuri',
    'Hindi Series': 'hindi-series',
    'Trending Sound': 'trending-sound',
    'Action': 'action'
  };

  // Helper to slugify any string: "My Category Name" -> "my-category-name"
  const slugify = (text) => {
    return text.toString().toLowerCase()
      .trim()
      .replace(/\s+/g, '-')     // Replace spaces with -
      .replace(/[^\w-]+/g, '')  // Remove all non-word chars
      .replace(/--+/g, '-');    // Replace multiple - with single -
  };

  // Helper to deslugify: "my-category-name" -> "My Category Name" (approximate)
  const deslugify = (slug) => {
    return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleFilterChange = (cat) => {
    if (!currentUser && cat !== 'Popular') {
      navigate('/login');
      return;
    }
    setActiveFilter(cat);

    // 1. Check Dynamic Tabs from Backend
    const dynamicTab = dynamicStructure.find(t => t.name === cat);
    if (dynamicTab) {
      navigate(`/${dynamicTab.slug}`);
      return;
    }

    // 2. Check Static Map
    const staticSlug = reverseFilterMap[cat];
    if (staticSlug !== undefined) {
      navigate(`/${staticSlug}`);
      return;
    }

    // 3. Fallback: Dynamic Slug Generation (Future Proofing)
    // If a new category appears that isn't in maps, we create a slug for it
    const dynamicSlug = slugify(cat);
    navigate(`/${dynamicSlug}`);
  };

  // Sync state with URL on mount and location change
  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return;

    // Normalize path: remove leading and trailing slashes
    const path = location.pathname ? location.pathname.replace(/^\/|\/$/g, '') : '';

    // 1. Check Static Routes (Explicit Map)
    if (filterMap[path]) {
      setActiveFilter(filterMap[path]);
      setActiveTab('Home');
    }
    else if (path === '' || path === 'home') {
      setActiveFilter('Popular');
      setActiveTab('Home');
    }
    else if (path === 'for-you') {
      setActiveTab('For You');
    } else if (path === 'my-space') {
      setActiveTab('My Space');
    } else if (path === 'search') {
      setActiveTab('Search');
    } else if (['history', 'my-list', 'liked-videos', 'downloads', 'settings'].includes(path)) {
      setActiveTab('My Space');
    }
    else if (path.startsWith('category/')) {
      setActiveTab('Category'); // Custom tab state implies viewing a category
    }
    // 2. Check Dynamic Tab Slugs (Backend)
    else if (dynamicStructure.length > 0) {
      const dynamicTab = dynamicStructure.find(t => t.slug === path);
      if (dynamicTab) {
        setActiveFilter(dynamicTab.name);
        setActiveTab('Home');
      }
      // 3. Fallback for Generated Slugs (e.g. /my-new-category)
      // If we are here, it might be a valid slug not in our static map yet.
      // We try to match it against available content sections or just set it.
      else {
        // Attempt to convert slug back to Title Case for display
        // This ensures if user lands on /custom-category, the filter becomes "Custom Category"
        // Note: This relies on the filter name matching how we display it
        const guessedFilter = deslugify(path);
        // Only set it if it looks valid (not empty)
        if (guessedFilter) {
          setActiveFilter(guessedFilter);
          setActiveTab('Home');
        }
      }
    }
  }, [location.pathname, dynamicStructure]);

  const handleTabChange = (tab) => {
    if (tab !== 'Home' && !currentUser) {
      navigate('/login');
      return;
    }

    setActiveTab(tab);
    if (tab === 'Home') navigate('/');
    else if (tab === 'For You') navigate('/for-you');
    else if (tab === 'My Space') navigate('/my-space');
    else if (tab === 'Search') navigate('/search');
    else if (tab === 'Audio') navigate('/audio-series');
  };

  const heroRef = useRef(null);

  useEffect(() => {
    // Initialize push notifications
    const initNotifications = async () => {
      try {
        const granted = await requestNotificationPermission();
        if (granted && currentUser) {
          await registerFCMTokenWithBackend();
        }
      } catch (err) {
        console.error('Notification init error:', err);
      }
    };

    initNotifications();

    // Setup foreground notification handler
    setupForegroundNotificationHandler((payload) => {
      if (payload.notification) {
        showToast(`🔔 ${payload.notification.title}: ${payload.notification.body}`);
      }
    });
  }, [currentUser]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleMyList = (movie) => {
    setMyList(prev => {
      const exists = prev.find(m => m.id === movie.id);
      if (exists) {
        showToast(`Removed from My List`);
        return prev.filter(m => m.id !== movie.id);
      }
      showToast(`Added to My List`);
      return [...prev, movie];
    });
  };

  const toggleLike = (movie) => {
    setLikedVideos(prev => {
      const exists = prev.find(m => m.id === movie.id);
      if (exists) {
        showToast(`Removed from Liked`);
        return prev.filter(m => m.id !== movie.id);
      }
      showToast(`Added to Liked Videos`);
      return [...prev, movie];
    });
  };



  const handlePlay = (movie, episode = null) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    const contentId = movie._id || movie.id;
    // Navigate to watch route, passing movie/episode object to avoid re-fetch if possible
    navigate(`/watch/${contentId}`, { state: { movie, episode } });
  };

  const handleToggleMyList = async (movie) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // Identify ID. For Quick Bites/Real Data it's _id. Mock data uses numeric id.
    // If movie doesn't have _id but has id, checks if id is string (UUID?) or number. 
    // Backend expects MongoDB _id.
    const contentId = movie._id || movie.id;

    // Optimistic Update
    const exists = myList.some(m => (m._id || m.id) === contentId);

    // Only proceed if it looks like a real backend ID or we implement mock fallback
    if (typeof contentId === 'string') {
      try {
        if (exists) {
          await authService.removeFromMyList(contentId);
          showToast("Removed from My List");
        } else {
          await authService.addToMyList(contentId);
          showToast("Added to My List");
        }
        // Re-fetch profile to ensure we have the full object details (image, title, etc)
        const profile = await authService.getProfile();
        setMyList(profile.myList || []);
      } catch (error) {
        console.error("Failed to update list", error);
        showToast("Failed to update list");
      }
    } else {
      // Local fallback for mock data
      if (exists) {
        setMyList(prev => prev.filter(m => m.id !== contentId));
        showToast("Removed (Local)");
      } else {
        setMyList(prev => [...prev, movie]);
        showToast("Added (Local)");
      }
    }
  };

  const handleToggleLike = async (movie, showNotification = true) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const contentId = movie._id || movie.id;

    if (typeof contentId === 'string') {
      try {
        const res = await authService.toggleLike(contentId);
        // res.action is 'liked' or 'unliked'
        const action = res.action === 'liked' ? "Added to Liked Videos" : "Removed from Liked Videos";
        if (showNotification) showToast(action);

        // Re-fetch profile to sync likedVideos
        const profile = await authService.getProfile();
        setLikedVideos(profile.likedContent || []);
      } catch (error) {
        console.error("Failed to update like", error);
      }
    } else {
      if (showNotification) showToast("Likes only supported for Real Content");
    }
  };

  const handlePurchase = async (movie) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const contentId = movie._id || movie.id;
    console.log("Initiating purchase for content:", movie.title, "ID:", contentId);

    if (!contentId || typeof contentId !== 'string') {
      showToast("Invalid Content ID (Only real content can be purchased)");
      return;
    }

    try {
      showToast("Initiating Payment...");

      // 1. Create Order
      const { order, content } = await paymentService.createContentOrder(contentId);

      // Handle Mock Order (if Razorpay keys are failed on backend)
      if (order.isMock) {
        showToast("Processing Internal Payment...");
        const verificationData = {
          razorpay_order_id: order.id,
          isMock: true
        };

        await paymentService.verifyContentPayment(verificationData);

        showToast("Purchase Successful (Mock)!");
        setPurchasedContent(prev => [...prev, contentId]);

        // Refresh profile to sync
        try {
          await authService.getProfile();
        } catch (e) { console.error("Profile sync failed", e); }

        return; // Success, skip Razorpay modal
      }

      // 2. Options (Real Razorpay Flow)
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "InPlay",
        description: `Purchase ${content.title}`,
        order_id: order.id,
        handler: async function (response) {
          try {
            showToast("Verifying Payment...");
            const verificationData = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            };

            await paymentService.verifyContentPayment(verificationData);

            showToast("Purchase Successful!");
            setPurchasedContent(prev => [...prev, contentId]);

            // Refresh profile to sync
            try {
              await authService.getProfile();
            } catch (e) { console.error("Profile sync failed", e); }

          } catch (err) {
            console.error("Payment Verification Failed", err);
            showToast(err.message || "Payment Verification Failed");
          }
        },
        prefill: {
          name: currentUser.name,
          email: currentUser.email,
          contact: currentUser.mobile || ""
        },
        theme: {
          color: "#E50914"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        showToast("Payment Failed: " + (response.error.description || response.error.reason));
        console.error(response.error);
      });
      rzp.open();

    } catch (error) {
      console.error("Purchase Error", error);
      // Fix: Fetch error object doesn't have response.data
      showToast(error.message || "Failed to initiate purchase");
    }
  };



  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setPurchasedContent([]);
    showToast('Logged out successfully');
  };

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Smooth Scroll Setup with GSAP Sync
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
    });

    // Synchronize Lenis scroll with ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    // Use GSAP Ticker for Lenis animation loop to prevent conflicts
    const update = (time) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0); // Disable lag smoothing for smooth scrolling

    return () => {
      gsap.ticker.remove(update);
      ScrollTrigger.getAll().forEach(t => t.kill()); // Kill all ScrollTriggers to prevent removeChild errors
      lenis.destroy();
    };
  }, []);

  // GSAP Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Horizontal Lists Stagger
      gsap.utils.toArray('.horizontal-list').forEach((list) => {
        gsap.from(list.children, {
          scrollTrigger: {
            trigger: list,
            start: 'top 90%',
          },
          x: 50,
          opacity: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power2.out'
        });
      });
    });

    return () => ctx.revert();
  }, []);

  // Hero Slider Autoplay
  useEffect(() => {
    const timer = setInterval(() => {
      if (heroMovies && heroMovies.length > 0) {
        setCurrentHeroIndex((prev) => (prev + 1) % heroMovies.length);
      }
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(timer);
  }, [heroMovies]);

  const [showSearch, setShowSearch] = useState(false);

  // Check for existing user session
  useEffect(() => {
    loadUserProfile();
  }, []);

  // Scroll Listener for Search Bar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 150) {
        setShowSearch(true);
      } else {
        setShowSearch(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const currentMovie = heroMovies[currentHeroIndex];

  return (
    <Routes>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/*" element={<ProtectedRoute><AdminRoutes /></ProtectedRoute>} />
      <Route path="/membership-plans" element={<MembershipPlansPage currentUser={currentUser} onLoginClick={() => navigate('/login')} showToast={(m) => setToast(m)} />} />

      {/* Dedicated Routes for Login and Signup */}
      <Route path="/login" element={<Login onClose={() => navigate(-1)} onSwitchToSignup={() => navigate('/signup')} onLoginSuccess={handleAuthSuccess} />} />
      <Route path="/signup" element={<Signup onClose={() => navigate(-1)} onSwitchToLogin={() => navigate('/login')} onSignupSuccess={handleAuthSuccess} />} />

      {/* Dedicated Routes for Deep Linking */}
      <Route path="/content/:id" element={
        <ContentDetailsRoute
          allContent={allContent}
          handlePlay={handlePlay}
          myList={myList}
          likedVideos={likedVideos}
          handleToggleMyList={handleToggleMyList}
          handleToggleLike={handleToggleLike}
          purchasedContent={purchasedContent}
          handlePurchase={handlePurchase}
        />
      } />
      <Route path="/watch/:id" element={
        <WatchPageRoute
          allContent={allContent}
          handleToggleMyList={handleToggleMyList}
          handleToggleLike={handleToggleLike}
          myList={myList}
          likedVideos={likedVideos}
        />
      } />

      <Route path="/*" element={
        <div className="app-container">
          <AnimatePresence mode="wait">
            {loading && <SplashScreen key="splash" />}
          </AnimatePresence>

          {!loading && (
            <>




              {activeTab === 'Home' && !selectedMovie && !playingMovie && (
                <>
                  <Header currentUser={currentUser} onLoginClick={() => navigate('/login')} />
                  <div className="category-tabs-container hide-scrollbar">
                    {[
                      'Popular', 'New & Hot', 'Originals', 'Rankings', 'Movies', 'TV', 'Crime Show', 'Broadcast', 'Mms', 'Audio Series', 'Short Film',
                      ...dynamicStructure.map(t => t.name)
                    ].map((filter) => (
                      <div
                        key={filter}
                        className={`category-tab ${activeFilter === filter ? 'active' : ''}`}
                        onClick={() => handleFilterChange(filter)}
                      >
                        {filter}
                        {activeFilter === filter && (
                          <motion.div
                            layoutId="activeTabIndicator"
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: '3px',
                              background: '#ff0a16',
                              borderRadius: '2px 2px 0 0',
                              zIndex: 1
                            }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              <AnimatePresence mode='wait'>
                {activeTab === 'Home' && (
                  <motion.div
                    key="home"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >


                    {/* Content Switching based on Filter */}
                    {dynamicStructure.find(t => t.name === activeFilter) ? (
                      <DynamicTabPage
                        tab={dynamicStructure.find(t => t.name === activeFilter)}
                        onMovieClick={handleContentSelect}
                      />
                    ) : activeFilter === 'Audio Series' ? (
                      <AudioSeriesUserPage onBack={() => setActiveFilter('Popular')} />
                    ) : activeFilter === 'Popular' || activeFilter === 'All' ? (
                      /* Standard Home View */
                      <>
                        {/* Hero Section Slider */}
                        <div className="hero" ref={heroRef} style={{ overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <div
                            style={{
                              display: 'flex',
                              width: '100%',
                              height: '100%',
                              position: 'absolute',
                              left: '50%',
                              transform: 'translateX(-50%)', // Center the track
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {/* We render a track that shifts based on index - simplified approach for "center  peek" */}
                            {/* Actually, mapping absolute items is easier for this visual. */}
                            {heroMovies.map((movie, index) => {
                              // Calculate relative position
                              let position = index - currentHeroIndex;
                              // Handle wrap around if we wanted, but for now simple finite or infinite loop logic? 
                              // Let's stick to simple finite for stability, or basic loop visual.

                              // If we want infinite loop visual, we need modulo arithmetic.
                              const total = heroMovies.length;
                              // Adjust position to be within -Total/2 to +Total/2
                              // But for valid indices 0 to 4...

                              // Simplified: active is `currentHeroIndex`.
                              // We want active to be at `left: 10%`, width `80%`.
                              // Prev at `left: -80% + 10px`.
                              // Next at `left: 90% + 10px`.

                              const isActive = index === currentHeroIndex;
                              const isPrev = index === (currentHeroIndex - 1 + total) % total; // wrap logic prev
                              const isNext = index === (currentHeroIndex + 1) % total; // wrap logic next

                              // We only render text/detail if Active.
                              // Helper to get visual offset.
                              // 0 is center. -1 is left. 1 is right.
                              let visualOffset = 100; // far away
                              if (index === currentHeroIndex) visualOffset = 0;
                              else if (index === (currentHeroIndex - 1 + total) % total) visualOffset = -1;
                              else if (index === (currentHeroIndex + 1) % total) visualOffset = 1;

                              // If it's not one of these 3, hide it or keep it far off
                              // Actually we can just iterate -1, 0, 1 relative logic

                              return (
                                <motion.div
                                  key={movie._id || movie.id}
                                  initial={false}
                                  animate={{
                                    x: visualOffset === 0 ? "0%" : (visualOffset < 0 ? "-96%" : "96%"),
                                    scale: visualOffset === 0 ? 1 : 0.9,
                                    opacity: visualOffset === 0 ? 1 : 0.5,
                                    zIndex: visualOffset === 0 ? 10 : 5
                                  }}
                                  transition={{ type: "spring", stiffness: 200, damping: 25 }}
                                  style={{
                                    position: 'absolute',
                                    width: '88%',
                                    height: '100%',
                                    borderRadius: '24px',
                                    overflow: 'hidden',
                                    boxShadow: visualOffset === 0 ? '0 20px 40px rgba(0,0,0,0.6)' : 'none',
                                    left: '6%',
                                    top: 0
                                  }}
                                  drag="x"
                                  dragConstraints={{ left: 0, right: 0 }}
                                  onDragEnd={(e, { offset }) => {
                                    if (offset.x > 50) {
                                      setCurrentHeroIndex((prev) => (prev - 1 + heroMovies.length) % heroMovies.length);
                                    } else if (offset.x < -50) {
                                      setCurrentHeroIndex((prev) => (prev + 1) % heroMovies.length);
                                    }
                                  }}
                                  onClick={() => {
                                    if (isActive) handleContentSelect(movie)
                                    else if (visualOffset === -1) setCurrentHeroIndex((prev) => (prev - 1 + heroMovies.length) % heroMovies.length)
                                    else if (visualOffset === 1) setCurrentHeroIndex((prev) => (prev + 1) % heroMovies.length)
                                  }}
                                >
                                  <img src={getImageUrl(movie.backdrop?.url || movie.backdrop || movie.poster?.url || movie.image)} alt={movie.title} className="hero-image" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />

                                  <div className="hero-overlay" style={{
                                    background: 'linear-gradient(to top, #080808 0%, rgba(8,8,8,0.8) 40%, transparent 100%)',
                                    padding: '20px 16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'flex-end',
                                    alignItems: 'flex-start'
                                  }}>
                                    {isActive && (
                                      <motion.div
                                        className="hero-content"
                                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                                        style={{ width: '100%' }}
                                      >


                                        {movie.isPaid && (
                                          <div style={{
                                            position: 'absolute', top: '20px', right: '20px',
                                            padding: '6px 12px', background: '#eab308', color: 'black',
                                            fontWeight: '800', borderRadius: '4px', fontSize: '0.8rem',
                                            boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
                                          }}>
                                            PAID
                                          </div>
                                        )}





                                        <div className="hero-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#ccc', marginBottom: '8px' }}>
                                          <span style={{ color: '#46d369', fontWeight: 'bold' }}>{Math.round(movie.rating * 10)}% Match</span>
                                          <span style={{ opacity: 0.3 }}>|</span>
                                          <span>{movie.year}</span>
                                          <span style={{ opacity: 0.3 }}>|</span>
                                          <span style={{ background: 'rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>HD</span>
                                          <a style={{ opacity: 0.3 }}>|</a>
                                          <span>{movie.genre}</span>
                                        </div>

                                        {/* Action Buttons Row */}
                                        {/* Removed as per user request */}
                                      </motion.div>
                                    )}
                                  </div>
                                </motion.div>
                              )
                            })}
                          </div>
                        </div>



                        {/* New Release Section */}
                        {contentSections.new_release && contentSections.new_release.length > 0 && (
                          <section className="section" style={{ marginBottom: '40px', marginTop: '20px' }}>
                            <div className="section-header" style={{ padding: '0 20px', marginBottom: '16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '4px', height: '24px', background: '#e50914', borderRadius: '2px' }}></div>
                                <h2 className="section-title" style={{ fontSize: '1.4rem', fontWeight: '800' }}>New Releases</h2>
                                <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '100px', color: '#aaa', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Latest</span>
                              </div>
                            </div>
                            <div className="horizontal-list hide-scrollbar nr-auto-scroll" style={{ gap: '20px', padding: '0 20px 20px', alignItems: 'center', scrollSnapType: 'x mandatory' }}>
                              {contentSections.new_release.map((movie, index) => (
                                <motion.div
                                  key={movie._id || movie.id}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleContentSelect(movie)}
                                  style={{
                                    flex: '0 0 350px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    paddingLeft: '30px', // Space for ranking number
                                    position: 'relative',
                                    scrollSnapAlign: 'start'
                                  }}
                                >
                                  {/* Ranking Number */}
                                  <div style={{
                                    position: 'absolute',
                                    left: '-5px',
                                    bottom: '-10px',
                                    fontSize: '100px',
                                    fontWeight: '900',
                                    color: 'white',
                                    zIndex: 3,
                                    lineHeight: '1',
                                    pointerEvents: 'none',
                                    opacity: 0.5,
                                    textShadow: '2px 2px 10px rgba(0,0,0,0.5)'
                                  }}>
                                    {index + 1}
                                  </div>

                                  <div style={{
                                    width: '320px',
                                    height: '200px',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    zIndex: 2
                                  }}>
                                    <img
                                      src={getImageUrl(movie.backdrop?.url || movie.backdrop || movie.poster?.url || movie.image)}
                                      alt={movie.title}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                                      onError={(e) => { e.target.src = `https://placehold.co/240x160/111/FFF?text=${movie.title?.substring(0, 10)}` }}
                                    />
                                    {movie.isPaid && (
                                      <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#FFD700', color: '#000', fontSize: '10px', fontWeight: '900', padding: '2px 6px', borderRadius: '4px', zIndex: 10 }}>
                                        PAID
                                      </div>
                                    )}
                                    <div style={{
                                      position: 'absolute',
                                      bottom: 0,
                                      left: 0,
                                      right: 0,
                                      padding: '12px',
                                      background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                                      zIndex: 5
                                    }}>
                                      <span style={{
                                        fontSize: '12px',
                                        fontWeight: '800',
                                        color: '#fff',
                                        display: 'block',
                                        textAlign: 'right',
                                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                                      }}>
                                        {movie.title}
                                      </span>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </section>
                        )}


                        {/* Continue Watching Section */}
                        {continueWatching.length > 0 && (
                          <section className="section" style={{
                            marginTop: '0',
                            background: 'linear-gradient(180deg, rgba(220, 20, 60, 0.15) 0%, rgba(0,0,0,0) 100%)',
                            paddingTop: '20px',
                            paddingBottom: '20px',
                            margin: '0 -16px', // Negative margin to stretch full width if container has padding
                            paddingLeft: '16px',
                            paddingRight: '16px'
                          }}>
                            <div className="section-header" style={{ marginBottom: '10px' }}>
                              <h2 className="section-title">Continue Watching</h2>
                              <span style={{ fontSize: '18px', color: '#888' }}>›</span>
                            </div>
                            <div className="horizontal-list hide-scrollbar">
                              {continueWatching.map(show => (
                                <motion.div
                                  key={show.id}
                                  className="continue-card"
                                  whileTap={{ scale: 0.95 }}
                                  style={{ minWidth: '140px', marginRight: '16px', position: 'relative', cursor: 'pointer' }}
                                  onClick={() => handleContentSelect(show)}
                                >
                                  <div className="poster-container" style={{ borderRadius: '8px', overflow: 'hidden', height: '180px', width: '100%', position: 'relative' }}>
                                    <img
                                      src={getImageUrl(show.image)}
                                      alt={show.title}
                                      className="poster-img"
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      onError={(e) => { e.target.src = 'https://placehold.co/200x300/333/FFF?text=' + (show.title || 'InPlay')?.substring(0, 5) }}
                                    />
                                    {/* Play Overlay */}
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
                                      <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '50%', backdropFilter: 'blur(5px)' }}>
                                        <Play size={20} fill="white" />
                                      </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,0.3)' }}>
                                      <div style={{ width: `${show.progress}%`, height: '100%', background: '#ff0000' }} />
                                    </div>

                                    {/* Text Info Overlay */}
                                    <div style={{ position: 'absolute', bottom: '8px', left: '8px', right: '8px', zIndex: 2 }}>
                                      <div style={{ fontSize: '11px', fontWeight: '800', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)', lineHeight: '1.2' }}>
                                        {show.title}
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </section>
                        )}


                        {/* Quick Bites (Vertical Content) Section */}
                        {/* This section contains ONLY vertical content as requested */}
                        <section className="section" style={{ marginBottom: '40px' }}>
                          <div className="section-header" style={{ padding: '0 20px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '4px', height: '24px', background: '#e50914', borderRadius: '2px' }}></div>
                              <h2 className="section-title" style={{ fontSize: '1.4rem', fontWeight: '800' }}>Quick Bites</h2>
                              <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '100px', color: '#aaa', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top Shorts</span>
                            </div>
                          </div>
                          <div className="horizontal-list hide-scrollbar" style={{ gap: '14px', padding: '0 20px 20px' }}>
                            {quickBites
                              .filter(item => item.status === 'published')
                              .filter(item => {
                                if (activeFilter === 'All') {
                                  return true;
                                }
                                if (activeFilter === 'Movies') {
                                  return item.isMovie || item.type === 'movie' || item.type === 'action' || item.type === 'bhojpuri' || item.type === 'new_release';
                                }
                                if (activeFilter === 'TV') {
                                  return item.isTV || item.type === 'series' || item.type === 'hindi_series';
                                }
                                return true;
                              })
                              .map((item, index) => {
                                const verticalItem = {
                                  ...item,
                                  isVertical: true,
                                  image: item.thumbnail?.url || item.poster?.url || "https://placehold.co/150x267/333/FFF?text=No+Image",
                                  video: item.video?.secure_url || item.video?.url,
                                  type: 'reel'
                                };
                                return (
                                  <motion.div
                                    key={verticalItem._id || verticalItem.id || index}
                                    whileHover={{ scale: 1.05, y: -5 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handlePlay(verticalItem)}
                                    style={{
                                      flex: '0 0 120px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '10px'
                                    }}
                                  >
                                    <div style={{
                                      width: '120px',
                                      height: '210px',
                                      borderRadius: '16px',
                                      overflow: 'hidden',
                                      position: 'relative',
                                      boxShadow: '0 8px 25px rgba(0,0,0,0.6)',
                                      border: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                      <img
                                        src={getImageUrl(verticalItem.image)}
                                        alt={verticalItem.title}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      />
                                      <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 40%)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'flex-end',
                                        padding: '10px'
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <div style={{ background: '#e50914', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Play size={10} fill="white" stroke="none" />
                                          </div>
                                          {verticalItem.rating && (
                                            <span style={{ fontSize: '10px', fontWeight: 'bold' }}>★ {verticalItem.rating}</span>
                                          )}
                                        </div>
                                      </div>
                                      {verticalItem.isPaid && (
                                        <div style={{ position: 'absolute', top: '8px', right: '8px', background: '#FFD700', color: '#000', fontSize: '9px', fontWeight: '900', padding: '2px 6px', borderRadius: '4px' }}>
                                          PAID
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <span style={{
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        color: '#fff',
                                        textAlign: 'left',
                                        maxWidth: '100%',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                      }}>
                                        {verticalItem.title}
                                      </span>
                                      <span style={{ fontSize: '9px', color: '#888', fontWeight: '500' }}>
                                        {verticalItem.genre || 'Short'} • {verticalItem.year || '2024'}
                                      </span>
                                    </div>
                                  </motion.div>
                                )
                              })}
                          </div>
                        </section>

                        {/* Continue Watching (Quick Bites) Section */}
                        {qbContinueWatching.length > 0 && (
                          <section className="section" style={{ marginBottom: '40px' }}>
                            <div className="section-header" style={{ padding: '0 20px', marginBottom: '16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '4px', height: '24px', background: '#e50914', borderRadius: '2px' }}></div>
                                <h2 className="section-title" style={{ fontSize: '1.4rem', fontWeight: '800' }}>Continue Watching</h2>
                              </div>
                            </div>
                            <div className="horizontal-list hide-scrollbar" style={{ gap: '14px', padding: '0 20px 20px' }}>
                              {qbContinueWatching.map((item, index) => {
                                // Get the proper image from the QuickByte data
                                const image = item.thumbnail?.url || item.thumbnail?.secure_url || item.poster?.url || item.image || "https://placehold.co/150x267/333/FFF?text=No+Image";

                                // Get the episode duration from episodes array
                                let episodeDuration = item.duration || 0;
                                if (item.episodes && item.episodes[item.episodeIndex]) {
                                  episodeDuration = item.episodes[item.episodeIndex].duration || episodeDuration;
                                } else if (item.video?.duration) {
                                  episodeDuration = item.video.duration;
                                }

                                // Calculate formatted duration for display
                                const formatDuration = (seconds) => {
                                  if (!seconds) return '0m';
                                  const mins = Math.floor(seconds / 60);
                                  const secs = Math.floor(seconds % 60);
                                  if (mins > 0) {
                                    return `${mins}m ${secs}s`;
                                  }
                                  return `${secs}s`;
                                };

                                return (
                                  <motion.div
                                    key={item._id || item.id || index}
                                    whileHover={{ scale: 1.05, y: -5 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleResumeQuickByte(item)}
                                    style={{
                                      flex: '0 0 120px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '10px'
                                    }}
                                  >
                                    <div style={{
                                      width: '120px',
                                      height: '210px',
                                      borderRadius: '16px',
                                      overflow: 'hidden',
                                      position: 'relative',
                                      boxShadow: '0 8px 25px rgba(0,0,0,0.6)',
                                      border: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                      <img
                                        src={getImageUrl(image)}
                                        alt={item.title}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => { e.target.src = 'https://placehold.co/150x267/333/FFF?text=' + (item.title || 'InPlay')?.substring(0, 5) }}
                                      />

                                      <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 50%)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'flex-end',
                                        padding: '10px'
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                          <div style={{ background: '#e50914', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Play size={10} fill="white" stroke="none" />
                                          </div>
                                          <span style={{ fontSize: '10px', fontWeight: '700', color: '#fff' }}>
                                            {item.episodeIndex !== undefined ? `Ep ${item.episodeIndex + 1}` : ''}
                                          </span>
                                        </div>

                                        {episodeDuration && item.watchedSeconds !== undefined && (
                                          <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div style={{ width: `${Math.min((item.watchedSeconds / episodeDuration) * 100, 100)}%`, height: '100%', background: '#e50914' }}></div>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <span style={{
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        color: '#fff',
                                        textAlign: 'left',
                                        maxWidth: '100%',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                      }}>
                                        {item.title}
                                      </span>
                                      <span style={{ fontSize: '9px', color: '#888', fontWeight: '500' }}>
                                        {item.genre || 'Short'} • {formatDuration(episodeDuration)}
                                      </span>
                                    </div>
                                  </motion.div>
                                )
                              })}
                            </div>
                          </section>
                        )}


                        {/* Promotion & Ads Section */}
                        {/* Promotion & Ads Section */}
                        {/* Promotion & Ads Section */}
                        <section className="section">
                          <div className="section-header">
                            <h2 className="section-title">Promotion & Ads</h2>
                          </div>

                          {promotions.length === 0 ? (
                            <div style={{ padding: '0 20px', color: '#666', fontSize: '13px' }}>
                              No active promotions
                            </div>
                          ) : (
                            <div style={{ padding: '0 20px', position: 'relative' }}>
                              {(() => {
                                // Local variable or we need state? 
                                // We can't use hooks inside this callback easily if not already defined.
                                // I will define the Carousel logic inline using a wrapper component or just assume I can add state to App.
                                // I will use a simple implementation that relies on CSS scrolling or just map.
                                // User asked for "slide hone chahiye". 
                                // I better implement a proper carousel. 
                                // But I cannot add state easily without finding the top of the file again.
                                // I'll use a new component defined at the end of App.jsx or imported.
                                // Actually, I can use a key-based re-render trick or just use the index if I could.
                                // Let's create a specialized component `AdCarousel` in a new file and use it here?
                                // That is safer and cleaner. 
                              })()}
                              <AdCarousel promotions={promotions} />
                            </div>
                          )}
                        </section>


                        {/* Hindi Series Section */}
                        <section className="section">
                          <div className="section-header">
                            <h2 className="section-title">Hindi Series</h2>
                            <span className="section-link" onClick={() => navigate('/category/hindi-series')}>Show all</span>
                          </div>
                          <div className="horizontal-list hide-scrollbar">
                            {(contentSections?.hindi_series || []).map(movie => (
                              <motion.div
                                key={movie.id}
                                className="movie-card"
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleContentSelect(movie)}
                                style={{ cursor: 'pointer' }}
                              >
                                <div className="poster-container">
                                  <img
                                    src={getImageUrl(movie.poster?.url || movie.image)}
                                    onError={(e) => { e.target.src = `https://placehold.co/300x450/111/FFF?text=${movie.title}` }}
                                    alt={movie.title}
                                    className="poster-img"
                                  />
                                  {movie.isPaid && (
                                    <div style={{
                                      position: 'absolute', top: '8px', right: '8px',
                                      background: '#eab308', color: 'black', fontSize: '10px',
                                      padding: '2px 6px', fontWeight: 'bold', borderRadius: '2px'
                                    }}>
                                      PAID
                                    </div>
                                  )}
                                </div>
                                <h3 className="movie-title">{movie.title}</h3>
                              </motion.div>
                            ))}
                          </div>
                        </section>

                        {/* Bhojpuri Section */}
                        <section className="section">
                          <div className="section-header">
                            <h2 className="section-title">Bhojpuri World</h2>
                            <span className="section-link" onClick={() => navigate('/category/bhojpuri-world')}>Show all</span>
                          </div>
                          <div className="horizontal-list hide-scrollbar">
                            {(contentSections?.bhojpuri || []).map(movie => (
                              <motion.div
                                key={movie.id}
                                className="movie-card"
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleContentSelect(movie)}
                                style={{ cursor: 'pointer' }}
                              >
                                <div className="poster-container">
                                  <img
                                    src={getImageUrl(movie.poster?.url || movie.image)}
                                    onError={(e) => { e.target.src = `https://placehold.co/300x450/111/FFF?text=${movie.title}` }}
                                    alt={movie.title}
                                    className="poster-img"
                                  />
                                  {movie.isPaid && (
                                    <div style={{
                                      position: 'absolute', top: '8px', right: '8px',
                                      background: '#eab308', color: 'black', fontSize: '10px',
                                      padding: '2px 6px', fontWeight: 'bold', borderRadius: '2px'
                                    }}>
                                      PAID
                                    </div>
                                  )}
                                </div>
                                <h3 className="movie-title">{movie.title}</h3>
                              </motion.div>
                            ))}
                          </div>
                        </section>

                        <section className="section">
                          <div className="section-header">
                            <h2 className="section-title">Trending Songs</h2>
                            <span className="section-link" onClick={() => navigate('/category/trending-songs')}>Show all</span>
                          </div>
                          <div className="horizontal-list hide-scrollbar">
                            {contentSections.trending_song.map(song => (
                              <motion.div
                                key={song.id}
                                className="song-card"
                                whileTap={{ scale: 0.95 }}
                                // Song click could play song, for now showing details like movie
                                onClick={() => handleContentSelect({ ...song, description: `Artist: ${song.artist}` })}
                                style={{ cursor: 'pointer' }}
                              >
                                <div className="song-poster-container">
                                  <img
                                    src={getImageUrl(song.poster?.url || song.image)}
                                    onError={(e) => { e.target.src = `https://placehold.co/300x300/111/FFF?text=${song.title}` }}
                                    alt={song.title}
                                    className="poster-img"
                                  />
                                  <div style={{
                                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                  }}>
                                    <div style={{ background: 'rgba(0,0,0,0.6)', padding: '10px', borderRadius: '50%' }}>
                                      <Play fill="white" size={16} />
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <h3 className="song-title">{song.title}</h3>
                                  <p className="song-artist">{song.artist}</p>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </section>

                        {/* More Sections: Trending Now */}
                        <section className="section">
                          <div className="section-header">
                            <h2 className="section-title">Trending Now</h2>
                            <span className="section-link" onClick={() => navigate('/category/trending-now')}>Show all</span>
                          </div>
                          <div className="horizontal-list hide-scrollbar">
                            {contentSections.trending_now.map(movie => (
                              <motion.div
                                key={movie.id}
                                className="movie-card"
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleContentSelect(movie)}
                                style={{ cursor: 'pointer' }}
                              >
                                <div className="poster-container">
                                  <img
                                    src={getImageUrl(movie.poster?.url || movie.image)}
                                    onError={(e) => { e.target.src = `https://placehold.co/300x450/111/FFF?text=${movie.title}` }}
                                    alt={movie.title}
                                    className="poster-img"
                                  />
                                  {movie.isPaid && (
                                    <div style={{
                                      position: 'absolute', top: '8px', right: '8px',
                                      background: '#eab308', color: 'black', fontSize: '10px',
                                      padding: '2px 6px', fontWeight: 'bold', borderRadius: '2px'
                                    }}>
                                      PAID
                                    </div>
                                  )}
                                </div>
                                <h3 className="movie-title">{movie.title}</h3>
                              </motion.div>
                            ))}
                          </div>
                        </section>

                        {/* Broadcast Section */}
                        <section className="section">
                          <div className="section-header">
                            <h2 className="section-title">Broadcast</h2>
                            <span className="section-link" onClick={() => navigate('/category/broadcast')}>Show all</span>
                          </div>
                          <div className="horizontal-list hide-scrollbar">
                            {(contentSections?.broadcast || []).length === 0 ? (
                              <div style={{ padding: '0 20px', color: '#666', fontSize: '12px' }}>No Broadcasts yet</div>
                            ) : (
                              (contentSections?.broadcast || []).map(movie => (
                                <motion.div
                                  key={movie.id || movie._id}
                                  className="movie-card"
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleContentSelect(movie)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <div className="poster-container">
                                    <img
                                      src={getImageUrl(movie.poster?.url || movie.image)}
                                      onError={(e) => { e.target.src = `https://placehold.co/300x450/111/FFF?text=${movie.title}` }}
                                      alt={movie.title}
                                      className="poster-img"
                                    />
                                    {movie.isPaid && (
                                      <div style={{
                                        position: 'absolute', top: '8px', right: '8px',
                                        background: '#eab308', color: 'black', fontSize: '10px',
                                        padding: '2px 6px', fontWeight: 'bold', borderRadius: '2px'
                                      }}>
                                        PAID
                                      </div>
                                    )}
                                  </div>
                                  <h3 className="movie-title">{movie.title}</h3>
                                </motion.div>
                              ))
                            )}
                          </div>
                        </section>

                        {/* More Sections: Action Movies */}
                        <section className="section" style={{ paddingBottom: '40px' }}>
                          <div className="section-header">
                            <h2 className="section-title">Action Blockbusters</h2>
                            <span className="section-link" onClick={() => navigate('/category/action-blockbusters')}>Show all</span>
                          </div>
                          <div className="horizontal-list hide-scrollbar">
                            {contentSections.action.map(movie => (
                              <motion.div
                                key={movie.id}
                                className="movie-card"
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleContentSelect(movie)}
                                style={{ cursor: 'pointer' }}
                              >
                                <div className="poster-container">
                                  <img
                                    src={getImageUrl(movie.poster?.url || movie.image)}
                                    onError={(e) => { e.target.src = `https://placehold.co/300x450/111/FFF?text=${movie.title}` }}
                                    alt={movie.title}
                                    className="poster-img"
                                  />
                                  {movie.isPaid && (
                                    <div style={{
                                      position: 'absolute', top: '8px', right: '8px',
                                      background: '#eab308', color: 'black', fontSize: '10px',
                                      padding: '2px 6px', fontWeight: 'bold', borderRadius: '2px'
                                    }}>
                                      PAID
                                    </div>
                                  )}
                                </div>
                                <h3 className="movie-title">{movie.title}</h3>
                              </motion.div>
                            ))}
                          </div>
                        </section>
                      </>
                    ) : (
                      /* Category Grid View (New & Hot, etc.) or Dynamic Tab Page */
                      dynamicStructure.some(t => t.name === activeFilter) ? (
                        <DynamicTabPage
                          tab={dynamicStructure.find(t => t.name === activeFilter)}
                          onMovieClick={handleContentSelect}
                        />
                      ) : (
                        <CategoryGridView
                          activeFilter={activeFilter}
                          setSelectedMovie={handleContentSelect}
                          purchasedContent={purchasedContent}
                          originalsData={contentSections.originals}
                          trendingData={contentSections.trending_now}
                          newReleaseData={contentSections.new_release}
                          promotions={promotions}
                        />
                      )
                    )}
                  </motion.div>
                )}



                {activeTab === 'For You' && (
                  <motion.div
                    key="foryou"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 100 }}
                  >
                    <ForYouPage
                      onBack={() => navigate('/')}
                      likedVideos={likedVideos}
                      onToggleLike={handleToggleLike}
                    />
                  </motion.div>
                )}

                {/* Premium Tab Removed */}

                {location.pathname === '/my-space' && (
                  <motion.div
                    key="myspace"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <MySpacePage
                      currentUser={currentUser}
                      onMovieClick={handleContentSelect}
                      myList={myList}
                      likedVideos={likedVideos.filter(i => i.type !== 'reel' && i.type !== 'quick_byte')}
                      watchHistory={watchHistory.filter(i => i.type !== 'reel' && i.type !== 'quick_byte')}
                      continueWatching={continueWatching}
                      onToggleMyList={handleToggleMyList}
                      onToggleLike={handleToggleLike}
                    />
                  </motion.div>
                )}

                {location.pathname === '/history' && (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <HistoryPage
                      watchHistory={watchHistory.filter(i => i.type !== 'reel' && i.type !== 'quick_byte')}
                      onMovieClick={handleContentSelect}
                      onRefresh={loadUserProfile}
                    />
                  </motion.div>
                )}

                {location.pathname === '/my-list' && (
                  <motion.div
                    key="mylist"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <MyListPage
                      myList={myList}
                      onMovieClick={handleContentSelect}
                    />
                  </motion.div>
                )}

                {location.pathname === '/liked-videos' && (
                  <motion.div
                    key="liked-videos"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <LikedVideosPage
                      likedVideos={likedVideos}
                      onMovieClick={handleContentSelect}
                    />
                  </motion.div>
                )}


                {location.pathname === '/downloads' && (
                  <motion.div
                    key="downloads"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <DownloadsPage
                      onMovieClick={handleContentSelect}
                    />
                  </motion.div>
                )}

                {location.pathname === '/search' && (
                  <motion.div
                    key="search"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <SearchPage
                      allContent={allContent}
                      onMovieClick={handleContentSelect}
                    />
                  </motion.div>
                )}

                {location.pathname === '/settings' && (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <SettingsPage
                      currentUser={currentUser}
                      onUpdateUser={setCurrentUser}
                      onLogout={handleLogout}
                    />
                  </motion.div>
                )}

                {location.pathname.startsWith('/category/') && categorySlug && (
                  <motion.div
                    key="category"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CategoryPage
                      slug={categorySlug}
                      setSelectedMovie={setSelectedMovie}
                      purchasedContent={purchasedContent}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {selectedMovie && (
                  <MovieDetailsPage
                    movie={selectedMovie}
                    onClose={() => setSelectedMovie(null)}
                    onPlay={handlePlay}
                    myList={myList}
                    likedVideos={likedVideos}
                    onToggleMyList={handleToggleMyList}
                    onToggleLike={handleToggleLike}
                    isPurchased={purchasedContent.includes(selectedMovie._id || selectedMovie.id)}
                    onPurchase={handlePurchase}
                    onSelectMovie={setSelectedMovie}
                    recommendedContent={allContent.filter(item =>
                      item.type === selectedMovie.type &&
                      (item._id || item.id) !== (selectedMovie._id || selectedMovie.id)
                    )}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {toast && (
                  <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    style={{
                      position: 'fixed',
                      bottom: '100px',
                      left: '50%',
                      x: '-50%', // use framer motion x prop instead of transform in style to avoid conflict/overwrite
                      background: 'rgba(30,30,30,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white',
                      padding: '12px 24px',
                      borderRadius: '30px',
                      zIndex: 10000,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                      backdropFilter: 'blur(10px)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <div style={{ width: 8, height: 8, background: '#46d369', borderRadius: '50%' }}></div>
                    <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{toast}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Navigation */}
              {!isKeyboardOpen && (
                <nav className="bottom-nav" style={{ justifyContent: 'space-around' }}>
                  <NavItem
                    icon={<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><HomeIcon /> <span style={{ fontWeight: 800, letterSpacing: '0.5px' }}>InPlay</span></div>}
                    label="Home"
                    active={activeTab === 'Home' && activeFilter !== 'Audio Series'}
                    onClick={() => handleTabChange('Home')}
                    isPill
                  />
                  <NavItem icon={<Clapperboard size={24} />} label="For You" active={activeTab === 'For You'} onClick={() => handleTabChange('For You')} />
                  <NavItem icon={<Headphones size={24} />} label="Audio" active={activeFilter === 'Audio Series'} onClick={() => handleTabChange('Audio')} />
                  <NavItem icon={<Search size={24} />} label="Search" active={location.pathname === '/search'} onClick={() => handleTabChange('Search')} />
                  <NavItem icon={<User size={24} />} label="My Space" active={location.pathname === '/my-space'} onClick={() => handleTabChange('My Space')} />
                </nav>
              )}
            </>
          )
          }
        </div>
      } />
    </Routes >
  );
}


// ----------------------------------------------------------------------
// ROUTE WRAPPERS
// ----------------------------------------------------------------------

function ContentDetailsRoute({
  allContent,
  handlePlay,
  myList,
  likedVideos,
  handleToggleMyList,
  handleToggleLike,
  purchasedContent,
  handlePurchase
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    // 1. Try finding in loaded content
    let found = allContent.find(i => (i._id === id || i.id === id));
    if (found) {
      setMovie(found);
      return;
    }

    // 2. Fetch if not found
    if (!hasFetched.current) {
      hasFetched.current = true;
      contentService.getContentById(id)
        .then(data => {
          if (data) setMovie(data);
          else navigate('/', { replace: true });
        })
        .catch(() => navigate('/', { replace: true }));
    }
  }, [id, allContent, navigate]);

  if (!movie) return null; // Or a loading spinner

  return (
    <AnimatePresence>
      <MovieDetailsPage
        movie={movie}
        onClose={() => navigate(-1)} // Standard Back
        onPlay={handlePlay}
        myList={myList}
        likedVideos={likedVideos}
        onToggleMyList={handleToggleMyList}
        onToggleLike={handleToggleLike}
        isPurchased={purchasedContent.includes(movie._id || movie.id)}
        onPurchase={handlePurchase}
        onSelectMovie={(m) => navigate(`/content/${m._id || m.id}`)}
        recommendedContent={allContent.filter(item =>
          item.type === movie.type && (item._id || item.id) !== (movie._id || movie.id)
        )}
      />
    </AnimatePresence>
  );
}

function WatchPageRoute({
  allContent,
  handleToggleMyList,
  handleToggleLike,
  myList,
  likedVideos
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [movie, setMovie] = useState(location.state?.movie || null);
  const [episode, setEpisode] = useState(location.state?.episode || null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (movie) return;

    // 1. Try finding in loaded content
    let found = allContent.find(i => (i._id === id || i.id === id));
    if (found) {
      setMovie(found);
      return;
    }

    // 2. Fetch if not found in loaded content or passed via state
    if (!hasFetched.current) {
      hasFetched.current = true;

      // Try fetching as standard content first
      contentService.getContentById(id)
        .then(data => {
          if (data) setMovie(data);
          else throw new Error("Not standard content");
        })
        .catch(() => {
          // If 404 or fail, try fetching as Quick Byte
          contentService.getQuickByteById(id)
            .then(qbData => {
              if (qbData) setMovie(qbData);
              else navigate('/', { replace: true });
            })
            .catch(() => navigate('/', { replace: true }));
        });
    }
  }, [id, allContent, navigate, movie]);

  if (!movie) return <div style={{ background: 'black', height: '100vh' }} />;

  return (
    <AnimatePresence>
      <VideoPlayer
        movie={{ ...movie, video: movie.video?.url || movie.video }}
        episode={episode}
        onClose={() => navigate(-1)}
        onToggleMyList={handleToggleMyList}
        onToggleLike={handleToggleLike}
        myList={myList}
        likedVideos={likedVideos}
      />
    </AnimatePresence>
  );
}

// Custom Nav Item Component
function NavItem({ icon, active, onClick, isPill }) {
  // If it's the specific "Home" pill style from the image
  if (isPill) {
    return (
      <button
        className={`nav-item ${active ? 'active' : ''}`}
        onClick={onClick}
      >
        {active ? icon : <HomeIcon />}
      </button>
    )
  }

  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      {icon}
    </button>
  );
}

function HomeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
  )
}



function HeroSlide({ movie, onClick }) {
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    // Wait 1s, show video for 2s, then hide (total 3s lifecycle of video state active)
    const startTimer = setTimeout(() => setShowVideo(true), 1000);
    const stopTimer = setTimeout(() => setShowVideo(false), 3000);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(stopTimer);
    };
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}
      onClick={onClick}
    >
      <div style={{ position: 'absolute', inset: 0 }}>
        {/* Background Image */}
        <motion.img
          src={getImageUrl(movie.backdrop?.url || movie.backdrop || movie.poster?.url || movie.image)}
          alt={movie.title}
          className="hero-image"
          style={{ objectFit: 'cover', width: '100%', height: '100%', position: 'absolute', inset: 0 }}
          animate={{ opacity: showVideo ? 0 : 1 }}
          transition={{ duration: 0.5 }}
        />

        {/* Video Preview */}
        {showVideo && movie.video && (
          <motion.video
            src={movie.video?.url || movie.video}
            autoPlay
            muted
            loop
            playsInline
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ objectFit: 'cover', width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 1 }}
          />
        )}
      </div>

      <div className="hero-overlay" style={{ zIndex: 2 }}>
        <motion.div
          className="hero-content"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.h1
            variants={itemVariants}
            style={{
              fontSize: '3.5rem',
              fontWeight: 800,
              lineHeight: 0.9,
              marginBottom: '12px',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-2px',
              textTransform: 'uppercase',
              background: 'linear-gradient(to bottom, #ffffff 0%, #a5a5a5 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))'
            }}
          >
            {movie.title}
          </motion.h1>

          <motion.div
            variants={itemVariants}
            style={{
              fontSize: '1rem',
              fontWeight: 400,
              color: 'rgba(255,255,255,0.8)',
              marginBottom: '16px',
              maxWidth: '80%',
              lineHeight: '1.4'
            }}
          >
            {movie.description}
          </motion.div>

          <motion.div variants={itemVariants} className="hero-meta">
            <div className="rating-badge">
              <Star size={14} fill="#FFD700" stroke="none" />
              {movie.rating}
            </div>
            <span>|</span>
            <span>{movie.genre}</span>
            <span>|</span>
            <span>{movie.year}</span>
          </motion.div>
        </motion.div>

        <motion.button
          className="play-button-hero"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8, type: 'spring' }}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <Play size={24} fill="white" />
        </motion.button>
      </div>
    </motion.div>
  );
}


// Category Grid View Component handling both 'Originals' and 'New & Hot' layouts
function CategoryGridView({ activeFilter, setSelectedMovie, purchasedContent, originalsData, trendingData, newReleaseData, promotions }) {

  // --------------------------------------------------------
  // LAYOUT 1: ORIGINALS (Large Vertical Cards, 2 Columns)
  // --------------------------------------------------------
  if (activeFilter === 'Originals') {
    // Ensure ORIGINALS passed prop exists
    const data = originalsData || [];

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.3 }}
      >
        {/* Section Title */}
        <div className="section-header" style={{ marginBottom: '16px', marginTop: '16px' }}>
          <h2 className="section-title">InPlay Originals</h2>
        </div>

        <div className="originals-grid">
          {data.map(item => (
            <div key={item.id} className="original-card" onClick={() => setSelectedMovie(item)}>
              <div className="original-poster">
                <img
                  src={getImageUrl(item.poster?.url || item.image)}
                  alt={item.title}
                  onError={(e) => { e.target.src = `https://placehold.co/300x450/111/FFF?text=${item.title}` }}
                />
                {/* New Badge */}
                <div className="badge-new">New Release</div>

                {item.isPaid && (
                  <div style={{
                    position: 'absolute', top: '35px', left: '0px',
                    background: '#eab308', color: 'black', fontSize: '10px',
                    padding: '2px 6px', fontWeight: 'bold', borderRadius: '0 4px 4px 0',
                    zIndex: 20
                  }}>
                    PAID
                  </div>
                )}

                {/* Bookmark */}
                <div style={{ position: 'absolute', top: 8, right: 8 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                </div>

                {/* Play Count Overlay */}
                <div className="play-count-overlay">
                  <Play size={10} fill="white" stroke="none" />
                  <span>{(Math.random() * 10 + 1).toFixed(1)}Cr</span>
                </div>
              </div>

              <div className="original-info">
                <h3 className="original-title">{item.title}</h3>
                <div className="genre-tags">
                  <span className="genre-pill">{item.genre || 'Drama'}</span>
                  <span className="genre-pill">Survival</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    )
  }

  let hotData = trendingData || [];

  // Filter content based on the active tab (User Request: Isolation)
  if (activeFilter === 'New & Hot') {
    hotData = hotData.filter(item => item.isNewAndHot);
  } else if (activeFilter === 'Rankings') {
    hotData = hotData.filter(item => item.isRanking);
  } else if (activeFilter === 'Movies') {
    hotData = hotData.filter(item => item.isMovie || item.type === 'movie');
  } else if (activeFilter === 'TV') {
    hotData = hotData.filter(item => item.isTV || item.type === 'series' || item.type === 'hindi_series');
  } else if (activeFilter === 'Originals') {
    hotData = originalsData || [];
  } else if (activeFilter === 'Broadcast') {
    hotData = hotData.filter(item => item.isBroadcast);
  } else if (activeFilter === 'Crime Show') {
    hotData = hotData.filter(item => item.isCrimeShow);
  } else if (activeFilter === 'Mms') {
    hotData = hotData.filter(item => item.isMms);
  } else if (activeFilter === 'Audio Series') {
    hotData = hotData.filter(item => item.isAudioSeries);
  } else if (activeFilter === 'Short Film') {
    hotData = hotData.filter(item => item.isShortFilm);
  } else {
    // Default 'Popular' shows popular items
    hotData = hotData.filter(item => item.isPopular);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
    >
      {/* Section Title */}
      <div className="section-header" style={{ marginBottom: '16px', marginTop: '16px' }}>
        <h2 className="section-title">Hottest Shows</h2>
      </div>

      {/* Grid Layout */}
      <div className="category-grid-container">
        {/* We just map the data directly now, grid handles columns */}
        {hotData.slice(0, 6).map((item, index) => (
          <div key={item.id} className="hottest-card" onClick={() => setSelectedMovie(item)}>
            <div className="hottest-poster">
              <img
                src={getImageUrl(item.poster?.url || item.image)}
                alt={item.title}
                onError={(e) => { e.target.src = `https://placehold.co/300x450/111/FFF?text=${item.title}` }}
              />
              <div className="rank-number">{index + 1}</div>

              {item.isPaid && (
                <div style={{
                  position: 'absolute', top: '8px', right: '8px',
                  background: '#eab308', color: 'black', fontSize: '10px',
                  padding: '2px 6px', fontWeight: 'bold', borderRadius: '2px'
                }}>
                  PAID
                </div>
              )}
            </div>
            <div className="hottest-info">
              {/* Bookmark & Flame row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="flame-text">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a5.5 5.5 0 1 1-11 0c0-.536.058-1.055.166-1.555a6.66 6.66 0 0 0 1.334 1.555z"></path></svg>
                  {(Math.random() * 5 + 1).toFixed(1)}Cr
                </div>

                <div style={{ border: '1px solid #555', borderRadius: '4px', padding: '2px', lineHeight: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                </div>
              </div>

              <h3 className="hottest-title">{item.title}</h3>
              <div className="tag-pill">{item.genre || 'Drama'}</div>
            </div>
          </div>
        ))}
      </div>

      {/* New Release Section */}
      <section className="section" style={{ paddingBottom: '40px' }}>
        <div className="section-header">
          <h2 className="section-title">New Release</h2>
          <div className="tag-pill" style={{ background: 'red', color: 'white', fontSize: '10px' }}>FRESH</div>
        </div>
        <div className="horizontal-list hide-scrollbar">
          {newReleaseData.map(movie => (
            <motion.div
              key={movie.id}
              className="new-release-card"
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedMovie(movie)}
            >
              <img src={getImageUrl(movie.poster?.url || movie.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = `https://placehold.co/300x450/111/FFF?text=${movie.title}` }} />
              <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '12px 8px', background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 100%)' }}>
                <div style={{ color: 'white', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textShadow: '0 1px 2px black', lineHeight: 1.2 }}>{movie.title}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

// Wrap App with AudioPlayerProvider for global audio state
function AppWithAudioProvider() {
  return (
    <AudioPlayerProvider>
      <App />
      <FloatingAudioPlayer />
    </AudioPlayerProvider>
  );
}

export default AppWithAudioProvider;

