export function resolveAppUrl(path: string): string {
  const base = (process.env.CLIENT_BASE_PATH ?? '/').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
