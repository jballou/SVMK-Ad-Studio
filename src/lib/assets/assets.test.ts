import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { designForConcept } from "@/lib/dummy/library";
import { CONCEPTS } from "@/lib/dummy/concepts";
import { setImage } from "@/lib/composition/edit";
import { resolveComposition } from "@/lib/composition/defaults";
import { qaComposition } from "@/lib/composition/qa";
import { exportScale } from "@/lib/import/figma";
import { parseDriveId } from "@/lib/import/drive";
import { fakeGif, fakePng } from "@/test/images";
import { hydrateAssetRefs } from "./hydrate";
import { ingestImage, removeAsset } from "./ingest";
import { AssetError, cleanName, inspectImage, MAX_BYTES } from "./validate";

vi.mock("server-only", () => ({}));

describe("inspectImage", () => {
  it("reads dimensions from the bytes and returns the canonical type", () => {
    expect(inspectImage(fakePng(1200, 800))).toMatchObject({ mime: "image/png", ext: "png", width: 1200, height: 800 });
  });
  it("rejects empty, oversized, tiny, huge, unsupported and unreadable files", () => {
    const fails = (b: Uint8Array) => { try { inspectImage(b); } catch (e) { return e instanceof AssetError ? e.message : "other"; } return "ok"; };
    expect(fails(new Uint8Array())).toMatch(/empty/);
    expect(fails(fakePng(200, 200, MAX_BYTES))).toMatch(/MB/);
    expect(fails(fakePng(10, 10))).toMatch(/at least/);
    expect(fails(fakePng(9000, 100))).toMatch(/maximum/);
    expect(fails(fakeGif(200, 200))).toMatch(/GIF/);
    expect(fails(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"></svg>'))).toMatch(/SVG|supported/i);
    expect(fails(new TextEncoder().encode("not an image at all, just some text"))).toMatch(/readable|supported/);
  });
  it("cleans untrusted filenames", () => {
    expect(cleanName("../../etc/passwd.png")).toBe("passwd.png");
    expect(cleanName("C:\\Users\\me\\Team <photo>.png")).toBe("Team photo.png");
    expect(cleanName("   ")).toBe("image");
  });
});

describe("import helpers", () => {
  it("parses Drive links and bare ids", () => {
    const id = "1AbCdEfGhIjKlMnOpQrStUvWxYz";
    expect(parseDriveId(`https://drive.google.com/file/d/${id}/view?usp=sharing`)).toBe(id);
    expect(parseDriveId(`https://drive.google.com/drive/folders/${id}?usp=sharing`)).toBe(id);
    expect(parseDriveId(`https://drive.google.com/open?id=${id}`)).toBe(id);
    expect(parseDriveId(id)).toBe(id);
    expect(parseDriveId("https://example.com/nope")).toBeNull();
  });
  it("picks a Figma export scale that keeps the longest side near 2400px", () => {
    expect(exportScale(600, 400)).toBe(2);
    expect(exportScale(1200, 1200)).toBe(2);
    expect(exportScale(4800, 2000)).toBe(0.5);
    expect(exportScale(100000, 10)).toBe(0.1);
  });
});

describe("storage drivers", () => {
  it("local driver round-trips and refuses keys that escape its directory", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "adstudio-"));
    const { localStorage } = await import("@/lib/storage");
    const s = localStorage(dir);
    await s.put("assets/a.png", new Uint8Array([1, 2, 3]), "image/png");
    const got = await s.get("assets/a.png");
    expect(got?.contentType).toBe("image/png");
    expect([...(got!.body as Uint8Array)]).toEqual([1, 2, 3]);
    await s.remove("assets/a.png");
    expect(await s.get("assets/a.png")).toBeNull();
    await expect(s.put("../escape.png", new Uint8Array([1]), "image/png")).rejects.toThrow(/Invalid/);
    await rm(dir, { recursive: true, force: true });
  });
  it("blob driver stores privately and reads back with private access", async () => {
    const put = vi.fn().mockResolvedValue({});
    const get = vi.fn().mockResolvedValue({ stream: new ReadableStream(), blob: { contentType: "image/png", size: 3 } });
    const del = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@vercel/blob", () => ({ put, get, del }));
    vi.resetModules();
    const { blobStorage } = await import("@/lib/storage");
    const s = blobStorage();
    await s.put("assets/x.png", new Uint8Array([1]), "image/png");
    expect(put).toHaveBeenCalledWith("assets/x.png", expect.any(Buffer), expect.objectContaining({ access: "private", contentType: "image/png", allowOverwrite: false }));
    expect((await s.get("assets/x.png"))?.contentType).toBe("image/png");
    expect(get).toHaveBeenCalledWith("assets/x.png", { access: "private" });
    await s.remove("assets/x.png");
    expect(del).toHaveBeenCalledWith("assets/x.png");
    vi.doUnmock("@vercel/blob");
  });
});

