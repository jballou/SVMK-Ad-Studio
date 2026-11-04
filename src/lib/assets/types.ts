export type AssetOrigin = "upload" | "drive" | "figma";

/** What the browser sees of a stored image. The bytes are only served through /api/assets/[id]. */
export interface AssetDto {
  id: string;
  kind: "photo" | "product";
  name: string;
  origin: AssetOrigin;
  width: number;
  height: number;
  bytes: number;
  approved: boolean;
  createdAt: string;
  url: string;
}

export interface Capabilities {
  storage: "blob" | "local" | "none";
  drive: boolean;
  /** Share Drive files or folders with this address so the app can read them. */
  driveEmail?: string;
  figma: boolean;
  /** False on the hosted demo (in-memory database): image records reset, so saved images won't last. */
  persistent?: boolean;
}

export const assetUrl = (id: string) => `/api/assets/${id}`;
