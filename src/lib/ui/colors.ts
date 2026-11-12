import { platformColor, platformLabel } from "@/lib/specs/platforms";

// Platform names and colors come from the registry (built-in plus platforms added in Settings).
// These proxies keep the `PLATFORM_LABEL[p]` call sites working.
export const PLATFORM_LABEL: Record<string, string> = new Proxy({} as Record<string, string>, { get: (_t, k) => (typeof k === "string" ? platformLabel(k) : undefined) });
export const PLATFORM_COLOR: Record<string, string> = new Proxy({} as Record<string, string>, { get: (_t, k) => (typeof k === "string" ? platformColor(k) : undefined) });

export const SERIES_COLORS = ["#7068EB", "#08794A", "#D07A2F", "#43A6AF", "#AE453F", "#99A532"];
