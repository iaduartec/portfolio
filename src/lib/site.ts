export function getSiteUrl(): string {
  // Prefer explicit env (works for local + custom domains)
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && explicit.trim().length > 0) return explicit.replace(/\/$/, "");

  // Vercel provides VERCEL_URL without protocol
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl && vercelUrl.trim().length > 0) return `https://${vercelUrl}`.replace(/\/$/, "");

  // Fallback for local dev
  const port = process.env.PORT ?? "3000";
  return `http://localhost:${port}`;
}
