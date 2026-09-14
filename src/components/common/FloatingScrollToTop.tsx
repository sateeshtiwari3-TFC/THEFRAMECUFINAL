import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp } from 'lucide-react';

interface FloatingScrollToTopProps {
  threshold?: number;
  className?: string;
}

/**
 * FloatingScrollToTop
 * High-performance, luxury floating button that appears when user scrolls down.
 * Provides a single-tap smooth scroll back to the top of the viewport,
 * drastically reducing thumb fatigue and endless scrolling on mobile devices.
 */
export const FloatingScrollToTop: React.FC<FloatingScrollToTopProps> = ({
  threshold = 280,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
          setIsVisible(scrollY > threshold);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    // Also scroll any scrollable container if applicable
    const mainEl = document.getElementById('main-content-flow');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          type="button"
          id="btn-floating-scroll-to-top"
          onClick={scrollToTop}
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 20 }}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.08 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`fixed bottom-20 md:bottom-8 right-4 md:right-8 z-40 p-3 rounded-full bg-charcoal-900/95 hover:bg-black border border-gold-500/50 hover:border-gold-400 text-gold-300 hover:text-gold-200 shadow-2xl shadow-black/80 backdrop-blur-md flex items-center justify-center cursor-pointer group touch-manipulation ring-1 ring-white/10 ${className}`}
          aria-label="Scroll back to top"
          title="Scroll to Top"
        >
          <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform duration-200" />
          <span className="sr-only">Top</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default FloatingScrollToTop;
