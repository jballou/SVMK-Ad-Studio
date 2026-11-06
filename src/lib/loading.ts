/**
 * Loading indicator timing. SHOW_DELAY_MS and FADE_MS are mirrored in the `.loading-indicator` CSS (globals.css).
 * - The loader stays invisible for the first SHOW_DELAY_MS, so a load that finishes inside it never shows one.
 * - Once visible, it plays for at least MIN_VISIBLE_MS, then fades out over FADE_MS before the content appears.
 */
export const SHOW_DELAY_MS = 150;
export const MIN_VISIBLE_MS = 1500;
export const FADE_MS = 200;

/**
 * How long to keep the loader up after the content is ready, given how long loading took.
 * `null` means the loader was never visible, so show the content straight away.
 */
export function holdTimeMs(loadingMs: number): number | null {
  if (loadingMs < SHOW_DELAY_MS) return null;
  const visibleFor = loadingMs - SHOW_DELAY_MS;
  return Math.max(0, MIN_VISIBLE_MS - visibleFor);
}
