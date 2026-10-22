// Checks every internal link in the built site: it must sit under the base
// path, resolve to a built file, and point at an id that exists. CSS url()
// references (fonts) are checked the same way.
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, posix, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/** href and src values in an HTML page. */
export function htmlRefs(html) {
  return [...html.matchAll(/\s(?:href|src)=(?:"([^"]*)"|'([^']*)')/g)].map((m) => m[1] ?? m[2] ?? '');
}

/** url() values in a stylesheet. */
export function cssRefs(css) {
  return [...css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s]+))\s*\)/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? '');
}

/** id values in an HTML page. */
export function htmlIds(html) {
  return new Set([...html.matchAll(/\sid=(?:"([^"]*)"|'([^']*)')/g)].map((m) => m[1] ?? m[2] ?? ''));
}

/**
 * Problems for one reference.
 * @param {string} ref the raw href, src or url() value
 * @param {string} from the referring file, relative to dist, with forward slashes
 * @param {{ base: string, files: Set<string>, ids: Map<string, Set<string>> }} site
 */
export function checkRef(ref, from, { base, files, ids }) {
  if (ref === '' || EXTERNAL.test(ref)) return [];
  const [pathPart = '', fragment] = ref.split('#');
  const path = pathPart.split('?')[0] ?? '';
  const baseDir = base.endsWith('/') ? base : `${base}/`;

  let target;
  if (path === '') {
    target = from;
  } else if (path.startsWith('/')) {
    if (!(path === base || path.startsWith(baseDir))) return [`${from}: "${ref}" is root-relative but skips the base path ${base}`];
    target = path.slice(baseDir.length);
  } else {
    target = posix.join(posix.dirname(from), path).replace(/^\.(?:\/|$)/, '');
    if (target.startsWith('../')) return [`${from}: "${ref}" points outside the site`];
  }
  if (target === '' || target.endsWith('/')) target += 'index.html';
  else if (!files.has(target) && files.has(`${target}/index.html`)) {
    return [`${from}: "${ref}" needs a trailing slash`];
  }
  if (!files.has(target)) return [`${from}: "${ref}" does not resolve to a built file`];
  if (fragment && target.endsWith('.html') && !ids.get(target)?.has(fragment)) {
    return [`${from}: "${ref}" points at #${fragment}, which ${target} does not define`];
  }
  return [];
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

async function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const dist = join(root, 'dist');
  const { default: config } = await import(pathToFileURL(join(root, 'astro.config.mjs')).href);
  const base = config.base ?? '/';

  const contents = new Map();
  for await (const file of walk(dist)) {
    const rel = relative(dist, file).split(sep).join('/');
    const ext = extname(file);
    contents.set(rel, ext === '.html' || ext === '.css' ? await readFile(file, 'utf8') : null);
  }
  const files = new Set(contents.keys());
  const ids = new Map();
  for (const [rel, text] of contents) if (rel.endsWith('.html') && text) ids.set(rel, htmlIds(text));

  const problems = [];
  let checked = 0;
  for (const [rel, text] of contents) {
    if (!text) continue;
    const refs = rel.endsWith('.html') ? htmlRefs(text) : cssRefs(text);
    for (const ref of refs) {
      checked += 1;
      problems.push(...checkRef(ref, rel, { base, files, ids }));
    }
  }
  if (files.size === 0) problems.push('dist/ is empty; run the build first');
  if (problems.length > 0) {
    console.error(`check-links: ${problems.length} broken internal link(s):\n${problems.join('\n')}`);
    process.exit(1);
  }
  console.log(`check-links: ${checked} references in ${ids.size} pages resolve`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
