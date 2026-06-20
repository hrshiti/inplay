import { motion } from 'framer-motion';

export default function SplashScreen() {
    return (
        <motion.div
            className="splash-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                overflow: 'hidden'
            }}
        >
            <img 
                src="/spashgif.gif" 
                alt="Loading..." 
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                }}
            />
        </motion.div>
    );
}
