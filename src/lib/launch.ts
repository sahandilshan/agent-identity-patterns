import { LAUNCH } from 'astro:env/server';

/**
 * Every build that is not a launch build is a preview: it shows the preview
 * banner and asks search engines not to index any page.
 */
export const PREVIEW = !LAUNCH;

/** Fails a launch build that would publish something unfinished. */
export function assertNotForLaunch(what: string): void {
  if (LAUNCH) throw new Error(`Launch gate: ${what} cannot be published`);
}
