import type { ReactNode } from "react";

export interface LinkedInFeedProps {
  company?: string;
  followers?: string;
  intro: string;
  headline: string;
  domain?: string;
  cta?: string;
  /** Creative node (e.g. AdArt) or an image URL; a placeholder block is shown when absent. */
  media?: ReactNode;
  imageUrl?: string;
  width: number;
  height: number;
}

const INTRO_CLAMP = 150;

export function LinkedInFeed({ company = "SurveyMonkey", followers = "1,234,567 followers", intro, headline, domain = "surveymonkey.com", cta = "Learn more", media, imageUrl, width, height }: LinkedInFeedProps) {
  return (
    <article className="w-[420px] max-w-full overflow-hidden rounded-lg border border-neutral-300 bg-white text-neutral-900 shadow-sm" aria-label="LinkedIn feed preview">
      <header className="flex items-center gap-2 p-3">
        <div className="h-12 w-12 rounded bg-emerald-600" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">{company}</p>
          <p className="text-xs text-neutral-500">{followers}</p>
          <p className="text-xs text-neutral-500">Promoted</p>
        </div>
      </header>
      <p className={`px-3 pb-2 text-sm ${intro.length > INTRO_CLAMP ? "text-red-700" : ""}`}>{intro}</p>
      <div className="w-full bg-neutral-200" style={media ? undefined : { aspectRatio: `${width} / ${height}` }}>
        {media ?? (imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-neutral-500" style={{ aspectRatio: `${width} / ${height}` }}>{width}×{height}</div>
        ))}
      </div>
      <footer className="flex items-center justify-between gap-3 bg-neutral-100 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{headline}</p>
          <p className="text-xs text-neutral-500">{domain}</p>
        </div>
        <span className="shrink-0 rounded-full border border-blue-700 px-3 py-1 text-sm font-semibold text-blue-700">{cta}</span>
      </footer>
    </article>
  );
}
