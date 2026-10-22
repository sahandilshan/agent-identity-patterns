const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

/**
 * Builds an internal link under the site's base path. Every internal link goes
 * through here; scripts/check-links.mjs fails on root-relative links that skip
 * the base. Pass page paths with a trailing slash: `href('patterns/')`.
 */
export function href(path = ''): string {
  return BASE + path.replace(/^\/+/, '');
}
