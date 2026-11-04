import "server-only";
import { GoogleAuth } from "google-auth-library";
import { AssetError, MAX_BYTES } from "@/lib/assets/validate";

const FOLDER = "application/vnd.google-apps.folder";
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
}

/** Pulls the file or folder id out of any common Drive link, or accepts a bare id. */
export function parseDriveId(input: string): string | null {
  const s = input.trim();
  const patterns = [/\/file\/d\/([\w-]{10,})/, /\/folders\/([\w-]{10,})/, /[?&]id=([\w-]{10,})/, /\/d\/([\w-]{10,})/];
  for (const p of patterns) {
    const m = p.exec(s);
    if (m) return m[1];
  }
  return /^[\w-]{20,}$/.test(s) ? s : null;
}

function credentials(): { client_email: string; private_key: string } | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const driveConfigured = () => !!credentials();
export const driveServiceEmail = () => credentials()?.client_email;

async function client() {
  const creds = credentials();
  if (!creds) throw new AssetError("Google Drive isn't connected yet. Add GOOGLE_SERVICE_ACCOUNT_JSON (see the README).", 503);
  return new GoogleAuth({ credentials: creds, scopes: ["https://www.googleapis.com/auth/drive.readonly"] }).getClient();
}

const API = "https://www.googleapis.com/drive/v3/files";
const COMMON = "supportsAllDrives=true";

function friendly(e: unknown): never {
  const status = (e as { response?: { status?: number }; status?: number })?.response?.status ?? (e as { status?: number })?.status;
  if (status === 404 || status === 403) throw new AssetError(`Couldn't open that Drive item. Share it with ${driveServiceEmail() ?? "the service account"} (Viewer is enough) and try again.`, 404);
  if (e instanceof AssetError) throw e;
  throw new AssetError("Google Drive didn't respond. Try again in a moment.", 502);
}

const toFile = (f: { id: string; name: string; mimeType: string; size?: string }): DriveFile => ({ id: f.id, name: f.name, mimeType: f.mimeType, size: f.size ? Number(f.size) : undefined });

export async function resolveDrive(id: string): Promise<{ type: "file"; file: DriveFile } | { type: "folder"; name: string; files: DriveFile[] }> {
  const c = await client();
  try {
    const meta = await c.request<{ id: string; name: string; mimeType: string; size?: string }>({ url: `${API}/${encodeURIComponent(id)}?fields=id,name,mimeType,size&${COMMON}` });
    if (meta.data.mimeType !== FOLDER) return { type: "file", file: toFile(meta.data) };
    const q = encodeURIComponent(`'${id}' in parents and trashed = false and (${IMAGE_TYPES.map((t) => `mimeType = '${t}'`).join(" or ")})`);
    const list = await c.request<{ files: { id: string; name: string; mimeType: string; size?: string }[] }>({ url: `${API}?q=${q}&fields=files(id,name,mimeType,size)&pageSize=60&orderBy=name&includeItemsFromAllDrives=true&${COMMON}` });
    return { type: "folder", name: meta.data.name, files: list.data.files.map(toFile) };
  } catch (e) {
    friendly(e);
  }
}

export async function downloadDrive(id: string): Promise<{ bytes: Uint8Array; name: string }> {
  const c = await client();
  try {
    const meta = await c.request<{ name: string; mimeType: string; size?: string }>({ url: `${API}/${encodeURIComponent(id)}?fields=name,mimeType,size&${COMMON}` });
    if (!IMAGE_TYPES.includes(meta.data.mimeType)) throw new AssetError(`"${meta.data.name}" is a ${meta.data.mimeType.split("/").pop()} file. Only PNG, JPG and WebP images can be imported.`, 415);
    if (meta.data.size && Number(meta.data.size) > MAX_BYTES) throw new AssetError(`"${meta.data.name}" is ${(Number(meta.data.size) / 1e6).toFixed(1)} MB; the limit is ${MAX_BYTES / 1e6 | 0} MB.`, 413);
    const res = await c.request<ArrayBuffer>({ url: `${API}/${encodeURIComponent(id)}?alt=media&${COMMON}`, responseType: "arraybuffer" });
    return { bytes: new Uint8Array(res.data), name: meta.data.name };
  } catch (e) {
    friendly(e);
  }
}
