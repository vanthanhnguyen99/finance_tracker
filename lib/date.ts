export type TimeFilter = "today" | "week" | "month" | "last7" | "last30";
import { getDateInTimeZone, getWeekdayInTimeZone, zonedDateTimeToUtc } from "@/lib/timezone";

export function getRange(filter: TimeFilter, timeZone = "UTC") {
  const now = new Date();
  const end = now;
  const localToday = getDateInTimeZone(now, timeZone);
  const marker = new Date(Date.UTC(localToday.year, localToday.month - 1, localToday.day, 12, 0, 0, 0));

  if (filter === "week") {
    const weekday = getWeekdayInTimeZone(now, timeZone);
    const diff = (weekday + 6) % 7;
    marker.setUTCDate(marker.getUTCDate() - diff);
  } else if (filter === "month") {
    marker.setUTCDate(1);
  } else if (filter === "last7") {
    marker.setUTCDate(marker.getUTCDate() - 6);
  } else if (filter === "last30") {
    marker.setUTCDate(marker.getUTCDate() - 29);
  }

  const start = zonedDateTimeToUtc(
    marker.getUTCFullYear(),
    marker.getUTCMonth() + 1,
    marker.getUTCDate(),
    0,
    0,
    0,
    0,
    timeZone
  );

  return { start, end };
}

export function getPreviousRange(filter: TimeFilter, timeZone = "UTC") {
  const { start, end } = getRange(filter, timeZone);
  return getPreviousRangeFromBounds(start, end);
}

export function getPreviousRangeFromBounds(start: Date, end: Date) {
  const durationMs = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - durationMs);
  return { start: previousStart, end: previousEnd };
}
