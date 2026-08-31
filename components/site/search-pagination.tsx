"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/icon";

type SearchParams = Record<string, string | string[] | undefined>;

export function SearchPagination({
  basePath,
  params,
  currentPage,
  totalItems,
  pageSize,
  placement = "bottom",
  resultsId = "search-results",
}: {
  basePath: string;
  params: SearchParams;
  currentPage: number;
  totalItems: number;
  pageSize: number;
  placement?: "top" | "bottom";
  resultsId?: string;
}) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const previousPage = useRef(currentPage);

  useEffect(() => {
    if (previousPage.current !== currentPage) scrollToResults(resultsId);
    previousPage.current = currentPage;
  }, [currentPage, resultsId]);

  if (totalPages <= 1) return null;

  const pages = visiblePages(currentPage, totalPages);
  const linkClass =
    "inline-flex min-w-10 h-10 items-center justify-center gap-2 rounded-full border border-brand-border bg-brand-surface px-3 text-sm font-medium text-brand-dark transition-colors hover:border-brand-dark/40 hover:bg-brand-dark/5";
  const disabledClass =
    "inline-flex min-w-10 h-10 cursor-not-allowed items-center justify-center gap-2 rounded-full border border-brand-border bg-brand-surface px-3 text-sm text-brand-muted opacity-45";

  return (
    <nav
      aria-label={`${placement === "top" ? "Επάνω" : "Κάτω"} σελιδοποίηση αποτελεσμάτων`}
      className={
        placement === "top"
          ? "flex flex-col items-center gap-2 sm:items-end"
          : "mt-8 flex flex-col items-center gap-3 border-t border-brand-border pt-6"
      }
    >
      <div className="text-sm text-brand-muted">
        Σελίδα <span className="figures font-semibold text-brand-dark">{currentPage}</span> από{" "}
        <span className="figures font-semibold text-brand-dark">{totalPages}</span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {currentPage > 1 ? (
          <Link
            href={pageHref(basePath, params, currentPage - 1, resultsId)}
            className={linkClass}
            rel="prev"
            scroll={false}
            onClick={() => scrollToResults(resultsId)}
          >
            <Icon name="arrowLeft" />
            <span className="hidden sm:inline">Προηγούμενη</span>
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            <Icon name="arrowLeft" />
            <span className="hidden sm:inline">Προηγούμενη</span>
          </span>
        )}

        {pages.map((page, index) => {
          const previous = pages[index - 1];
          return (
            <span key={page} className="contents">
              {previous && page - previous > 1 && (
                <span className="inline-flex h-10 min-w-6 items-center justify-center text-brand-muted" aria-hidden="true">
                  …
                </span>
              )}
              {page === currentPage ? (
                <span
                  aria-current="page"
                  className="figures inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-brand-dark px-3 text-sm font-semibold text-white"
                >
                  {page}
                </span>
              ) : (
                <Link
                  href={pageHref(basePath, params, page, resultsId)}
                  className={`${linkClass} figures px-3`}
                  aria-label={`Σελίδα ${page}`}
                  scroll={false}
                  onClick={() => scrollToResults(resultsId)}
                >
                  {page}
                </Link>
              )}
            </span>
          );
        })}

        {currentPage < totalPages ? (
          <Link
            href={pageHref(basePath, params, currentPage + 1, resultsId)}
            className={linkClass}
            rel="next"
            scroll={false}
            onClick={() => scrollToResults(resultsId)}
          >
            <span className="hidden sm:inline">Επόμενη</span>
            <Icon name="arrowRight" />
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            <span className="hidden sm:inline">Επόμενη</span>
            <Icon name="arrowRight" />
          </span>
        )}
      </div>
    </nav>
  );
}

function pageHref(basePath: string, params: SearchParams, page: number, resultsId: string): string {
  const query = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    if (key === "page") continue;
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) {
      if (value) query.append(key, value);
    }
  }
  if (page > 1) query.set("page", String(page));
  return `${basePath}${query.size ? `?${query.toString()}` : ""}#${encodeURIComponent(resultsId)}`;
}

function scrollToResults(resultsId: string): void {
  const results = document.getElementById(resultsId);
  if (!results) return;
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  results.scrollIntoView({ behavior, block: "start" });
}

function visiblePages(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }
  return [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
}
