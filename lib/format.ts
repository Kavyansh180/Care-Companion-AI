// "08:00" -> "8:00 AM". Accepts "HH:MM" or "HH:MM:SS"; returns "" for empty and unparseable input unchanged.
export function formatTime12h(time24: string): string {
  if (!time24) return "";
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(time24.trim());
  if (!match) return time24;
  const hour = Number(match[1]);
  if (hour > 23) return time24;
  return `${hour % 12 === 0 ? 12 : hour % 12}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
}
