const pad = (n: number) => String(n).padStart(2, "0");

// "YYYY-MM-DD" in the user's LOCAL timezone (toISOString() would give the UTC date).
export function localDateString(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// "HH:MM" 24h, local time.
export function localTimeString(d: Date = new Date()): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Parses "YYYY-MM-DD" as a LOCAL date so it never shifts a day.
export function formatDisplayDate(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" },
): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-IN", options);
}
