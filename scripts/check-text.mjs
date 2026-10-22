// Fails on em dashes, and on " -- " used as a dash, in published text
// (AGENTS.md, Public content rules). Code blocks and code spans in Markdown
// and MDX are skipped, so the rule itself can be written down.
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// src/lib and src/schemas hold published strings too (labels, the status stamp).
export const ROOTS = ['src/content', 'src/data', 'src/pages', 'src/components', 'src/layouts', 'src/lib', 'src/schemas'];
const EXTENSIONS = new Set(['.md', '.mdx', '.astro', '.yaml', '.yml', '.json', '.ts']);

/** Blanks out fenced code blocks and inline code, keeping line numbers. */
export function stripCode(text) {
  const blank = (s) => s.replace(/[^\n]/g, ' ');
  return text.replace(/^(```|~~~)[\s\S]*?^\1[^\n]*$/gm, blank).replace(/`[^`\n]*`/g, blank);
}

/** Returns `{ line, found }` for every dash that breaks the rule. */
export function findDashes(text, ext) {
  const scanned = ext === '.md' || ext === '.mdx' ? stripCode(text) : text;
  const hits = [];
  for (const [i, line] of scanned.split('\n').entries()) {
    if (line.includes('\u2014')) hits.push({ line: i + 1, found: 'em dash' });
    if (/\s--\s/.test(line)) hits.push({ line: i + 1, found: '" -- "' });
  }
  return hits;
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (EXTENSIONS.has(extname(entry.name))) yield path;
  }
}

async function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const problems = [];
  for (const dir of ROOTS) {
    for await (const file of walk(join(root, dir))) {
      for (const hit of findDashes(await readFile(file, 'utf8'), extname(file))) {
        problems.push(`${relative(root, file)}:${hit.line}: ${hit.found}`);
      }
    }
  }
  if (problems.length > 0) {
    console.error(`check-text: ${problems.length} dash problem(s); use a comma, colon, full stop or parentheses:\n${problems.join('\n')}`);
    process.exit(1);
  }
  console.log('check-text: no em dashes or " -- " in published text');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
