// One-step performance import. The file says which platform ads it has; each is matched to an Ad Studio ad
// (saved link, same name, or same concept + month + size) or created from its name and ad set. Nothing is
// asked unless two answers are possible or stored numbers disagree with the file.
import { and, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import type { Db } from "@/db";
import * as t from "@/db/schema";
import { parseAdSet, parseLinkedInAdName, parseStudioName, type ParsedAdName } from "@/lib/import/linkedin";
import type { MetricRow, SourceAd } from "@/lib/metrics/csv";
import { placementsFor, type PlatformKey } from "@/lib/specs/platforms";

export interface ImportDecisions {
  /** When stored daily numbers differ from the file: use the file's, or keep what's stored. */
  data?: "replace" | "keep";
  /** For an ad that could be either of several Ad Studio ads: the ad's name, or "__new__" to add it as a new ad. */
  pick?: Record<string, string>;
}

export interface ImportInput {
  platform: string;
  rows: MetricRow[];
  ads: SourceAd[];
  decisions?: ImportDecisions;
}

export type Conflict =
  | { kind: "ambiguous"; key: string; name: string; options: string[] }
  | { kind: "data"; days: number; ads: number; examples: { ad: string; day: string; stored: string; incoming: string }[] };

export interface ImportSummary2 {
  platform: string;
  /** Distinct ad-days written. */
  days: number;
  /** Ad-days left as stored because the user chose to keep them. */
  keptDays: number;
  matched: number;
  created: number;
  /** Ad Studio ad names for what was created (first few). */
  createdNames: string[];
  skipped: { name: string; reason: string }[];
  spend: number;
  impressions: number;
}

export type ImportResult = { status: "done"; summary: ImportSummary2 } | { status: "needs-decisions"; conflicts: Conflict[] };

const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const norm = (conceptKey: string, month: string | undefined, w: number | undefined, h: number | undefined) => `${conceptKey.toLowerCase()}|${month ?? ""}|${w ?? 0}x${h ?? 0}`;
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const same = (a: number, b: number) => Math.abs(a - b) < 0.005;

interface Target { adId: number; name: string }
interface ToCreate { name: string; parsed: ParsedAdName; src: SourceAd; keys: string[]; live: boolean; lastDay?: string }

export async function runPerformanceImport(db: Db, input: ImportInput): Promise<ImportResult> {
  const { platform, rows, ads: sources } = input;
  const decisions = input.decisions ?? {};
  if (platform !== "linkedin") throw new Error(`There's no automatic reader for ${platform} exports yet.`);

  const existing = await db.select({ id: t.ads.id, name: t.ads.name, platform: t.ads.platform }).from(t.ads);
  const byName = new Map(existing.map((a) => [a.name, a]));
  const links = await db.select().from(t.adAliases).where(eq(t.adAliases.platform, platform));
  const linkOf = new Map(links.map((l) => [l.externalKey, l.adId]));
  const nameOfId = new Map(existing.map((a) => [a.id, a.name]));
  const studio = new Map<string, string[]>();
  for (const a of existing.filter((x) => x.platform === platform)) {
    const p = parseStudioName(a.name);
    if (p) studio.set(norm(p.conceptKey, p.month, p.width, p.height), [...(studio.get(norm(p.conceptKey, p.month, p.width, p.height)) ?? []), a.name]);
  }

  const skipped: ImportSummary2["skipped"] = [];
  const conflicts: Conflict[] = [];
  const resolved = new Map<string, Target>(); // source key -> existing ad
  const creates = new Map<string, ToCreate>(); // new ad name -> details

  for (const src of sources) {
    if (src.kind && /messaging/i.test(src.kind)) { skipped.push({ name: src.name, reason: "Message ad (no image size)" }); continue; }
    const linked = linkOf.get(src.key) ?? (src.externalId ? linkOf.get(src.externalId) : undefined) ?? linkOf.get(src.name);
    if (linked !== undefined && nameOfId.has(linked)) { resolved.set(src.key, { adId: linked, name: nameOfId.get(linked)! }); continue; }
    const exact = byName.get(src.name);
    if (exact && exact.platform === platform) { resolved.set(src.key, { adId: exact.id, name: exact.name }); continue; }

    const parsed = parseLinkedInAdName(src.name);
    const candidates = parsed ? studio.get(norm(parsed.conceptKey, parsed.month, parsed.width, parsed.height)) ?? [] : [];
    const picked = decisions.pick?.[src.key];
    if (candidates.length === 1 && picked === undefined) { const a = byName.get(candidates[0])!; resolved.set(src.key, { adId: a.id, name: a.name }); continue; }
    if (candidates.length > 1 && picked === undefined) { conflicts.push({ kind: "ambiguous", key: src.key, name: src.name, options: candidates }); continue; }
    if (picked && picked !== "__new__" && byName.has(picked)) { const a = byName.get(picked)!; resolved.set(src.key, { adId: a.id, name: a.name }); continue; }

    if (!parsed) {
      const unnamed = src.name === src.externalId;
      skipped.push({ name: src.name, reason: unnamed ? "No name in the platform, so its format and size can't be read. Name it there and upload again." : "Name isn't in the LI_Format_Concept_Design_Type_WxH shape" });
      continue;
    }
    if (!parsed.width || !parsed.height) { skipped.push({ name: src.name, reason: "No size in the name" }); continue; }
    if (exact) { skipped.push({ name: src.name, reason: `Name is already used by a ${exact.platform} ad` }); continue; }
    const cur = creates.get(src.name);
    const live = /^active$/i.test(src.status ?? "");
    if (cur) {
      cur.keys.push(src.key);
      cur.live ||= live;
      if (src.impressions > cur.src.impressions) cur.src = src;
      if (src.lastDay && (!cur.lastDay || src.lastDay > cur.lastDay)) cur.lastDay = src.lastDay;
    } else creates.set(src.name, { name: src.name, parsed, src, keys: [src.key], live, lastDay: src.lastDay });
  }

  // Which metric rows belong to which source ad.
  const keyOf = (r: MetricRow) => r.externalId ?? r.adName;
  const importable = new Set([...resolved.keys(), ...[...creates.values()].flatMap((c) => c.keys)]);
  const usable = rows.filter((r) => importable.has(keyOf(r)));

  // Do stored daily numbers (from an earlier upload) disagree with this file?
  const merged = new Map<string, { spend: number; impressions: number; clicks: number; conversions: number; videoStarts?: number; videoCompletions?: number; adId?: number; key: string; day: string }>();
  const idForKey = (key: string) => resolved.get(key)?.adId;
  for (const r of usable) {
    const target = resolved.get(keyOf(r));
    const owner = target ? `id:${target.adId}` : `new:${[...creates.values()].find((c) => c.keys.includes(keyOf(r)))!.name}`;
    const k = `${owner}|${r.day}`;
    const m = merged.get(k) ?? { spend: 0, impressions: 0, clicks: 0, conversions: 0, key: owner, day: r.day, adId: idForKey(keyOf(r)) };
    m.spend += r.spend; m.impressions += r.impressions; m.clicks += r.clicks; m.conversions += r.conversions;
    if (r.videoStarts !== undefined) m.videoStarts = (m.videoStarts ?? 0) + r.videoStarts;
    if (r.videoCompletions !== undefined) m.videoCompletions = (m.videoCompletions ?? 0) + r.videoCompletions;
    merged.set(k, m);
  }
  const existingIds = [...new Set([...merged.values()].map((m) => m.adId).filter((x): x is number => x !== undefined))];
  const stored = new Map<string, { spend: number; impressions: number; clicks: number }>();
  if (existingIds.length) {
    const days = usable.map((r) => r.day).sort();
    const rowsDb = await db.select().from(t.metricsDaily).where(and(inArray(t.metricsDaily.adId, existingIds), ne(t.metricsDaily.source, "sample"), gte(t.metricsDaily.day, days[0]), lte(t.metricsDaily.day, days[days.length - 1])));
    for (const d of rowsDb) stored.set(`${d.adId}|${d.day}`, { spend: d.spend, impressions: d.impressions, clicks: d.clicks });
  }
  const disagree = [...merged.values()].filter((m) => {
    const s = m.adId !== undefined ? stored.get(`${m.adId}|${m.day}`) : undefined;
    return !!s && !(same(s.spend, m.spend) && s.impressions === m.impressions && s.clicks === m.clicks);
  });
  if (disagree.length && !decisions.data) {
    conflicts.push({
      kind: "data",
      days: disagree.length,
      ads: new Set(disagree.map((m) => m.adId)).size,
      examples: disagree.slice(0, 4).map((m) => {
        const s = stored.get(`${m.adId}|${m.day}`)!;
        return { ad: nameOfId.get(m.adId!)!, day: m.day, stored: `${s.impressions.toLocaleString("en-US")} impressions, ${money(s.spend)}`, incoming: `${m.impressions.toLocaleString("en-US")} impressions, ${money(m.spend)}` };
      }),
    });
  }
  if (conflicts.length) return { status: "needs-decisions", conflicts };

  // ---- Write ----
  const fileStart = usable.map((r) => r.day).sort()[0];
  const placementFor = (w: number, h: number) => {
    const list = placementsFor(platform as PlatformKey);
    return (list.find((p) => p.sizes.some((s) => s.w === w && s.h === h)) ?? list[0])?.key ?? `${platform}-default`;
  };
  const created: Target[] = [];
  const newIdByName = new Map<string, number>();
  let summary: ImportSummary2 | undefined;

  await db.transaction(async (tx) => {
    const list = [...creates.values()];
    if (list.length) {
      const conceptKeys = [...new Set(list.map((c) => c.parsed.conceptKey))];
      for (const part of chunk(conceptKeys, 200)) await tx.insert(t.concepts).values(part.map((k) => ({ conceptKey: k, tags: { persona: [] } }))).onConflictDoNothing();
      const conceptId = new Map((await tx.select({ id: t.concepts.id, key: t.concepts.conceptKey }).from(t.concepts).where(inArray(t.concepts.conceptKey, conceptKeys))).map((c) => [c.key, c.id]));
      const cr = [...new Map(list.map((c) => [`${c.parsed.conceptKey}|${c.parsed.width}|${c.parsed.height}`, c])).values()];
      for (const part of chunk(cr, 200)) {
        await tx.insert(t.creatives).values(part.map((c) => ({ conceptId: conceptId.get(c.parsed.conceptKey)!, figmaNodeId: `import:${platform}:${c.parsed.conceptKey}:${c.parsed.width}x${c.parsed.height}`, width: c.parsed.width!, height: c.parsed.height! }))).onConflictDoNothing();
      }
      const creativeRows = await tx.select().from(t.creatives).where(inArray(t.creatives.conceptId, [...conceptId.values()]));
      const creativeId = new Map(creativeRows.map((c) => [`${c.conceptId}|${c.width}|${c.height}`, c.id]));
      for (const part of chunk(list, 200)) {
        const values = part.map((c) => {
          const set = parseAdSet(c.src.adSet, c.src.objective, c.src.campaign);
          const mm = c.parsed.month;
          const monthStart = mm ? `${mm.slice(2)}-${mm.slice(0, 2)}-01` : undefined;
          let launched = c.src.firstDay;
          // The file only covers a window; an ad already running at its start launched earlier. Its name's month is the best clue.
          if (launched && launched === fileStart && monthStart && monthStart < launched && dayDiff(monthStart, launched) <= 180) launched = monthStart;
          return {
            creativeId: creativeId.get(`${conceptId.get(c.parsed.conceptKey)}|${c.parsed.width}|${c.parsed.height}`)!,
            name: c.name,
            platform,
            placement: placementFor(c.parsed.width!, c.parsed.height!),
            adType: c.parsed.adType,
            stage: set.stage ?? null,
            geo: set.geo ?? null,
            status: (c.live ? "live" : "paused") as "live" | "paused",
            launchedAt: launched ?? null,
            pausedAt: c.live ? null : c.lastDay ?? null,
            tags: { persona: set.personas, funnel: set.funnel, geo: set.geo ? [set.geo] : [], source: `${platform}-import`, platformAdIds: c.keys },
          };
        });
        const out = await tx.insert(t.ads).values(values).onConflictDoNothing().returning({ id: t.ads.id, name: t.ads.name });
        for (const o of out) { newIdByName.set(o.name, o.id); created.push({ adId: o.id, name: o.name }); }
      }
    }

    // Saved links, so the next export matches without a look.
    const allLinks: { platform: string; externalKey: string; adId: number }[] = [];
    for (const [key, target] of resolved) allLinks.push({ platform, externalKey: key, adId: target.adId });
    for (const c of creates.values()) { const id = newIdByName.get(c.name); if (id) for (const k of c.keys) allLinks.push({ platform, externalKey: k, adId: id }); }
    for (const part of chunk(allLinks, 500)) await tx.insert(t.adAliases).values(part).onConflictDoUpdate({ target: [t.adAliases.platform, t.adAliases.externalKey], set: { adId: sql`excluded.ad_id` } });

    // Daily numbers. Sample rows for ads that now have real ones are replaced.
    const idOf = (m: { key: string }) => (m.key.startsWith("id:") ? Number(m.key.slice(3)) : newIdByName.get(m.key.slice(4)));
    const out: (typeof t.metricsDaily.$inferInsert)[] = [];
    let kept = 0;
    for (const m of merged.values()) {
      const adId = idOf(m);
      if (adId === undefined) continue;
      const s = stored.get(`${adId}|${m.day}`);
      if (s && decisions.data === "keep" && !(same(s.spend, m.spend) && s.impressions === m.impressions && s.clicks === m.clicks)) { kept++; continue; }
      out.push({ adId, day: m.day, spend: m.spend, impressions: m.impressions, clicks: m.clicks, conversions: m.conversions, videoStarts: m.videoStarts ?? null, videoCompletions: m.videoCompletions ?? null, source: platform });
    }
    const touched = [...new Set(out.map((o) => o.adId))];
    for (const part of chunk(touched, 500)) await tx.delete(t.metricsDaily).where(and(inArray(t.metricsDaily.adId, part), eq(t.metricsDaily.source, "sample")));
    for (const part of chunk(out, 500)) {
      await tx.insert(t.metricsDaily).values(part).onConflictDoUpdate({
        target: [t.metricsDaily.adId, t.metricsDaily.day],
        set: { spend: sql`excluded.spend`, impressions: sql`excluded.impressions`, clicks: sql`excluded.clicks`, conversions: sql`excluded.conversions`, videoStarts: sql`excluded.video_starts`, videoCompletions: sql`excluded.video_completions`, source: sql`excluded.source` },
      });
    }
    summary = { platform, days: out.length, keptDays: kept, matched: new Set([...resolved.values()].map((r) => r.adId)).size, created: created.length, createdNames: created.slice(0, 5).map((c) => c.name), skipped, spend: out.reduce((a, o) => a + (o.spend ?? 0), 0), impressions: out.reduce((a, o) => a + (o.impressions ?? 0), 0) };
  });
  return { status: "done", summary: summary! };
}

