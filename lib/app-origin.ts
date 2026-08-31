const PRODUCTION_ORIGIN = "https://agrotik.gr";
const DEVELOPMENT_ORIGIN = "http://localhost:3000";

export function getAppOrigin(): string {
  const configured = process.env.APP_ORIGIN?.trim().replace(/\/$/, "");
  const isProduction = process.env.NODE_ENV === "production";

  if (configured) {
    try {
      const url = new URL(configured);
      const isHttp = url.protocol === "http:" || url.protocol === "https:";
      if (isHttp && !(isProduction && isLocalHostname(url.hostname))) {
        return url.origin;
      }
    } catch {
      // Ignore invalid configuration and use the environment-safe fallback.
    }
  }

  return isProduction ? PRODUCTION_ORIGIN : DEVELOPMENT_ORIGIN;
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}
