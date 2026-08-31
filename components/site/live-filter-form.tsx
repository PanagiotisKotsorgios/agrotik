"use client";

import { useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

export function scrollToResultsPreview(resultsId = "search-results") {
  if (typeof window === "undefined" || !window.matchMedia("(min-width: 768px)").matches) return;
  const results = document.getElementById(resultsId);
  if (!results) return;

  // Keep the bottom of the filters visible while revealing the result count
  // and the first cards, so users understand that the list changed below.
  const previewOffset = Math.min(320, window.innerHeight * 0.34);
  const top = window.scrollY + results.getBoundingClientRect().top - previewOffset;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

export function LiveFilterForm({
  children,
  className,
  resultsId = "search-results",
}: {
  children: React.ReactNode;
  className?: string;
  resultsId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function navigate(form: HTMLFormElement) {
    const query = new URLSearchParams();
    for (const [key, rawValue] of new FormData(form).entries()) {
      if (typeof rawValue !== "string") continue;
      const value = rawValue.trim();
      if (value) query.append(key, value);
    }

    startTransition(() => {
      router.replace(`${pathname}${query.size ? `?${query.toString()}` : ""}`, { scroll: false });
    });
    window.setTimeout(() => scrollToResultsPreview(resultsId), 80);
  }

  function schedule(form: HTMLFormElement, delay: number) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => navigate(form), delay);
  }

  return (
    <form
      className={className}
      aria-busy={pending}
      onChange={(event) => {
        if (!window.matchMedia("(min-width: 768px)").matches) return;
        const field = event.target as HTMLInputElement | HTMLSelectElement;
        const form = event.currentTarget;

        if (field.name === "product_category") {
          const product = form.elements.namedItem("product_id");
          if (product instanceof HTMLSelectElement) product.value = "";
        }

        const immediate =
          field instanceof HTMLSelectElement ||
          field.type === "date" ||
          field.type === "checkbox" ||
          field.type === "radio";
        schedule(form, immediate ? 0 : 450);
      }}
      onSubmit={(event) => {
        event.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        navigate(event.currentTarget);
      }}
    >
      {children}
    </form>
  );
}
