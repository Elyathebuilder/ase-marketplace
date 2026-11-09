/** Notification text in the reader's language, with amounts formatted. Used in the app and in emails. */
import { getDict, type Lang } from "@/i18n";
import { formatTetri } from "../money";

export function notificationText(lang: Lang, kind: string, orderId: string | null, params: Record<string, unknown>) {
  const p: Record<string, unknown> = { ...params };
  for (const k of ["total", "remaining", "amount", "over", "received", "payable", "goods"]) if (typeof p[k] === "number") p[`${k}Text`] = formatTetri(p[k] as number);
  const fn = getDict(lang).market.notif[kind];
  return fn ? fn(orderId ?? "", p) : kind;
}
