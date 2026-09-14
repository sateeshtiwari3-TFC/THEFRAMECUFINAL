import React, { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'motion/react';

export const ParallaxBackground: React.FC = () => {
  // Check if mobile or touch screen to completely skip heavy GPU blur and spring physics
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || ('ontouchstart' in window && window.innerWidth < 1024);
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || ('ontouchstart' in window && window.innerWidth < 1024));
    };
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const scrollY = useMotionValue(0);

  // Smooth springs for fluid, premium parallax dampening
  const springConfig = { damping: 25, stiffness: 150 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);
  const smoothScrollY = useSpring(scrollY, springConfig);

  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => {
    if (isMobile) return;

    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse coordinates from center (-0.5 to 0.5)
      const x = (e.clientX / window.innerWidth) - 0.5;
      const y = (e.clientY / window.innerHeight) - 0.5;
      mouseX.set(x);
      mouseY.set(y);
    };

    const handleScroll = () => {
      scrollY.set(window.scrollY);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isMobile, mouseX, mouseY, scrollY]);

  // Derived parallax offset values for multi-layered depth
  const orb1X = useMotionValue(0);
  const orb1Y = useMotionValue(0);
  const orb2X = useMotionValue(0);
  const orb2Y = useMotionValue(0);
  const orb3X = useMotionValue(0);
  const orb3Y = useMotionValue(0);

  useEffect(() => {
    if (isMobile) return;

    const unsubscribeX = smoothMouseX.on('change', (latest) => {
      orb1X.set(latest * 80);
      orb2X.set(latest * -120);
      orb3X.set(latest * 50);
    });
    const unsubscribeY = smoothMouseY.on('change', (latest) => {
      orb1Y.set(latest * 80);
      orb2Y.set(latest * -120);
      orb3Y.set(latest * 50);
    });

    return () => {
      unsubscribeX();
      unsubscribeY();
    };
  }, [isMobile, smoothMouseX, smoothMouseY, orb1X, orb1Y, orb2X, orb2Y, orb3X, orb3Y]);

  // On mobile, render a static, zero-cost lightweight subtle gradient background without any blurs or animations
  if (isMobile) {
    return (
      <div 
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-gradient-to-b from-charcoal-950 via-[#0a0d12] to-charcoal-950" 
        aria-hidden="true" 
      />
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Dynamic Cursor Spotlight Effect */}
      <motion.div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(600px circle at calc(50% + ${smoothMouseX.get() * windowDimensions.width}px) calc(50% + ${smoothMouseY.get() * windowDimensions.height}px), rgba(212, 175, 55, 0.15), transparent 80%)`,
        }}
      />

      {/* Layer 0 (Deepest Parallax Ambient Glow Orbs) */}
      <motion.div
        className="absolute -top-40 -left-40 w-[550px] h-[550px] rounded-full blur-[140px] opacity-25 pointer-events-none"
        style={{
          x: orb1X,
          y: orb1Y,
          background: 'radial-gradient(circle, rgba(60, 143, 120, 0.6) 0%, rgba(6, 26, 21, 0) 70%)',
        }}
      />

      <motion.div
        className="absolute top-1/3 -right-20 w-[600px] h-[600px] rounded-full blur-[160px] opacity-20 pointer-events-none"
        style={{
          x: orb2X,
          y: orb2Y,
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.5) 0%, rgba(10, 11, 13, 0) 75%)',
        }}
      />

      <motion.div
        className="absolute -bottom-40 left-1/4 w-[500px] h-[500px] rounded-full blur-[150px] opacity-20 pointer-events-none"
        style={{
          x: orb3X,
          y: orb3Y,
          background: 'radial-gradient(circle, rgba(30, 85, 70, 0.7) 0%, rgba(10, 11, 13, 0) 70%)',
        }}
      />

      {/* Layer 1: Parallax Fine Grid Wireframe */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.3) 1px, transparent 1px), linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Layer 2: Floating Parallax Ambient Aperture Rings / Particles */}
      <motion.div
        className="absolute top-20 left-[15%] w-72 h-72 border border-gold-500/10 rounded-full pointer-events-none"
        style={{
          x: orb2X,
          y: orb1Y,
          rotate: smoothMouseX.get() * 45,
        }}
      />

      <motion.div
        className="absolute bottom-32 right-[20%] w-96 h-96 border border-emerald-500/10 rounded-full pointer-events-none"
        style={{
          x: orb1X,
          y: orb2Y,
          rotate: smoothMouseY.get() * -30,
        }}
      />
    </div>
  );
};

export default ParallaxBackground;
