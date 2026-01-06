import { useEffect, useRef, useState } from 'react';
import { Play, Download, Search, Folder, User, Star, Crown, Layout, Sparkles, Plus, Check } from 'lucide-react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

gsap.registerPlugin(ScrollTrigger);

// Mock Data
import { MOVIES, CONTINUE_WATCHING } from './data';
import { HINDI_SERIES, BHOJPURI_CONTENT, SONGS, TRENDING_NOW, ACTION_MOVIES, ORIGINALS } from './newData';
import SubscriptionPage from './SubscriptionPage';
import MySpacePage from './MySpacePage';
import MovieDetailsPage from './MovieDetailsPage';
import ForYouPage from './ForYouPage';
import SplashScreen from './SplashScreen';

import VideoPlayer from './VideoPlayer';

const FILTERS = ['All', 'Movies', 'TV Shows', 'Anime'];

function App() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Home');
  const [activeFilter, setActiveFilter] = useState('Popular');
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [playingMovie, setPlayingMovie] = useState(null);
  const [myList, setMyList] = useState([MOVIES[0]]); // Pre-populate for demo
  const [likedVideos, setLikedVideos] = useState([]);
  const [toast, setToast] = useState(null);
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

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Smooth Scroll Setup
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

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
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
      setCurrentHeroIndex((prev) => (prev + 1) % MOVIES.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(timer);
  }, []);

  const [showSearch, setShowSearch] = useState(false);

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

  const currentMovie = MOVIES[currentHeroIndex];

  return (
    <div className="app-container">
      <AnimatePresence mode="wait">
        {loading && <SplashScreen key="splash" />}
      </AnimatePresence>

      {!loading && (
        <>
          {/* Static Search Bar */}
          {activeTab !== 'For You' && !selectedMovie && (
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
                onPlay={setPlayingMovie}
                myList={myList}
                likedVideos={likedVideos}
                onToggleMyList={toggleMyList}
                onToggleLike={toggleLike}
              />
            )}
          </AnimatePresence>

          <AnimatePresence mode='wait'>
            {activeTab === 'Home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Category Tabs Header */}
                {!selectedMovie && (
                  <div className="category-tabs-container hide-scrollbar">
                    {['Popular', 'New & Hot', 'Originals', 'Rankings', 'Movies', 'TV'].map(cat => (
                      <div
                        key={cat}
                        className={`category-tab ${activeFilter === cat ? 'active' : ''}`}
                        onClick={() => setActiveFilter(cat)}
                      >
                        {cat}
                      </div>
                    ))}
                  </div>
                )}

                {/* Content Switching based on Filter */}
                {activeFilter === 'Popular' || activeFilter === 'All' ? (
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
                        {MOVIES.map((movie, index) => {
                          // Calculate relative position
                          let position = index - currentHeroIndex;
                          // Handle wrap around if we wanted, but for now simple finite or infinite loop logic? 
                          // Let's stick to simple finite for stability, or basic loop visual.

                          // If we want infinite loop visual, we need modulo arithmetic.
                          const total = MOVIES.length;
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
                              key={movie.id}
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
                                  setCurrentHeroIndex((prev) => (prev - 1 + MOVIES.length) % MOVIES.length);
                                } else if (offset.x < -50) {
                                  setCurrentHeroIndex((prev) => (prev + 1) % MOVIES.length);
                                }
                              }}
                              onClick={() => {
                                if (isActive) setSelectedMovie(movie)
                                else if (visualOffset === -1) setCurrentHeroIndex((prev) => (prev - 1 + MOVIES.length) % MOVIES.length)
                                else if (visualOffset === 1) setCurrentHeroIndex((prev) => (prev + 1) % MOVIES.length)
                              }}
                            >
                              <img src={movie.backdrop || movie.image} alt={movie.title} className="hero-image" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

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
                                        onClick={(e) => { e.stopPropagation(); setPlayingMovie(movie); }}
                                        style={{
                                          flex: 1, height: '40px', borderRadius: '12px', border: 'none',
                                          background: 'white', color: 'black', fontSize: '1rem', fontWeight: '700',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                          cursor: 'pointer', boxShadow: '0 4px 20px rgba(255,255,255,0.2)'
                                        }}
                                      >
                                        <Play size={20} fill="black" /> Watch Now
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
                        {CONTINUE_WATCHING.map(show => (
                          <motion.div
                            key={show.id}
                            className="continue-card"
                            whileTap={{ scale: 0.95 }}
                            style={{ minWidth: '120px', marginRight: '12px', position: 'relative', cursor: 'pointer' }}
                            onClick={() => setSelectedMovie(show)}
                          >
                            <div className="poster-container" style={{ borderRadius: '8px', overflow: 'hidden', height: '170px', width: '100%', position: 'relative' }}>
                              <img
                                src={show.image}
                                alt={show.title}
                                className="poster-img"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { e.target.src = 'https://placehold.co/200x300/333/FFF?text=' + show.title.substring(0, 5) }}
                              />
                              {/* Bookmark Icon */}
                              <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', padding: '4px' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                              </div>

                              {/* Gradient Overlay for Text */}
                              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '60%', background: 'linear-gradient(to top, rgba(0,0,0,0.95), transparent)' }}></div>

                              {/* Text Info */}
                              <div style={{ position: 'absolute', bottom: '8px', left: '8px', right: '8px', zIndex: 2 }}>
                                <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)', marginBottom: '4px', lineHeight: '1.1' }}>
                                  {show.title}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#ccc', fontWeight: '500' }}>
                                  <span>{show.episode}</span>
                                  <span>▶ 90.5L</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </section>

                    {/* Hindi Series Section */}
                    <section className="section">
                      <div className="section-header">
                        <h2 className="section-title">Hindi Series</h2>
                        <a href="#" className="section-link">Show all</a>
                      </div>
                      <div className="horizontal-list hide-scrollbar">
                        {HINDI_SERIES.map(movie => (
                          <motion.div
                            key={movie.id}
                            className="movie-card"
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedMovie(movie)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="poster-container">
                              <img
                                src={movie.image}
                                onError={(e) => { e.target.src = `https://placehold.co/300x450/111/FFF?text=${movie.title}` }}
                                alt={movie.title}
                                className="poster-img"
                              />
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
                        {BHOJPURI_CONTENT.map(movie => (
                          <motion.div
                            key={movie.id}
                            className="movie-card"
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedMovie(movie)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="poster-container">
                              <img
                                src={movie.image}
                                onError={(e) => { e.target.src = `https://placehold.co/300x450/111/FFF?text=${movie.title}` }}
                                alt={movie.title}
                                className="poster-img"
                              />
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
                        {SONGS.map(song => (
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
                                src={song.image}
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
                        {TRENDING_NOW.map(movie => (
                          <motion.div
                            key={movie.id}
                            className="movie-card"
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedMovie(movie)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="poster-container">
                              <img
                                src={movie.image}
                                onError={(e) => { e.target.src = `https://placehold.co/300x450/111/FFF?text=${movie.title}` }}
                                alt={movie.title}
                                className="poster-img"
                              />
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
                        {ACTION_MOVIES.map(movie => (
                          <motion.div
                            key={movie.id}
                            className="movie-card"
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedMovie(movie)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="poster-container">
                              <img
                                src={movie.image}
                                onError={(e) => { e.target.src = `https://placehold.co/300x450/111/FFF?text=${movie.title}` }}
                                alt={movie.title}
                                className="poster-img"
                              />
                            </div>
                            <h3 className="movie-title">{movie.title}</h3>
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  </>
                ) : (
                  /* Category Grid View (New & Hot, etc.) */
                  <CategoryGridView activeFilter={activeFilter} setSelectedMovie={setSelectedMovie} />
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
                <ForYouPage onBack={() => setActiveTab('Home')} />
              </motion.div>
            )}

            {activeTab === 'Premium' && (
              <motion.div
                key="premium"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <SubscriptionPage onSubscribe={() => alert("Subscription flow starting...")} />
              </motion.div>
            )}

            {activeTab === 'My Space' && (
              <motion.div
                key="myspace"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <MySpacePage
                  onMovieClick={(movie) => setSelectedMovie(movie)}
                  myList={myList}
                  likedVideos={likedVideos}
                />
              </motion.div>
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
                icon={<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><HomeIcon /> Home</div>}
                label="Home"
                active={activeTab === 'Home'}
                onClick={() => setActiveTab('Home')}
                isPill
              />
              <NavItem icon={<Sparkles size={24} />} label="For You" active={activeTab === 'For You'} onClick={() => setActiveTab('For You')} />
              <NavItem icon={<Crown size={24} />} label="Premium" active={activeTab === 'Premium'} onClick={() => setActiveTab('Premium')} />
              <NavItem icon={<Layout size={24} />} label="My Space" active={activeTab === 'My Space'} onClick={() => setActiveTab('My Space')} />
            </nav>
          )}
        </>
      )}
      {/* Video Player Overlay */}
      <AnimatePresence>
        {playingMovie && (
          <VideoPlayer movie={playingMovie} onClose={() => setPlayingMovie(null)} />
        )}
      </AnimatePresence>
    </div>
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
          src={movie.backdrop || movie.image}
          alt={movie.title}
          className="hero-image"
          style={{ objectFit: 'cover', width: '100%', height: '100%', position: 'absolute', inset: 0 }}
          animate={{ opacity: showVideo ? 0 : 1 }}
          transition={{ duration: 0.5 }}
        />

        {/* Video Preview */}
        {showVideo && movie.video && (
          <motion.video
            src={movie.video}
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
function CategoryGridView({ activeFilter, setSelectedMovie }) {

  // --------------------------------------------------------
  // LAYOUT 1: ORIGINALS (Large Vertical Cards, 2 Columns)
  // --------------------------------------------------------
  if (activeFilter === 'Originals') {
    // Ensure ORIGINALS exists
    const originalsData = ORIGINALS || [];

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
          {originalsData.map(item => (
            <div key={item.id} className="original-card" onClick={() => setSelectedMovie(item)}>
              <div className="original-poster">
                <img
                  src={item.image}
                  alt={item.title}
                  onError={(e) => { e.target.src = `https://placehold.co/300x450/111/FFF?text=${item.title}` }}
                />
                {/* New Badge */}
                <div className="badge-new">New Release</div>

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

  // --------------------------------------------------------
  // LAYOUT 2: HOTTEST SHOWS (Ranked, Side Info)
  // --------------------------------------------------------
  const data = TRENDING_NOW || [];

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
        {data.slice(0, 6).map((item, index) => (
          <div key={item.id} className="hottest-card" onClick={() => setSelectedMovie(item)}>
            <div className="hottest-poster">
              <img
                src={item.image}
                alt={item.title}
                onError={(e) => { e.target.src = `https://placehold.co/300x450/111/FFF?text=${item.title}` }}
              />
              <div className="rank-number">{index + 1}</div>
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
          {MOVIES.map(movie => (
            <motion.div
              key={movie.id}
              className="new-release-card"
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedMovie(movie)}
            >
              <img src={movie.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = `https://placehold.co/300x450/111/FFF?text=${movie.title}` }} />
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
