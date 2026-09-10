function normalizeOrigin(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username || url.password || url.pathname !== "/" || url.search || url.hash
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Next.js may expose its internal listener URL behind a TLS-terminating proxy. */
export function isAllowedTutorOrigin(request: Request): boolean {
  const header = request.headers.get("origin");
  if (header === null) return true;
  const origin = normalizeOrigin(header);
  if (!origin) return false;
  // Use server configuration for public origins, never caller-supplied
  // forwarded headers or a wildcard covering other Render services.
  return [
    new URL(request.url).origin,
    normalizeOrigin(process.env.RENDER_EXTERNAL_URL),
    normalizeOrigin(process.env.APP_ORIGIN),
  ].includes(origin);
}
