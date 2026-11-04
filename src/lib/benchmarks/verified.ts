/**
 * A benchmark is "verified" when its source is a platform's own reported data.
 * Only LinkedIn qualifies today; extend this when other platforms' pulls are verified.
 * (A proper data-status column arrives with the Creative Score model.)
 */
export function verifiedPlatformFor(source: string | undefined | null): "LinkedIn" | null {
  return source && /^linkedin\b/i.test(source.trim()) ? "LinkedIn" : null;
}
