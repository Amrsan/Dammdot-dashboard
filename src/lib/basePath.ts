/**
 * GitHub Pages serves this app from a repository subdirectory
 * (e.g. /Dammdot-dashboard/), while the router works with app-relative paths
 * (e.g. /products, /admin/orders). These helpers convert between the two.
 *
 * Vite injects BASE_URL from `base` in vite.config.ts and always ends it
 * with a slash.
 */
const rawBase = (import.meta.env?.BASE_URL as string | undefined) || '/';

/** '' on a root deploy, '/Dammdot-dashboard' on a project Pages deploy. */
export const BASE_PATH = rawBase === '/' ? '' : rawBase.replace(/\/+$/, '');

/** Browser pathname -> app route ('/products', '/admin/orders/123'). */
export const stripBase = (pathname: string): string => {
  const path = pathname || '/';
  if (!BASE_PATH) return path.startsWith('/') ? path : `/${path}`;
  if (path === BASE_PATH) return '/';
  if (path.startsWith(`${BASE_PATH}/`)) return path.slice(BASE_PATH.length) || '/';
  return path;
};

/** App route -> browser pathname ('/Dammdot-dashboard/products'). */
export const toPublicPath = (route: string): string => {
  const path = route.startsWith('/') ? route : `/${route}`;
  if (!BASE_PATH) return path;
  if (path === '/') return `${BASE_PATH}/`;
  return `${BASE_PATH}${path}`;
};
