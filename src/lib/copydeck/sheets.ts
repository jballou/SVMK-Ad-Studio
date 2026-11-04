import { GoogleAuth } from "google-auth-library";

/** Read one tab via the Sheets API. The sheet must be shared with the service account's email. */
export async function fetchSheetValues(sheetId: string, tab: string): Promise<string[][]> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  const auth = new GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const client = await auth.getClient();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tab)}?valueRenderOption=FORMATTED_VALUE`;
  const res = await client.request<{ values?: string[][] }>({ url });
  return res.data.values ?? [];
}
