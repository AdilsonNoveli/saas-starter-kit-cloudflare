import { format } from "date-fns";

export const formatDate = (date: Date) => format(date, "MMMM do, yyyy");

export const formatDateTime = (date: Date | string) =>
  format(new Date(date), "M/d/yyyy, h:mm:ss a");
