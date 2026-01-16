import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Play, Download, Search, Folder, User, Star, Crown, Layout, Sparkles, Plus, Check } from 'lucide-react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, AnimatePresence } from 'framer-motion';

// Mock Data
import { MOVIES, CONTINUE_WATCHING } from './data';
import { HINDI_SERIES, BHOJPURI_CONTENT, SONGS, TRENDING_NOW, ACTION_MOVIES, ORIGINALS } from './newData';
// import SubscriptionPage from './SubscriptionPage'; // Removed
import MySpacePage from './MySpacePage';
import contentService from './services/api/contentService';
import MovieDetailsPage from './MovieDetailsPage';
import ForYouPage from './ForYouPage';
import SplashScreen from './SplashScreen';
import VideoPlayer from './VideoPlayer';
import Login from './Login';
import Signup from './Signup';

gsap.registerPlugin(ScrollTrigger);

const FILTERS = ['All', 'Movies', 'TV Shows', 'Anime'];

function HomePage({
  activeFilter,
  setActiveFilter,
  currentHeroIndex,
  setCurrentHeroIndex,
  selectedMovie,
  setSelectedMovie,
  playingMovie,
  setPlayingMovie,
  myList,
  toggleMyList,
  likedVideos,
  toggleLike,
  purchasedContent,
  handlePurchase,
  handlePlay,
  showToast
}) {
  const heroRef = useRef(null);
  const [quickBites, setQuickBites] = useState([]);

  useEffect(() => {
    const fetchQuickBites = async () => {
      try {
        const reels = await contentService.getQuickBytes(20);
        setQuickBites(reels);
      } catch (error) {
        console.error("Failed to fetch quick bites", error);
      }
    };
    fetchQuickBites();
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

  const currentMovie = MOVIES[currentHeroIndex];

  return (
    <div className="app-container">
      {/* Static Search Bar */}
      {!selectedMovie && (
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

      {!selectedMovie && (
        <>
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

          <AnimatePresence mode='wait'>
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

                      // Simplified: active is `currentHeroIndex`.
                      // We want active to be at `left: 10%`, width `80%`.
                      // Prev at `left: -80% + 10px`.
                      // Next at `left: 90% + 10px`.

                      const isActive = index === currentHeroIndex;
                      const isPrev = index === (currentHeroIndex - 1 + MOVIES.length) % MOVIES.length; // wrap logic prev
                      const isNext = index === (currentHeroIndex + 1) % MOVIES.length; // wrap logic next

                      // We only render text/detail if Active.
                      // Helper to get visual offset.
                      // 0 is center. -1 is left. 1 is right.
                      let visualOffset = 100; // far away
                      if (index === currentHeroIndex) visualOffset = 0;
                      else if (index === (currentHeroIndex - 1 + MOVIES.length) % MOVIES.length) visualOffset = -1;
                      else if (index === (currentHeroIndex + 1) % MOVIES.length) visualOffset = 1;

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
                            background: 'linear-gradient(to top, rgba(8,8,8,0.8) 0%, rgba(8,8,8,0.6) 40%, transparent 100%)',
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
                                  <span style={{ opacity: 0.3 }}>|</span>
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

                {/* Quick Bites (Vertical Content) Section */}
                {/* This section contains ONLY vertical content as requested */}
                <section className="section" style={{ marginBottom: '40px' }}>
                  <div className="section-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h2 className="section-title" style={{ color: '#ff4d4d' }}>Quick Bites</h2>
                      <span style={{ fontSize: '0.7rem', background: '#333', padding: '2px 6px', borderRadius: '4px', color: '#aaa' }}>VERTICAL</span>
                    </div>
                  </div>
                  <div className="horizontal-list hide-scrollbar" style={{ gap: '16px' }}>
                    {quickBites.filter(item => item.status === 'published').map((item, index) => {
                      const verticalItem = {
                        ...item,
                        isVertical: true,
                        // QuickByte model has 'thumbnail' object with 'url', or 'poster' if we kept old naming?
                        // My model: thumbnail: { url: ... }
                        // Old Content model: poster: { url: ... }
                        // Current code: image: item.poster?.url || item.thumbnail
                        // Updated mapping:
                        image: item.thumbnail?.url || item.poster?.url || "https://placehold.co/100x178/333/FFF?text=No+Image",
                        type: 'reel'
                      };
                      return (
                        <motion.div
                          key={verticalItem.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedMovie(verticalItem)}
                          style={{
                            minWidth: '100px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <div style={{
                            width: '100px',
                            height: '178px',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            position: 'relative',
                            border: '2px solid transparent',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                          }}>
                            <img
                              src={verticalItem.image}
                              alt={verticalItem.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ background: 'rgba(255,40,40,0.8)', padding: '8px', borderRadius: '50%' }}>
                                <Play size={12} fill="white" stroke="none" />
                              </div>
                            </div>
                          </div>
                          <span style={{ fontSize: '11px', color: '#ccc', textAlign: 'center', maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {verticalItem.title}
                          </span>
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
              <CategoryGridView activeFilter={activeFilter} setSelectedMovie={setSelectedMovie} purchasedContent={purchasedContent} />
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

function CategoryGridView({ activeFilter, setSelectedMovie, purchasedContent }) {
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
                <div style={{ color: 'white', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textShadow: '0 2px 4px black', lineHeight: 1.2 }}>{movie.title}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

export default function UserRoutes({
  loading,
  activeTab,
  setActiveTab,
  activeFilter,
  setActiveFilter,
  currentHeroIndex,
  setCurrentHeroIndex,
  selectedMovie,
  setSelectedMovie,
  playingMovie,
  setPlayingMovie,
  myList,
  toggleMyList,
  likedVideos,
  toggleLike,
  purchasedContent,
  handlePurchase,
  handlePlay,
  showAuth,
  setShowAuth,
  currentUser,
  showToast
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // Sync activeTab with current route
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') {
      setActiveTab('Home');
    } else if (path === '/for-you') {
      setActiveTab('For You');
    } else if (path === '/my-space') {
      setActiveTab('My Space');
    }
  }, [location.pathname, setActiveTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'Home') {
      navigate('/');
    } else if (tab === 'For You') {
      navigate('/for-you');
    } else if (tab === 'My Space') {
      navigate('/my-space');
    }
  };
  return (
    <>
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

          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  activeFilter={activeFilter}
                  setActiveFilter={setActiveFilter}
                  currentHeroIndex={currentHeroIndex}
                  setCurrentHeroIndex={setCurrentHeroIndex}
                  selectedMovie={selectedMovie}
                  setSelectedMovie={setSelectedMovie}
                  playingMovie={playingMovie}
                  setPlayingMovie={setPlayingMovie}
                  myList={myList}
                  toggleMyList={toggleMyList}
                  likedVideos={likedVideos}
                  toggleLike={toggleLike}
                  purchasedContent={purchasedContent}
                  handlePurchase={handlePurchase}
                  handlePlay={handlePlay}
                  showToast={showToast}
                />
              }
            />
            <Route
              path="/for-you"
              element={
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
              }
            />
            <Route
              path="/my-space"
              element={
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
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Video Player Overlay */}
          <AnimatePresence>
            {playingMovie && (
              <VideoPlayer movie={playingMovie} onClose={() => setPlayingMovie(null)} />
            )}
          </AnimatePresence>

          {/* Authentication Modals */}
          <AnimatePresence>
            {showAuth === 'login' && (
              <Login
                onClose={() => setShowAuth(null)}
                onSwitchToSignup={() => setShowAuth('signup')}
                onLoginSuccess={() => {
                  const savedUser = localStorage.getItem('inplay_current_user');
                  if (savedUser) {
                    // Update currentUser state if needed
                  }
                }}
              />
            )}
            {showAuth === 'signup' && (
              <Signup
                onClose={() => setShowAuth(null)}
                onSwitchToLogin={() => setShowAuth('login')}
                onSignupSuccess={() => {
                  const savedUser = localStorage.getItem('inplay_current_user');
                  if (savedUser) {
                    // Update currentUser state if needed
                  }
                }}
              />
            )}
          </AnimatePresence>

          {/* Bottom Navigation */}
          {activeTab !== 'For You' && !selectedMovie && (
            <nav className="bottom-nav" style={{ justifyContent: 'space-around' }}>
              <NavItem
                icon={<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><HomeIcon /> Home</div>}
                label="Home"
                active={activeTab === 'Home'}
                onClick={() => handleTabChange('Home')}
                isPill
              />
              <NavItem icon={<Sparkles size={24} />} label="For You" active={activeTab === 'For You'} onClick={() => handleTabChange('For You')} />
              <NavItem icon={<Layout size={24} />} label="My Space" active={activeTab === 'My Space'} onClick={() => handleTabChange('My Space')} />
            </nav>
          )}
        </>
      )}
    </>
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
