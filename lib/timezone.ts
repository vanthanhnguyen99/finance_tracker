import type { NextRequest } from "next/server";

export const TIMEZONE_COOKIE_NAME = "finance_tz";
export const DEFAULT_TIME_ZONE = "UTC";

export type DateParts = {
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
    hourCycle: "h23"
  });
  const raw = formatter.formatToParts(date);
  const pick = (type: string) => Number(raw.find((part) => part.type === type)?.value ?? "0");
  const hour = pick("hour");
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    // Some ICU builds still emit 24:00 for midnight even with a 0-23 hour cycle.
    hour: hour === 24 ? 0 : hour,
    minute: pick("minute"),
    second: pick("second")
  };
}

function getUtcTimestamp(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number
) {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, millisecond);
  return date.getTime();
}

function getOffsetMs(date: Date, timeZone: string) {
  const parts = getDatePartsInTimeZone(date, timeZone);
  const asUtc = getUtcTimestamp(
    parts.year,
    parts.month,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    0
  );
  // Intl parts have second precision, so exclude milliseconds when calculating the zone offset.
  const dateAtWholeSecond = date.getTime() - date.getUTCMilliseconds();
  return asUtc - dateAtWholeSecond;
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

export function getDateTimeInTimeZone(date: Date, timeZone: string) {
  return getDatePartsInTimeZone(date, timeZone);
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
  const baseUtcMs = getUtcTimestamp(year, month, day, hour, minute, second, millisecond);
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

  const calendarDate = new Date(getUtcTimestamp(year, month, day, 0, 0, 0, 0));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() + 1 !== month ||
    calendarDate.getUTCDate() !== day
  ) {
    return null;
  }

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
