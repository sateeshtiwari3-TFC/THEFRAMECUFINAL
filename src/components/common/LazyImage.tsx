import React, { useState, useEffect, useRef } from 'react';

export const DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=600';

export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackSrc?: string;
  alt?: string;
  containerClassName?: string;
  placeholderClassName?: string;
  rootMargin?: string;
  threshold?: number;
  showShimmer?: boolean;
}

/**
 * LazyImage
 * High-performance thumbnail image component using native IntersectionObserver.
 * Defers loading and network requests until the image is near the viewport,
 * reducing memory usage and initial load time across project grids and lists.
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  fallbackSrc = DEFAULT_FALLBACK_IMAGE,
  alt = '',
  className = '',
  containerClassName = '',
  placeholderClassName = '',
  rootMargin = '150px 0px',
  threshold = 0.01,
  showShimmer = true,
  onError,
  onLoad,
  ...imgProps
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [currentSrc, setCurrentSrc] = useState<string>(src || fallbackSrc);

  // Sync src changes
  useEffect(() => {
    setCurrentSrc(src || fallbackSrc);
    setHasError(false);
    setIsLoaded(false);
  }, [src, fallbackSrc]);

  // IntersectionObserver implementation
  useEffect(() => {
    // If already in view, no need to observe again
    if (isInView) return;

    // Fallback if IntersectionObserver is not supported (SSR or legacy browsers)
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            // Once in view, unobserve to free memory and observer overhead
            obs.unobserve(entry.target);
            obs.disconnect();
          }
        });
      },
      {
        root: null, // viewport
        rootMargin, // preload slightly before entering viewport
        threshold,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [isInView, rootMargin, threshold]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError) {
      setHasError(true);
      setCurrentSrc(fallbackSrc);
    }
    if (onError) {
      onError(e);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoaded(true);
    if (onLoad) {
      onLoad(e);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${containerClassName}`}
    >
      {/* Skeleton / Shimmer placeholder while waiting to intersect or load */}
      {(!isInView || !isLoaded) && showShimmer && (
        <div
          className={`absolute inset-0 bg-charcoal-800/80 animate-pulse flex items-center justify-center pointer-events-none z-0 ${placeholderClassName}`}
          aria-hidden="true"
        >
          <div className="w-full h-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-[shimmer_2s_infinite]" />
        </div>
      )}

      {/* Render real image only when intersected */}
      {isInView ? (
        <img
          src={currentSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={handleImageError}
          onLoad={handleImageLoad}
          className={`${className} transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          {...imgProps}
        />
      ) : null}
    </div>
  );
};

export default LazyImage;
