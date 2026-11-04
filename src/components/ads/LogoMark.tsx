import { LOGO_COLOR, type LogoVariant } from "@/lib/composition/logo";

/**
 * Placeholder brand mark (glyph + wordmark) in one of the three approved colors. Swap for the real
 * logo component once it's in Figma or the asset library. Sized in em so it scales with the container.
 */
export function LogoMark({ variant = "green", compact = false, size = "3.2cqmin", className = "" }: { variant?: LogoVariant; compact?: boolean; size?: string; className?: string }) {
  const color = LOGO_COLOR[variant];
  return (
    <span className={`inline-flex items-center ${className}`} style={{ color, fontSize: size, lineHeight: 1, gap: "0.4em", fontWeight: 700, letterSpacing: "0.01em", whiteSpace: "nowrap" }} role="img" aria-label="SurveyMonkey logo">
      <svg width="1.7em" height="1.7em" viewBox="0 0 32 32" aria-hidden fill="none">
        <circle cx="16" cy="17" r="11" fill="currentColor" />
        <circle cx="6" cy="14" r="4" fill="currentColor" />
        <circle cx="26" cy="14" r="4" fill="currentColor" />
        <circle cx="12.5" cy="15" r="1.6" fill={variant === "white" ? "#242423" : "#fff"} />
        <circle cx="19.5" cy="15" r="1.6" fill={variant === "white" ? "#242423" : "#fff"} />
        <path d="M11.5 20.5c1.2 2 3 3 4.5 3s3.3-1 4.5-3" stroke={variant === "white" ? "#242423" : "#fff"} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {!compact && <span>SurveyMonkey</span>}
    </span>
  );
}
