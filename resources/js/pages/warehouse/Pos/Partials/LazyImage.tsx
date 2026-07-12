import React, { useEffect, useRef, useState } from 'react';
import { Image } from 'lucide-react';

interface LazyImageProps {
    src?: string | null;
    alt: string;
    /** Tailwind classes applied to the outer wrapper div (controls size). */
    className?: string;
    /** Tailwind classes for the <img> element itself. */
    imgClassName?: string;
}

/**
 * ONE shared IntersectionObserver for the entire product grid (not one per card).
 * rootMargin of 400px pre-loads images just before they scroll into view so
 * the grid always feels instant while never loading everything on first paint.
 */
let sharedObserver: IntersectionObserver | null = null;
const callbackMap = new WeakMap<Element, () => void>();

function getObserver(): IntersectionObserver {
    if (sharedObserver) return sharedObserver;
    sharedObserver = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                callbackMap.get(entry.target)?.();
                sharedObserver!.unobserve(entry.target);
                callbackMap.delete(entry.target);
            }
        },
        { rootMargin: '400px 0px', threshold: 0.01 },
    );
    return sharedObserver;
}

const LazyImage = ({ src, alt, className = '', imgClassName = '' }: LazyImageProps) => {
    const wrapRef   = useRef<HTMLDivElement>(null);
    const [ready,   setReady]   = useState(false);   // intersection fired
    const [loaded,  setLoaded]  = useState(false);   // img onLoad fired
    const [errored, setErrored] = useState(false);   // img onError fired

    useEffect(() => {
        setReady(false);
        setLoaded(false);
        setErrored(false);

        const node = wrapRef.current;
        if (!node || !src) return;

        if (typeof IntersectionObserver === 'undefined') {
            // Fallback for environments without IO support.
            setReady(true);
            return;
        }

        const obs = getObserver();
        callbackMap.set(node, () => setReady(true));
        obs.observe(node);
        return () => { obs.unobserve(node); callbackMap.delete(node); };
    }, [src]);

    if (!src || errored) {
        return (
            <div ref={wrapRef} className={`flex items-center justify-center rounded-md border border-dashed border-input bg-muted/40 text-muted-foreground ${className}`}>
                <Image className="h-8 w-8" aria-hidden />
            </div>
        );
    }

    return (
        <div ref={wrapRef} className={`relative overflow-hidden ${className}`}>
            {/* Skeleton shimmer shown until image fully painted */}
            {!loaded && <div className="absolute inset-0 animate-pulse rounded-md bg-muted/60" />}
            {ready && (
                <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    decoding="async"
                    className={`h-full w-full object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
                    onLoad={() => setLoaded(true)}
                    onError={() => setErrored(true)}
                />
            )}
        </div>
    );
};

export default React.memo(LazyImage);
