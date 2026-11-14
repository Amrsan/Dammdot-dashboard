/**
 * GitHub Pages static-hosting artifacts.
 *
 * - 404.html: Pages has no server-side rewrites, so a direct visit to
 *   /Dammdot-dashboard/products would otherwise return GitHub's 404 page.
 *   Pages serves 404.html for unknown paths; copying the built index.html
 *   lets the client router take over.
 * - .nojekyll: stops Jekyll from ignoring files/folders that begin with "_".
 */
import { access, copyFile, writeFile } from 'node:fs/promises';

const distDir = new URL('../dist/', import.meta.url);

await access(new URL('index.html', distDir));
await copyFile(new URL('index.html', distDir), new URL('404.html', distDir));
await writeFile(new URL('.nojekyll', distDir), '');

console.log('[pages] Created dist/404.html and dist/.nojekyll');
