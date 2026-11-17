import "server-only";
import { cookies } from "next/headers";

export const DUMMY_COOKIE = "ad-studio-dummy";

/** Whether this viewer wants the demo data shown. On unless they switched it off; the choice is theirs alone (a cookie). */
export async function dummyDataOn(): Promise<boolean> {
  return (await cookies()).get(DUMMY_COOKIE)?.value !== "off";
}
