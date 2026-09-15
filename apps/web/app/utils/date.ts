import { format, isValid } from "date-fns";

export const formatDate = (date: Date | string) => {
  if (!date) return "";
  let d = date;
  if (typeof d === "string" && /^\d{2}-\d{2}-\d{4}$/.test(d)) {
    const [day, month, year] = d.split("-");
    d = `${year}-${month}-${day}`;
  }
  const parsed = new Date(d);
  return isValid(parsed) ? format(parsed, "MMMM do, yyyy") : String(date);
};
