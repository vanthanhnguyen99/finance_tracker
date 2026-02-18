export type TimeFilter = "today" | "week" | "month" | "last7" | "last30";

export function getRange(filter: TimeFilter) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  if (filter === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (filter === "week") {
    const day = start.getDay();
    const diff = (day + 6) % 7;
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
  } else if (filter === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (filter === "last7") {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

export function getPreviousRange(filter: TimeFilter) {
  const { start, end } = getRange(filter);
  return getPreviousRangeFromBounds(start, end);
}

export function getPreviousRangeFromBounds(start: Date, end: Date) {
  const durationMs = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - durationMs);
  return { start: previousStart, end: previousEnd };
}
