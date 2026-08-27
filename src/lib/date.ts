const INTL_LOCALE = "en-GB";

/** "2026-08-21" -> Date lúc 00:00 UTC. Không dùng new Date(s) trực tiếp:
 *  chuỗi chỉ có ngày bị hiểu là UTC, nhưng getDate() trả theo giờ máy build,
 *  nên ở múi giờ âm sẽ lùi mất một ngày. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Display date: "21 Aug 2026". */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(INTL_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseISODate(iso));
}

/** Day + month only, for the small calendar tile on the home page. */
export function formatDayMonth(iso: string): { day: string; month: string } {
  const date = parseISODate(iso);
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(INTL_LOCALE, { ...opts, timeZone: "UTC" }).format(date);
  return { day: fmt({ day: "numeric" }), month: fmt({ month: "short" }) };
}