describe("ingest and hydrate", () => {
  let db: Db;
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "adstudio-up-"));
    process.env.UPLOAD_DIR = dir;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.VERCEL;
    const d = drizzle(new PGlite(), { schema });
    await migrate(d, { migrationsFolder: "./drizzle" });
    db = d as unknown as Db;
  }, 30_000);
  afterAll(async () => { delete process.env.UPLOAD_DIR; await rm(dir, { recursive: true, force: true }); });

  it("stores an image, records it unapproved, and can remove it", async () => {
    vi.resetModules();
    const ing = await import("./ingest");
    const dto = await ing.ingestImage(db, { bytes: fakePng(1600, 1200), name: "../Team shot.png", kind: "photo", origin: "figma", originRef: { fileKey: "abc", nodeId: "1:2" } });
    expect(dto).toMatchObject({ kind: "photo", name: "Team shot.png", origin: "figma", width: 1600, height: 1200, approved: false });
    expect(dto.url).toBe(`/api/assets/${dto.id}`);
    expect(await ing.removeAsset(db, dto.id)).toBe(true);
    expect(await ing.removeAsset(db, dto.id)).toBe(false);
  });
  it("rejects bad files before storing anything", async () => {
    await expect(ingestImage(db, { bytes: fakeGif(300, 300), name: "a.gif", kind: "photo", origin: "upload" })).rejects.toThrow(/GIF/);
  });
  it("hydrate replaces client-supplied asset details and rejects unknown assets", async () => {
    const dto = await ingestImage(db, { bytes: fakePng(2000, 1000), name: "hero.png", kind: "photo", origin: "upload" });
    const design = designForConcept(CONCEPTS[0]);
    const lying = setImage(design, "photo", { source: "asset", id: dto.id, name: "lie", naturalW: 99999, naturalH: 1, approved: true, origin: "upload" });
    const real = await hydrateAssetRefs(db, lying);
    expect(real.content.layers.photo.image).toMatchObject({ name: "hero.png", naturalW: 2000, naturalH: 1000, approved: false });
    const ghost = setImage(design, "photo", { source: "asset", id: "00000000-0000-4000-8000-000000000000", name: "x", naturalW: 1, naturalH: 1, approved: true, origin: "upload" });
    await expect(hydrateAssetRefs(db, ghost)).rejects.toThrow(/no longer exists/);
    await removeAsset(db, dto.id);
  });
});

describe("QA for stored assets", () => {
  const concept = CONCEPTS.find((c) => c.key === "GetInsights")!;
  const ctx = { placementKey: "facebook-feed", width: 1080, height: 1080, supports: { photo: true, product: true }, themeBg: "#10412C" };
  const withAsset = (approved: boolean, naturalW: number) =>
    resolveComposition(setImage(designForConcept(concept), "photo", { source: "asset", id: "a", name: "hero.png", naturalW, naturalH: naturalW, approved, origin: "figma" }), 1080, 1080, "facebook-feed");
  it("warns for unapproved stored assets but not approved ones", () => {
    expect(qaComposition(withAsset(false, 4000), ctx).some((i) => i.id === "photo-unapproved")).toBe(true);
    expect(qaComposition(withAsset(true, 4000), ctx).some((i) => i.id === "photo-unapproved")).toBe(false);
  });
  it("still checks resolution for approved assets", () => {
    expect(qaComposition(withAsset(true, 100), ctx).some((i) => i.id === "photo-lowres" && i.severity === "error")).toBe(true);
  });
});
