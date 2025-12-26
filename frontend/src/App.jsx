import { useEffect, useRef, useState } from 'react';
import { Play, Download, Search, Folder, User, Star, Crown, Layout } from 'lucide-react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

gsap.registerPlugin(ScrollTrigger);

// Mock Data
import { MOVIES, CATEGORIES, CONTINUE_WATCHING } from './data';
import SubscriptionPage from './SubscriptionPage';
import MySpacePage from './MySpacePage';
import MovieDetailsPage from './MovieDetailsPage';
import SplashScreen from './SplashScreen';

const TRENDING = MOVIES;
const LATEST = MOVIES;

const FILTERS = CATEGORIES;

function App() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Home');
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const heroRef = useRef(null);

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
          {/* Sticky Search Bar */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                className="sticky-search-bar"
                initial={{ y: -100, opacity: 0, x: '-50%' }}
                animate={{ y: 0, opacity: 1, x: '-50%' }}
                exit={{ y: -100, opacity: 0, x: '-50%' }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              >
                <Search size={20} color="rgba(255,255,255,0.7)" />
                <input type="text" placeholder="Search movies, shows..." className="search-input" />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {selectedMovie && (
              <MovieDetailsPage movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
            )}
          </AnimatePresence>

          {/* Hero Section Slider */}
          <AnimatePresence mode='wait'>
            {activeTab === 'Home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Hero Section Slider */}
                <div className="hero" ref={heroRef} style={{ overflow: 'hidden', position: 'relative' }}>
                  <AnimatePresence mode='wait'>
                    <HeroSlide key={currentMovie.id} movie={currentMovie} onClick={() => setSelectedMovie(currentMovie)} />
                  </AnimatePresence>
                </div>


                {/* Continue Watching Section */}
                <section className="section" style={{ marginTop: '12px' }}>
                  <div className="section-header">
                    <h2 className="section-title">Continue Watching</h2>
                  </div>
                  <div className="horizontal-list hide-scrollbar">
                    {CONTINUE_WATCHING.map(show => (
                      <motion.div
                        key={show.id}
                        className="continue-card"
                        whileTap={{ scale: 0.95 }}
                        style={{ minWidth: '200px', marginRight: '16px', position: 'relative', cursor: 'pointer' }}
                        onClick={() => setSelectedMovie(show)}
                      >
                        <div className="poster-container" style={{ borderRadius: '12px', overflow: 'hidden', height: '120px' }}>
                          <img
                            src={show.image}
                            alt={show.title}
                            className="poster-img"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div style={{
                            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <Play fill="white" size={32} style={{ opacity: 0.8 }} />
                          </div>
                        </div>
                        <div style={{ marginTop: '8px' }}>
                          <h4 style={{ fontSize: '14px', marginBottom: '4px' }}>{show.title}</h4>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>
                            <span>{show.episode}</span>
                          </div>
                          <div style={{ height: '3px', background: '#333', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${show.progress}%`, height: '100%', background: 'var(--primary-color, #e50914)' }}></div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>

                {/* Top 10 Section */}
                <section className="section">
                  <div className="section-header">
                    <h2 className="section-title">Top 10 in India Today</h2>
                  </div>
                  <div className="horizontal-list hide-scrollbar" style={{ paddingLeft: '20px' }}>
                    {MOVIES.slice(0, 5).map((movie, index) => (
                      <motion.div
                        key={movie.id}
                        className="top10-card"
                        whileTap={{ scale: 0.95 }}
                        style={{ minWidth: '120px', marginRight: '16px', position: 'relative', display: 'flex', alignItems: 'flex-end', cursor: 'pointer' }}
                        onClick={() => setSelectedMovie(movie)}
                      >
                        <span style={{
                          fontSize: '80px', fontWeight: '900', color: 'transparent',
                          WebkitTextStroke: '2px rgba(255,255,255,0.5)', lineHeight: '0.8',
                          position: 'relative', right: '-8px', zIndex: 0,
                          fontFamily: 'var(--font-display)', letterSpacing: '-4px',
                          filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))'
                        }}>
                          {index + 1}
                        </span>
                        <div className="poster-container" style={{
                          borderRadius: '8px', overflow: 'hidden', height: '160px', width: '110px',
                          zIndex: 1, boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
                        }}>
                          <img
                            src={movie.image}
                            alt={movie.title}
                            className="poster-img"
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>

                {/* Trending Section */}
                <section className="section">
                  <div className="section-header">
                    <h2 className="section-title">Trending Now</h2>
                    <a href="#" className="section-link">Show all</a>
                  </div>
                  <div className="horizontal-list hide-scrollbar">
                    {TRENDING.map(movie => (
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

                {/* Latest Shows Section */}
                <section className="section" style={{ paddingBottom: '100px' }}>
                  <div className="section-header">
                    <h2 className="section-title">Latest Shows</h2>
                    <a href="#" className="section-link">Show all</a>
                  </div>

                  <div className="filters-list hide-scrollbar">
                    {FILTERS.map(filter => (
                      <button
                        key={filter}
                        className={`filter-chip ${activeFilter === filter ? 'active' : ''}`}
                        onClick={() => setActiveFilter(filter)}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>

                  <div className="horizontal-list hide-scrollbar">
                    {LATEST.map(movie => (
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
                <MySpacePage onMovieClick={(movie) => setSelectedMovie(movie)} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Navigation */}
          <nav className="bottom-nav" style={{ justifyContent: 'space-around' }}>
            <NavItem
              icon={<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><HomeIcon /> Home</div>}
              label="Home"
              active={activeTab === 'Home'}
              onClick={() => setActiveTab('Home')}
              isPill
            />
            <NavItem icon={<Crown size={24} />} label="Premium" active={activeTab === 'Premium'} onClick={() => setActiveTab('Premium')} />
            <NavItem icon={<Layout size={24} />} label="My Space" active={activeTab === 'My Space'} onClick={() => setActiveTab('My Space')} />
          </nav>
        </>
      )}
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
