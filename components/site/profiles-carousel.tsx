"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { roleLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/card";

export interface CarouselProfile {
  id: string;
  display_name: string;
  role: string;
  region_name: string;
  municipality: string | null;
  bio: string | null;
  avatar_url?: string | null;
}

/**
 * Auto-advancing horizontal carousel with mouse drag on desktop and a
 * controlled, one-card-per-gesture swipe on mobile.
 */
export function ProfilesCarousel({ profiles }: { profiles: CarouselProfile[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [canAutoScroll, setCanAutoScroll] = useState(false);
  const dragRef = useRef<{ startX: number; startScroll: number; dragging: boolean }>({
    startX: 0,
    startScroll: 0,
    dragging: false,
  });
  const touchRef = useRef<{ startX: number; startY: number; index: number } | null>(null);
  const suppressClickUntilRef = useRef(0);

  // Native touch momentum and requestAnimationFrame scrolling fight each
  // other on phones. Auto-advance only on desktop/fine-pointer devices.
  useEffect(() => {
    const media = window.matchMedia("(min-width: 640px) and (hover: hover) and (pointer: fine)");
    const update = () => setCanAutoScroll(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // Pause when off-screen
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Auto-scroll loop
  useEffect(() => {
    const el = trackRef.current;
    if (!el || !canAutoScroll || paused || !inView || profiles.length < 3) return;
    let raf = 0;
    let last = performance.now();
    const speed = 24; // px per second
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!paused && !dragRef.current.dragging) {
        const max = el.scrollWidth - el.clientWidth;
        if (max <= 0) return;
        let next = el.scrollLeft + speed * dt;
        if (next >= max) next = 0;
        el.scrollLeft = next;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [canAutoScroll, paused, inView, profiles.length]);

  // Drag-to-scroll (mouse)
  const onMouseDown = (e: React.MouseEvent) => {
    const el = trackRef.current;
    if (!el) return;
    dragRef.current = { startX: e.clientX, startScroll: el.scrollLeft, dragging: true };
    el.classList.add("cursor-grabbing");
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.dragging) return;
    const el = trackRef.current;
    if (!el) return;
    e.preventDefault();
    el.scrollLeft = dragRef.current.startScroll - (e.clientX - dragRef.current.startX);
  };
  const endDrag = () => {
    dragRef.current.dragging = false;
    trackRef.current?.classList.remove("cursor-grabbing");
  };

  const scrollBy = (dx: number) => {
    trackRef.current?.scrollBy({ left: dx, behavior: "smooth" });
  };

  const closestCardIndex = () => {
    const el = trackRef.current;
    if (!el) return 0;
    const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-carousel-card]"));
    const viewportCenter = el.scrollLeft + el.clientWidth / 2;
    let closest = 0;
    let closestDistance = Number.POSITIVE_INFINITY;
    cards.forEach((card, index) => {
      const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - viewportCenter);
      if (distance < closestDistance) {
        closest = index;
        closestDistance = distance;
      }
    });
    return closest;
  };

  const scrollToCard = (index: number) => {
    const el = trackRef.current;
    if (!el) return;
    const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-carousel-card]"));
    const card = cards[Math.max(0, Math.min(index, cards.length - 1))];
    if (!card) return;
    const left = card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2;
    el.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  };

  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      index: closestCardIndex(),
    };
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchRef.current;
    const touch = event.changedTouches[0];
    touchRef.current = null;
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.startX;
    const deltaY = touch.clientY - start.startY;
    const isHorizontalSwipe = Math.abs(deltaX) >= 18 && Math.abs(deltaX) > Math.abs(deltaY);
    if (!isHorizontalSwipe) return;

    suppressClickUntilRef.current = Date.now() + 400;
    scrollToCard(start.index + (deltaX < 0 ? 1 : -1));
  };

  if (profiles.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 pt-8 pb-14">
      <div className="flex items-end justify-between mb-6 gap-4">
        <div>
          <div className="eyebrow">Νέα προφίλ</div>
          <h2 className="display mt-2 text-3xl text-brand-dark field-underline">
            Ποιοι μπήκαν πρόσφατα
          </h2>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollBy(-320)}
            className="w-10 h-10 rounded-full border border-brand-border bg-brand-surface text-brand-dark hover:border-brand-dark hover:bg-brand-dark hover:text-white transition-colors inline-flex items-center justify-center"
            aria-label="Προηγούμενο"
          >
            <Icon name="arrowLeft" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(320)}
            className="w-10 h-10 rounded-full border border-brand-border bg-brand-surface text-brand-dark hover:border-brand-dark hover:bg-brand-dark hover:text-white transition-colors inline-flex items-center justify-center"
            aria-label="Επόμενο"
          >
            <Icon name="arrowRight" />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => {
          setPaused(false);
          endDrag();
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => {
          touchRef.current = null;
        }}
        onClickCapture={(event) => {
          if (Date.now() < suppressClickUntilRef.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        style={{
          scrollbarWidth: "none",
        }}
        className="flex gap-3 sm:gap-4 overflow-x-hidden sm:overflow-x-auto overscroll-x-contain touch-pan-y sm:touch-pan-x sm:snap-x sm:snap-mandatory pb-2 -mx-4 px-[9%] sm:px-4 cursor-grab select-none"
      >
        {profiles.map((p) => (
          <Link
            key={p.id}
            href={`/profile/${p.id}`}
            prefetch
            draggable={false}
            data-carousel-card
            className="shrink-0 w-[82%] sm:w-[280px] sm:snap-start sm:[scroll-snap-stop:always] bg-brand-surface border border-brand-border rounded-card p-5 shadow-card hover:border-brand-dark/40 hover:shadow-elev transition-all flex flex-col"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-dark text-white flex items-center justify-center font-semibold display shrink-0 overflow-hidden">
                {p.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatar_url} alt={p.display_name} className="w-full h-full object-cover" />
                ) : (
                  initials(p.display_name)
                )}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-brand-dark truncate">{p.display_name}</div>
                <Badge tone="brand">{roleLabel(p.role)}</Badge>
              </div>
            </div>
            <div className="mt-3 text-[13px] text-brand-muted flex items-start gap-1.5 min-w-0">
              <Icon name="location" className="shrink-0 mt-0.5" />
              <span className="line-clamp-2 leading-snug break-words min-w-0">
                {p.region_name}
                {p.municipality ? ` · ${p.municipality}` : ""}
              </span>
            </div>
            {p.bio && (
              <p className="mt-3 text-sm text-brand-ink/85 line-clamp-2 leading-snug">{p.bio}</p>
            )}
            <div className="mt-auto pt-4 text-sm text-brand-mid font-semibold inline-flex items-center gap-1">
              Δες προφίλ <Icon name="arrowRight" className="text-[0.85em]" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "·";
}
