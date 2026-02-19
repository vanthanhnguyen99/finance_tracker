import { NextRequest } from "next/server";

export const TIMEZONE_COOKIE_NAME = "finance_tz";
export const DEFAULT_TIME_ZONE = "UTC";

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getDatePartsInTimeZone(date: Date, timeZone: string): DateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const raw = formatter.formatToParts(date);
  const pick = (type: string) => Number(raw.find((part) => part.type === type)?.value ?? "0");
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour"),
    minute: pick("minute"),
    second: pick("second")
  };
}

function getOffsetMs(date: Date, timeZone: string) {
  const parts = getDatePartsInTimeZone(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return asUtc - date.getTime();
}

export function resolveTimeZone(timeZone: string | null | undefined) {
  if (!timeZone) return DEFAULT_TIME_ZONE;
  try {
    // Validate IANA timezone name.
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

export function getTimeZoneFromRequest(req: NextRequest) {
  return resolveTimeZone(req.cookies.get(TIMEZONE_COOKIE_NAME)?.value);
}

export function getDateInTimeZone(date: Date, timeZone: string) {
  const parts = getDatePartsInTimeZone(date, timeZone);
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day
  };
}

export function getWeekdayInTimeZone(date: Date, timeZone: string) {
  const label = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };
  return map[label] ?? 0;
}

export function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  timeZone: string
) {
  const baseUtcMs = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  let utcMs = baseUtcMs;
  for (let i = 0; i < 3; i += 1) {
    const offset = getOffsetMs(new Date(utcMs), timeZone);
    utcMs = baseUtcMs - offset;
  }
  return new Date(utcMs);
}

export function parseDateInputInTimeZone(
  value: string | null | undefined,
  timeZone: string,
  endOfDay = false
) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return zonedDateTimeToUtc(
    year,
    month,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
    timeZone
  );
}
