import { useEffect, useRef, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Play, Download, Search, Folder, User, Star, Crown, Layout, Sparkles, Plus, Check } from 'lucide-react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

gsap.registerPlugin(ScrollTrigger);
// Prevent removeChild error by disabling 100vh fix script
ScrollTrigger.config({ ignoreMobileResize: true });

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
import DownloadsPage from './DownloadsPage';
import SearchPage from './SearchPage';
import SettingsPage from './SettingsPage';
import AudioSeriesUserPage from './pages/AudioSeriesUserPage';

import VideoPlayer from './VideoPlayer';
import { AdminRoutes } from './model/admin';
import AdminLogin from './model/admin/components/AdminLogin';
import ProtectedRoute from './model/admin/components/ProtectedRoute';
import Login from './Login';
import Signup from './Signup';
import authService from './services/api/authService';
import contentService from './services/api/contentService';
import paymentService from './services/api/paymentService';


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
  const [showAuth, setShowAuth] = useState(null); // 'login' or 'signup'
  const [currentUser, setCurrentUser] = useState(null);
  const [quickBites, setQuickBites] = useState([]);
  const [contentSections, setContentSections] = useState({
    bhojpuri: [],
    trending_now: [],
    trending_song: [],
    hindi_series: [],
    action: [],
    new_release: [],
    originals: []
  });
  const [allContent, setAllContent] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

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
      return profile;
    } catch (err) {
      console.error('Failed to load user profile:', err);
    }
  };

  // Use Trending Now content for Hero Slideshow
  const heroMovies = contentSections.trending_now.length > 0 ? contentSections.trending_now : [];

  useEffect(() => {
    const fetchData = async () => {
      try {
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
          originals: []
        };

        if (Array.isArray(allContent)) {
          allContent.forEach(item => {
            if (item.type === 'bhojpuri') sections.bhojpuri.push(item);
            else if (item.type === 'trending_song') sections.trending_song.push(item);
            else if (item.type === 'hindi_series') sections.hindi_series.push(item);
            else if (item.type === 'action') sections.action.push(item);

            if (item.type === 'trending_now' || item.isPopular || item.isNewAndHot || item.isRanking || item.isMovie || item.isTV) sections.trending_now.push(item);
            if (item.type === 'new_release') sections.new_release.push(item);

            if (item.isOriginal) sections.originals.push(item);
          });
        }
        setContentSections(sections);
        setAllContent(allContent || []);

      } catch (error) {
        console.error("Failed to fetch content", error);
        setQuickBites([]);
      }
    };
    fetchData();
  }, []);

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
    'audio-series': 'Audio Series',
    'short-film': 'Short Film'
  };

  const reverseFilterMap = {
    'Popular': '',
    'New & Hot': 'new-and-hot',
    'Originals': 'originals',
    'Rankings': 'rankings',
    'Movies': 'movies',
    'TV': 'tv',
    'Broadcast': 'broadcast',
    'Mms': 'mms',
    'Audio Series': 'audio-series',
    'Short Film': 'short-film'
  };

  // Sync state with URL on mount and location change
  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return;

    // Normalize path: remove leading and trailing slashes
    const path = location.pathname.replace(/^\/|\/$/g, '');

    // Check if it's a category route
    if (filterMap[path]) {
      setActiveFilter(filterMap[path]);
      setActiveTab('Home');
    } else if (path === '' || path === 'home') {
      setActiveFilter('Popular');
      setActiveTab('Home');
    } else if (path === 'for-you') {
      setActiveTab('For You');
    } else if (path === 'my-space') {
      setActiveTab('My Space');
    } else if (path === 'search') {
      setActiveTab('Search');
    } else if (['history', 'my-list', 'downloads', 'settings'].includes(path)) {
      setActiveTab('My Space');
    }
  }, [location.pathname]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'Home') navigate('/');
    else if (tab === 'For You') navigate('/for-you');
    else if (tab === 'My Space') navigate('/my-space');
    else if (tab === 'Search') navigate('/search');
  };

  const handleFilterChange = (cat) => {
    setActiveFilter(cat);
    const slug = reverseFilterMap[cat] || '';
    navigate(`/${slug}`);
  };
  const heroRef = useRef(null);

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
      setShowAuth('login');
      return;
    }
    setPlayingMovie(movie);
    setPlayingEpisode(episode);
  };

  const handleToggleMyList = async (movie) => {
    if (!currentUser) {
      setShowAuth('login');
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

  const handleToggleLike = async (movie) => {
    if (!currentUser) {
      setShowAuth('login');
      return;
    }

    const contentId = movie._id || movie.id;

    if (typeof contentId === 'string') {
      try {
        const res = await authService.toggleLike(contentId);
        // res.action is 'liked' or 'unliked'
        const action = res.action === 'liked' ? "Added to Liked Videos" : "Removed from Liked Videos";
        showToast(action);

        // Re-fetch profile to sync likedVideos
        const profile = await authService.getProfile();
        setLikedVideos(profile.likedContent || []);
      } catch (error) {
        console.error("Failed to update like", error);
      }
    } else {
      showToast("Likes only supported for Real Content");
    }
  };

  const handlePurchase = async (movie) => {
    if (!currentUser) {
      setShowAuth('login');
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

      // 2. Options
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

  const handleAuthSuccess = () => {
    const savedUser = localStorage.getItem('inplay_current_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setMyList(user.myList || []);
      setLikedVideos(user.likedContent || []);
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
  }, []);

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
      <Route path="/*" element={
        <div className="app-container">
          <AnimatePresence mode="wait">
            {loading && <SplashScreen key="splash" />}
          </AnimatePresence>

          {!loading && (
            <>
              {/* Static Search Bar */}
              {activeTab !== 'For You' &&
                location.pathname !== '/history' &&
                location.pathname !== '/my-list' &&
                location.pathname !== '/downloads' &&
                location.pathname !== '/settings' &&
                !selectedMovie && (
                  <div className="sticky-search-bar">
                    <Search size={20} color="#777" />
                    <input type="text" placeholder="Search movies, shows..." className="search-input" />

                  </div>
                )}

              <AnimatePresence>
                {selectedMovie && (
                  <MovieDetailsPage
                    movie={selectedMovie}
                    onClose={() => setSelectedMovie(null)}
                    onPlay={handlePlay}
                    myList={myList}
                    likedVideos={likedVideos}
                    onToggleMyList={toggleMyList}
                    onToggleLike={toggleLike}
                    isPurchased={purchasedContent.includes(selectedMovie.id)}
                    onPurchase={handlePurchase}
                  />
                )}
              </AnimatePresence>

              {activeTab === 'Home' && !selectedMovie && (
                <div className="category-tabs-container hide-scrollbar">
                  {['Popular', 'New & Hot', 'Originals', 'Rankings', 'Movies', 'TV', 'Broadcast', 'Mms', 'Audio Series', 'Short Film'].map((filter) => (
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
                    {activeFilter === 'Audio Series' ? (
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
                                    if (isActive) setSelectedMovie(movie)
                                    else if (visualOffset === -1) setCurrentHeroIndex((prev) => (prev - 1 + heroMovies.length) % heroMovies.length)
                                    else if (visualOffset === 1) setCurrentHeroIndex((prev) => (prev + 1) % heroMovies.length)
                                  }}
                                >
                                  <img src={movie.backdrop?.url || movie.backdrop || movie.poster?.url || movie.image} alt={movie.title} className="hero-image" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

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
                                        <div style={{
                                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                                          padding: '6px 14px', background: 'rgba(255,255,255,0.1)',
                                          backdropFilter: 'blur(10px)', borderRadius: '20px', fontSize: '0.75rem',
                                          color: '#46d369', border: '1px solid rgba(70, 211, 105, 0.3)', marginBottom: '16px',
                                          fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px'
                                        }}>
                                          <Sparkles size={12} fill="#46d369" /> #{index + 1} Trending
                                        </div>

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



                                        <h2 className="hero-title" style={{
                                          fontSize: '1.8rem',
                                          fontWeight: '900',
                                          lineHeight: '0.9',
                                          marginBottom: '8px',
                                          textTransform: 'uppercase',
                                          fontStyle: 'italic',
                                          color: 'white',
                                          textShadow: '0 4px 10px rgba(0,0,0,0.5)',
                                          fontFamily: 'var(--font-display)'
                                        }}>
                                          {movie.title}
                                        </h2>

                                        <div className="hero-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#ccc', marginBottom: '16px' }}>
                                          <span style={{ color: '#46d369', fontWeight: 'bold' }}>{Math.round(movie.rating * 10)}% Match</span>
                                          <span style={{ opacity: 0.3 }}>|</span>
                                          <span>{movie.year}</span>
                                          <span style={{ opacity: 0.3 }}>|</span>
                                          <span style={{ background: 'rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>HD</span>
                                          <a style={{ opacity: 0.3 }}>|</a>
                                          <span>{movie.genre}</span>
                                        </div>

                                        {/* Action Buttons Row */}
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%' }}>
                                          <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (movie.isPaid && !purchasedContent.includes(movie.id)) {
                                                setSelectedMovie(movie); // Open details to buy
                                              } else {
                                                handlePlay(movie);
                                              }
                                            }}
                                            style={{
                                              flex: 1, height: '40px', borderRadius: '12px', border: 'none',
                                              background: 'white', color: 'black', fontSize: '1rem', fontWeight: '700',
                                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                              cursor: 'pointer', boxShadow: '0 4px 20px rgba(255,255,255,0.2)'
                                            }}
                                          >
                                            {movie.isPaid && !purchasedContent.includes(movie.id) ? <Crown size={20} fill="#eab308" stroke="none" /> : <Play size={20} fill="black" />}
                                            {movie.isPaid && !purchasedContent.includes(movie.id) ? "Unlock Now" : "Watch Now"}
                                          </motion.button>

                                          <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={(e) => { e.stopPropagation(); toggleMyList(movie); }}
                                            style={{
                                              width: '40px', height: '40px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)',
                                              background: 'rgba(255,255,255,0.1)', color: 'white',
                                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                                              cursor: 'pointer', backdropFilter: 'blur(10px)'
                                            }}
                                          >
                                            {myList.find(m => m.id === movie.id) ? <Check size={24} color="#46d369" /> : <Plus size={24} />}
                                          </motion.button>
                                        </div>
                                      </motion.div>
                                    )}
                                  </div>
                                </motion.div>
                              )
                            })}
                          </div>
                        </div>



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
                                  onClick={() => setSelectedMovie(show)}
                                >
                                  <div className="poster-container" style={{ borderRadius: '8px', overflow: 'hidden', height: '180px', width: '100%', position: 'relative' }}>
                                    <img
                                      src={show.image}
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
                                    onClick={() => setSelectedMovie(verticalItem)}
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
                                        src={verticalItem.image}
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


                        {/* Hindi Series Section */}
                        <section className="section">
                          <div className="section-header">
                            <h2 className="section-title">Hindi Series</h2>
                            <a href="#" className="section-link">Show all</a>
                          </div>
                          <div className="horizontal-list hide-scrollbar">
                            {contentSections.hindi_series.map(movie => (
                              <motion.div
                                key={movie.id}
                                className="movie-card"
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedMovie(movie)}
                                style={{ cursor: 'pointer' }}
                              >
                                <div className="poster-container">
                                  <img
                                    src={movie.poster?.url || movie.image}
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
                            <a href="#" className="section-link">Show all</a>
                          </div>
                          <div className="horizontal-list hide-scrollbar">
                            {contentSections.bhojpuri.map(movie => (
                              <motion.div
                                key={movie.id}
                                className="movie-card"
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedMovie(movie)}
                                style={{ cursor: 'pointer' }}
                              >
                                <div className="poster-container">
                                  <img
                                    src={movie.poster?.url || movie.image}
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

                        {/* Songs Section */}
                        <section className="section">
                          <div className="section-header">
                            <h2 className="section-title">Trending Songs</h2>
                            <a href="#" className="section-link">Show all</a>
                          </div>
                          <div className="horizontal-list hide-scrollbar">
                            {contentSections.trending_song.map(song => (
                              <motion.div
                                key={song.id}
                                className="song-card"
                                whileTap={{ scale: 0.95 }}
                                // Song click could play song, for now showing details like movie
                                onClick={() => setSelectedMovie({ ...song, description: `Artist: ${song.artist}` })}
                                style={{ cursor: 'pointer' }}
                              >
                                <div className="song-poster-container">
                                  <img
                                    src={song.poster?.url || song.image}
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
                            <a href="#" className="section-link">Show all</a>
                          </div>
                          <div className="horizontal-list hide-scrollbar">
                            {contentSections.trending_now.map(movie => (
                              <motion.div
                                key={movie.id}
                                className="movie-card"
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedMovie(movie)}
                                style={{ cursor: 'pointer' }}
                              >
                                <div className="poster-container">
                                  <img
                                    src={movie.poster?.url || movie.image}
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

                        {/* More Sections: Action Movies */}
                        <section className="section" style={{ paddingBottom: '100px' }}>
                          <div className="section-header">
                            <h2 className="section-title">Action Blockbusters</h2>
                            <a href="#" className="section-link">Show all</a>
                          </div>
                          <div className="horizontal-list hide-scrollbar">
                            {contentSections.action.map(movie => (
                              <motion.div
                                key={movie.id}
                                className="movie-card"
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedMovie(movie)}
                                style={{ cursor: 'pointer' }}
                              >
                                <div className="poster-container">
                                  <img
                                    src={movie.poster?.url || movie.image}
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
                      /* Category Grid View (New & Hot, etc.) */
                      <CategoryGridView
                        activeFilter={activeFilter}
                        setSelectedMovie={setSelectedMovie}
                        purchasedContent={purchasedContent}
                        originalsData={contentSections.originals}
                        trendingData={contentSections.trending_now}
                        newReleaseData={contentSections.new_release}
                      />
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
                      onBack={() => setActiveTab('Home')}
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
                      onMovieClick={(movie) => setSelectedMovie(movie)}
                      myList={myList}
                      likedVideos={likedVideos}
                      watchHistory={watchHistory}
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
                      watchHistory={watchHistory}
                      onMovieClick={(movie) => setSelectedMovie(movie)}
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
                      onMovieClick={(movie) => setSelectedMovie(movie)}
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
                      onMovieClick={(movie) => setSelectedMovie(movie)}
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
                      onMovieClick={(movie) => setSelectedMovie(movie)}
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
                    isPurchased={purchasedContent.includes(selectedMovie.id)}
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
              {activeTab !== 'For You' && (
                <nav className="bottom-nav" style={{ justifyContent: 'space-around' }}>
                  <NavItem
                    icon={<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><HomeIcon /> <span style={{ fontWeight: 800, letterSpacing: '0.5px' }}>InPlay</span></div>}
                    label="Home"
                    active={activeTab === 'Home'}
                    onClick={() => handleTabChange('Home')}
                    isPill
                  />
                  <NavItem icon={<Sparkles size={24} />} label="For You" active={activeTab === 'For You'} onClick={() => handleTabChange('For You')} />
                  <NavItem icon={<Search size={24} />} label="Search" active={activeTab === 'Search'} onClick={() => handleTabChange('Search')} />
                  {/* <NavItem icon={<Crown size={24} />} label="Premium" active={activeTab === 'Premium'} onClick={() => setActiveTab('Premium')} /> */}
                  <NavItem icon={<Layout size={24} />} label="My Space" active={activeTab === 'My Space'} onClick={() => handleTabChange('My Space')} />
                </nav>
              )}
            </>
          )}
          {/* Video Player Overlay */}
          <AnimatePresence>
            {playingMovie && (
              <VideoPlayer
                movie={{ ...playingMovie, video: playingMovie.video?.url || playingMovie.video }}
                episode={playingEpisode}
                onClose={() => {
                  setPlayingMovie(null);
                  setPlayingEpisode(null);
                  loadUserProfile();
                }}
              />
            )}
          </AnimatePresence>

          {/* Authentication Modals */}
          <AnimatePresence>
            {showAuth === 'login' && (
              <Login
                onClose={() => setShowAuth(null)}
                onSwitchToSignup={() => setShowAuth('signup')}
                onLoginSuccess={handleAuthSuccess}
              />
            )}
            {showAuth === 'signup' && (
              <Signup
                onClose={() => setShowAuth(null)}
                onSwitchToLogin={() => setShowAuth('login')}
                onSignupSuccess={handleAuthSuccess}
              />
            )}
          </AnimatePresence>
        </div>
      } />
    </Routes >
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
          src={movie.backdrop?.url || movie.backdrop || movie.poster?.url || movie.image}
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

export default App;

// Category Grid View Component handling both 'Originals' and 'New & Hot' layouts
function CategoryGridView({ activeFilter, setSelectedMovie, purchasedContent, originalsData, trendingData, newReleaseData }) {

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
                  src={item.poster?.url || item.image}
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
                src={item.poster?.url || item.image}
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
      <section className="section" style={{ paddingBottom: '100px' }}>
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
              <img src={movie.poster?.url || movie.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = `https://placehold.co/300x450/111/FFF?text=${movie.title}` }} />
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

