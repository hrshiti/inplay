import { motion } from 'framer-motion';
import logo from './assets/inplay logo-Photoroom.png';

export default function SplashScreen() {
    return (
        <motion.div
            className="splash-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            transition={{ duration: 0.8 }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'radial-gradient(circle at center, #1a1a1a 0%, #000000 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                overflow: 'hidden'
            }}
        >
            {/* Background Glow Effect */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                style={{
                    position: 'absolute',
                    width: '600px',
                    height: '600px',
                    background: 'radial-gradient(circle, rgba(229, 9, 20, 0.15) 0%, transparent 70%)',
                    borderRadius: '50%',
                    zIndex: 0
                }}
            />

            <motion.div
                initial={{ scale: 0.5, opacity: 0, y: 50 }}
                animate={{
                    scale: 1,
                    opacity: 1,
                    y: 0,
                    transition: {
                        type: 'spring',
                        stiffness: 100,
                        damping: 10,
                        duration: 1.2
                    }
                }}
                style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1
                }}
            >
                <motion.img
                    src={logo}
                    alt="InPlay Logo"
                    style={{
                        width: '280px', // Combines "aur bada show karo"
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 0 20px rgba(229, 9, 20, 0.3))'
                    }}
                    animate={{
                        filter: [
                            'drop-shadow(0 0 20px rgba(229, 9, 20, 0.3))',
                            'drop-shadow(0 0 40px rgba(229, 9, 20, 0.6))',
                            'drop-shadow(0 0 20px rgba(229, 9, 20, 0.3))'
                        ]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            </motion.div>

            {/* Loading Bar Container */}
            <div style={{
                width: '200px',
                height: '4px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '10px',
                marginTop: '60px',
                overflow: 'hidden',
                zIndex: 1,
                position: 'relative'
            }}>
                {/* Animated Progress Bar */}
                <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: '0%' }}
                    transition={{ duration: 2.5, ease: "easeInOut" }}
                    style={{
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
                        borderRadius: '10px',
                        boxShadow: '0 0 10px var(--accent)'
                    }}
                />
            </div>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 1 }}
                style={{
                    marginTop: '16px',
                    color: '#666',
                    fontSize: '12px',
                    letterSpacing: '4px',
                    textTransform: 'uppercase',
                    zIndex: 1,
                    fontFamily: 'var(--font-body)'
                }}
            >
                Loading Experience
            </motion.p>
        </motion.div>
    );
}
