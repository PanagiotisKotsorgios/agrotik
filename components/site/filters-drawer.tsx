"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useDialogFocus } from "./use-dialog-focus";

/**
 * Renders `children` inline on desktop; on mobile shows a "Φίλτρα" button
 * that opens a full-screen sheet containing the same content.
 *
 * The wrapped `children` should be the entire <form>. Users submit and
 * the sheet closes via full-page navigation to the same URL with params.
 */
export function FiltersDrawer({
  children,
  activeCount = 0,
}: {
  children: React.ReactNode;
  activeCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const { dialogRef, triggerRef } = useDialogFocus(open, setOpen);

  // Body scroll lock while open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <>
      {/* Mobile toggle button */}
      <div className="md:hidden mb-4">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="w-full inline-flex items-center justify-between gap-3 px-4 py-3 rounded-md bg-brand-surface border-2 border-brand-dark text-brand-dark font-semibold text-[16px]"
        >
          <span className="inline-flex items-center gap-2">
            <Icon name="filter" /> Φίλτρα
            {activeCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-brand-earth text-white text-[12px] figures font-bold">
                {activeCount}
              </span>
            )}
          </span>
          <Icon name="arrowRight" />
        </button>
      </div>

      {/* Desktop inline */}
      <div className="hidden md:block">{children}</div>

      {/* Mobile drawer */}
      {open && (
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="filters-dialog-title"
          className="md:hidden fixed inset-0 z-50 flex flex-col bg-brand-bg"
        >
          <div className="flex items-center justify-between px-4 h-[64px] border-b border-brand-border bg-brand-surface shrink-0">
            <div id="filters-dialog-title" className="font-semibold text-brand-dark text-[17px] inline-flex items-center gap-2">
              <Icon name="filter" /> Φίλτρα αναζήτησης
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Κλείσιμο"
              data-dialog-autofocus
              className="w-11 h-11 rounded-md hover:bg-brand-border/40 inline-flex items-center justify-center text-brand-ink"
            >
              <Icon name="close" className="text-lg" />
            </button>
          </div>
          <div
            className="flex-1 overflow-y-auto p-4 pb-32"
            onClick={(e) => {
              // Auto-close after form submit (browser navigates → drawer unmounts)
              const target = e.target as HTMLElement;
              if (target.tagName === "BUTTON" && (target as HTMLButtonElement).type === "submit") {
                setTimeout(() => setOpen(false), 100);
              }
            }}
          >
            {children}
          </div>
        </div>
      )}
    </>
  );
}
