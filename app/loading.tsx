export default function RootLoading() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="w-12 h-12 mx-auto rounded-full border-4 border-brand-border border-t-brand-dark animate-spin" />
      <p className="mt-4 text-brand-muted">Φόρτωση…</p>
    </div>
  );
}
