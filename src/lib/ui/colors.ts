import type { PlatformKey } from "@/lib/specs/platforms";

export const PLATFORM_LABEL: Record<PlatformKey, string> = { linkedin: "LinkedIn", meta: "Meta", display: "Display", newsletter: "Newsletter" };

// Brand palette values (see globals.css brand-* tokens) for SVG charts and inline styles.
export const PLATFORM_COLOR: Record<PlatformKey, string> = {
  linkedin: "#5568BF", // periwinkle 600
  meta: "#43A6AF", // teal 600
  display: "#D07A2F", // orange 500
  newsletter: "#99A532", // lime 600
};

export const SERIES_COLORS = ["#7068EB", "#08794A", "#D07A2F", "#43A6AF", "#AE453F", "#99A532"];
