import { LogoLoader } from "./logo-loader";

/**
 * The app's loading indicator: the animated logo (20px tall) with the word "Loading" and dots that build to
 * three and clear one at a time (CSS only, so it works in server-rendered Suspense fallbacks). It fades in after a
 * short delay so quick loads don't flash. `instant` skips that fade-in (used when one loader takes over from another),
 * and `leaving` fades it out. Timing rules live in lib/loading.ts.
 */
export function Loading({ label = "Loading", leaving = false, instant = false, className = "" }: { label?: string; leaving?: boolean; instant?: boolean; className?: string }) {
  return (
    <span role="status" aria-live="polite" className={`loading-indicator ${instant ? "is-instant" : ""} ${leaving ? "is-leaving" : ""} ${className}`}>
      <LogoLoader height={20} label="" />
      <span className="loading-label">
        {label}
        <span aria-hidden className="loading-dots"><i>.</i><i>.</i><i>.</i></span>
      </span>
    </span>
  );
}
