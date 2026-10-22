import { LAUNCH } from 'astro:env/server';

/** Fails a launch build that would publish something unfinished. */
export function assertNotForLaunch(what: string): void {
  if (LAUNCH) throw new Error(`Launch gate: ${what} cannot be published`);
}
