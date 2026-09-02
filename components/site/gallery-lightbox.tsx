"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/ui/icon";

export interface GalleryImage {
  url: string;
  alt?: string;
}

export function Gallery({ images }: { images: GalleryImage[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {images.map((image, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="group relative aspect-square rounded-md overflow-hidden bg-brand-bg border border-brand-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-mid"
            aria-label={image.alt ? `Άνοιγμα φωτογραφίας: ${image.alt}` : `Άνοιγμα φωτογραφίας ${index + 1}`}
          >
            <Image
              src={image.url}
              alt={image.alt ?? ""}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              unoptimized
              sizes="(max-width: 640px) 50vw, 25vw"
            />
          </button>
        ))}
      </div>
      {openIndex !== null && (
        <Lightbox
          images={images}
          index={openIndex}
          onIndex={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}

function Lightbox({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: GalleryImage[];
  index: number;
  onIndex: (next: number | null) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const image = images[index];

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft") onIndex((index - 1 + images.length) % images.length);
      else if (event.key === "ArrowRight") onIndex((index + 1) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [index, images.length, onClose, onIndex]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={image.alt ?? "Φωτογραφία"}
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 h-11 w-11 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        aria-label="Κλείσιμο"
      >
        <Icon name="close" />
      </button>
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onIndex((index - 1 + images.length) % images.length);
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            aria-label="Προηγούμενη"
          >
            <Icon name="arrowLeft" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onIndex((index + 1) % images.length);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            aria-label="Επόμενη"
          >
            <Icon name="arrowRight" />
          </button>
        </>
      )}
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(event) => event.stopPropagation()}
      >
        <Image
          src={image.url}
          alt={image.alt ?? ""}
          width={1600}
          height={1200}
          unoptimized
          className="max-h-[90vh] max-w-[90vw] w-auto h-auto object-contain rounded-md"
        />
        {image.alt && (
          <p className="mt-2 text-center text-sm text-white/80">{image.alt}</p>
        )}
        {images.length > 1 && (
          <p className="mt-1 text-center text-xs text-white/60">
            {index + 1} / {images.length}
          </p>
        )}
      </div>
    </div>
  );
}
