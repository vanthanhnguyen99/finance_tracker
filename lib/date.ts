export type TimeFilter = "today" | "week" | "month" | "last7" | "last30";
import {
  getDateInTimeZone,
  getDateTimeInTimeZone,
  getWeekdayInTimeZone,
  zonedDateTimeToUtc
} from "@/lib/timezone";

function getUtcCalendarMarker(year: number, month: number, day: number) {
  const marker = new Date(0);
  marker.setUTCFullYear(year, month - 1, day);
  marker.setUTCHours(12, 0, 0, 0);
  return marker;
}

function shiftByCalendarDays(date: Date, days: number, timeZone: string) {
  const parts = getDateTimeInTimeZone(date, timeZone);
  const marker = getUtcCalendarMarker(parts.year, parts.month, parts.day);
  marker.setUTCDate(marker.getUTCDate() + days);
  return zonedDateTimeToUtc(
    marker.getUTCFullYear(),
    marker.getUTCMonth() + 1,
    marker.getUTCDate(),
    parts.hour,
    parts.minute,
    parts.second,
    date.getUTCMilliseconds(),
    timeZone
  );
}

function getCalendarDayOrdinal(date: Date, timeZone: string) {
  const parts = getDateInTimeZone(date, timeZone);
  return Math.floor(getUtcCalendarMarker(parts.year, parts.month, parts.day).getTime() / 86400000);
}

function getPreviousMonthRange(start: Date, end: Date, timeZone: string) {
  const startParts = getDateTimeInTimeZone(start, timeZone);
  const endParts = getDateTimeInTimeZone(end, timeZone);
  const previousMonthMarker = getUtcCalendarMarker(startParts.year, startParts.month - 1, 1);
  const previousYear = previousMonthMarker.getUTCFullYear();
  const previousMonth = previousMonthMarker.getUTCMonth() + 1;
  const daysInPreviousMonth = getUtcCalendarMarker(previousYear, previousMonth + 1, 0).getUTCDate();
  const previousEndDay = Math.min(endParts.day, daysInPreviousMonth);

  return {
    start: zonedDateTimeToUtc(previousYear, previousMonth, 1, 0, 0, 0, 0, timeZone),
    end: zonedDateTimeToUtc(
      previousYear,
      previousMonth,
      previousEndDay,
      endParts.hour,
      endParts.minute,
      endParts.second,
      end.getUTCMilliseconds(),
      timeZone
    )
  };
}

export function getRange(filter: TimeFilter, timeZone = "UTC", now = new Date()) {
  const end = now;
  const localToday = getDateInTimeZone(now, timeZone);
  const marker = getUtcCalendarMarker(localToday.year, localToday.month, localToday.day);

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

export function getPreviousRange(filter: TimeFilter, timeZone = "UTC", now = new Date()) {
  const { start, end } = getRange(filter, timeZone, now);
  if (filter === "month") return getPreviousMonthRange(start, end, timeZone);

  const days = filter === "today" ? 1 : filter === "last30" ? 30 : 7;
  return {
    start: shiftByCalendarDays(start, -days, timeZone),
    end: shiftByCalendarDays(end, -days, timeZone)
  };
}

export function getPreviousRangeFromBounds(start: Date, end: Date, timeZone = "UTC") {
  const calendarDays = Math.max(
    1,
    getCalendarDayOrdinal(end, timeZone) - getCalendarDayOrdinal(start, timeZone) + 1
  );
  return {
    start: shiftByCalendarDays(start, -calendarDays, timeZone),
    end: shiftByCalendarDays(end, -calendarDays, timeZone)
  };
}
