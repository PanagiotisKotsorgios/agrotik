import Image from "next/image";

export function Logo({ size = 36, showWordmark = true }: { size?: number; showWordmark?: boolean }) {
  // The logo PNG contains the wordmark already; use it as a single image.
  // For a compact mark (favicon-like), we crop via CSS `object-position`.
  if (!showWordmark) {
    return (
      <span
        className="inline-block relative overflow-hidden"
        style={{ width: size, height: size }}
      >
        <Image
          src="/logo.png"
          alt="AGROTIK"
          width={size * 3}
          height={size}
          priority
          style={{ width: "auto", height: size, objectFit: "cover", objectPosition: "left center" }}
        />
      </span>
    );
  }
  return (
    <Image
      src="/logo.png"
      alt="AGROTIK"
      width={size * 5}
      height={size}
      priority
      style={{ height: size, width: "auto" }}
    />
  );
}
