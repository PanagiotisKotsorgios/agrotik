"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="el">
      <body style={{ fontFamily: "Inter, system-ui, sans-serif", padding: "3rem 1.5rem", textAlign: "center", background: "#F7F5EE", color: "#141412" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: 999,
              background: "#fee2e2", color: "#991b1b",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, marginBottom: 16,
            }}
          >!</div>
          <h1 style={{ fontSize: 28, margin: "0 0 8px 0", color: "#1B4D2E" }}>Κάτι πήγε πολύ στραβά</h1>
          <p style={{ margin: "0 0 24px 0", color: "#5A5A52" }}>
            Δεν μπορέσαμε να φορτώσουμε τη σελίδα. Δοκίμασε ξανά.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "12px 24px",
              background: "#1B4D2E",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Δοκίμασε ξανά
          </button>
          {error.digest && (
            <div style={{ marginTop: 24, fontSize: 12, opacity: 0.6, fontFamily: "monospace" }}>
              ref: {error.digest}
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
