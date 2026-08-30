"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="w-14 h-14 rounded-full bg-red-50 text-red-700 inline-flex items-center justify-center text-2xl mb-4">
        !
      </div>
      <h1 className="display text-3xl text-brand-dark">Κάτι πήγε στραβά</h1>
      <p className="mt-3 text-brand-muted">
        Παρουσιάστηκε σφάλμα κατά τη φόρτωση της σελίδας.
        {error.digest && (
          <>
            <br />
            <span className="text-xs font-mono opacity-60">ref: {error.digest}</span>
          </>
        )}
      </p>
      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        <button
          type="button"
          onClick={reset}
          className="px-5 py-2.5 rounded-md bg-brand-dark text-white font-semibold hover:bg-brand-mid"
        >
          Δοκίμασε ξανά
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-md border border-brand-border text-brand-dark font-semibold hover:border-brand-dark"
        >
          Αρχική
        </Link>
      </div>
    </div>
  );
}
