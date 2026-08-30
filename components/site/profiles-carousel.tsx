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
}

/**
 * Auto-advancing horizontal carousel that also supports free manual scroll
 * (mouse drag on desktop, touch on mobile). Pauses while the pointer is over
 * the strip, while the user is dragging, or when it goes off-screen.
 */
export function ProfilesCarousel({ profiles }: { profiles: CarouselProfile[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const dragRef = useRef<{ startX: number; startScroll: number; dragging: boolean }>({
    startX: 0,
    startScroll: 0,
    dragging: false,
  });

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
    if (!el || paused || !inView || profiles.length < 3) return;
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
  }, [paused, inView, profiles.length]);

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

  if (profiles.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 py-14">
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
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        style={{
          scrollbarWidth: "thin",
          maskImage: "linear-gradient(to right, transparent, black 3%, black 97%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 3%, black 97%, transparent)",
        }}
        className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-[9%] sm:px-4 cursor-grab select-none scroll-smooth"
      >
        {profiles.map((p) => (
          <Link
            key={p.id}
            href={`/profile/${p.id}`}
            prefetch
            draggable={false}
            className="shrink-0 w-[82%] sm:w-[280px] snap-center sm:snap-start bg-brand-surface border border-brand-border rounded-card p-5 shadow-card hover:border-brand-dark/40 hover:shadow-elev transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-dark text-white flex items-center justify-center font-semibold display shrink-0">
                {initials(p.display_name)}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-brand-dark truncate">{p.display_name}</div>
                <Badge tone="brand">{roleLabel(p.role)}</Badge>
              </div>
            </div>
            <div className="mt-3 text-[13px] text-brand-muted inline-flex items-center gap-1.5">
              <Icon name="location" />
              <span className="truncate">
                {p.region_name}
                {p.municipality ? ` · ${p.municipality}` : ""}
              </span>
            </div>
            {p.bio && (
              <p className="mt-3 text-sm text-brand-ink/85 line-clamp-2 leading-snug">{p.bio}</p>
            )}
            <div className="mt-4 text-sm text-brand-mid font-semibold inline-flex items-center gap-1">
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
