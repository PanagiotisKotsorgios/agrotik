"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/ui/icon";

export interface CarouselImage {
  url: string;
  alt?: string;
}

/**
 * Eshop-style image viewer for a listing. Shows the primary image
 * large, next/prev arrows, dot indicators, thumbnail strip, image
 * counter (1/N), and a full-screen lightbox on click. Keyboard: ←/→
 * to navigate, Esc to close the lightbox. Respects
 * prefers-reduced-motion — animations only run when allowed.
 */
export function ListingCarousel({
  images,
  productName,
}: {
  images: CarouselImage[];
  productName: string;
}) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const safeCount = Math.max(images.length, 1);

  const clamp = useCallback((next: number) => (next + safeCount) % safeCount, [safeCount]);

  const next = useCallback(() => setIndex((prev) => clamp(prev + 1)), [clamp]);
  const prev = useCallback(() => setIndex((prev) => clamp(prev - 1)), [clamp]);

  useEffect(() => {
    if (!zoom) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoom(false);
      else if (event.key === "ArrowLeft") prev();
      else if (event.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [zoom, prev, next]);

  useEffect(() => {
    const container = trackRef.current;
    if (!container) return;
    const target = container.querySelector<HTMLElement>(`[data-thumb-index="${index}"]`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [index]);

  if (images.length === 0) {
    return (
      <div className="aspect-[4/3] w-full rounded-2xl bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted">
        <div className="text-center">
          <Icon name="image" className="text-3xl" />
          <p className="mt-2 text-sm">Δεν υπάρχουν φωτογραφίες.</p>
        </div>
      </div>
    );
  }

  const active = images[index];

  return (
    <div className="space-y-3">
      <div className="relative group">
        <button
          type="button"
          onClick={() => setZoom(true)}
          className="block w-full rounded-2xl overflow-hidden bg-brand-bg border border-brand-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-mid"
          aria-label={active.alt ? `Μεγέθυνση: ${active.alt}` : "Μεγέθυνση φωτογραφίας"}
        >
          <div className="relative w-full aspect-[4/3]">
            <Image
              src={active.url}
              alt={active.alt ?? productName}
              fill
              unoptimized
              priority
              sizes="(max-width: 1024px) 100vw, 640px"
              className="object-contain motion-safe:transition-transform motion-safe:duration-500 group-hover:scale-[1.02]"
            />
          </div>
        </button>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Προηγούμενη φωτογραφία"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/85 hover:bg-white text-brand-dark shadow-elev inline-flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-mid"
            >
              <Icon name="arrowLeft" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Επόμενη φωτογραφία"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/85 hover:bg-white text-brand-dark shadow-elev inline-flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-mid"
            >
              <Icon name="arrowRight" />
            </button>
            <span className="absolute bottom-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-dark/80 text-white">
              {index + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div ref={trackRef} className="flex gap-2 overflow-x-auto scroll-smooth pb-1">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              data-thumb-index={i}
              onClick={() => setIndex(i)}
              aria-label={`Δες φωτογραφία ${i + 1}`}
              aria-current={i === index}
              className={`relative shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                i === index ? "border-brand-dark" : "border-transparent hover:border-brand-border"
              }`}
            >
              <Image
                src={img.url}
                alt={img.alt ?? ""}
                fill
                unoptimized
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.alt ?? productName}
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoom(false)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoom(false);
            }}
            aria-label="Κλείσιμο"
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white inline-flex items-center justify-center"
          >
            <Icon name="close" />
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); prev(); }}
                aria-label="Προηγούμενη"
                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white inline-flex items-center justify-center"
              >
                <Icon name="arrowLeft" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); next(); }}
                aria-label="Επόμενη"
                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white inline-flex items-center justify-center"
              >
                <Icon name="arrowRight" />
              </button>
            </>
          )}
          <div className="relative max-w-[92vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={active.url}
              alt={active.alt ?? productName}
              width={1600}
              height={1200}
              unoptimized
              className="max-h-[90vh] max-w-[92vw] w-auto h-auto object-contain rounded-md"
            />
            {active.alt && (
              <p className="mt-2 text-center text-sm text-white/85">{active.alt}</p>
            )}
            {images.length > 1 && (
              <p className="mt-1 text-center text-xs text-white/60">
                {index + 1} / {images.length}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
