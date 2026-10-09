import { format, isValid, parseISO } from "date-fns";

export const formatDate = (date: Date | string) => {
  if (!date) return "";
  let d = date;
  if (typeof d === "string" && /^\d{2}-\d{2}-\d{4}$/.test(d)) {
    const [day, month, year] = d.split("-");
    d = `${year}-${month}-${day}`;
  }
  // `new Date("2026-09-25")` is midnight UTC, which `format` (local time) shows as the 24th
  // west of Greenwich, and differently on the server and in the browser. `parseISO` reads a
  // date-only string as that calendar day in local time, so the byline matches the front matter.
  const parsed = typeof d === "string" ? parseISO(d) : d;
  return isValid(parsed) ? format(parsed, "MMMM do, yyyy") : String(date);
};
