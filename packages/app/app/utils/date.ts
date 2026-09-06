import { format } from "date-fns";

export const formatDate = (date: Date) => format(date, "MMMM do, yyyy");

export const formatDateTime = (date: Date | string) =>
  format(new Date(date), "M/d/yyyy, h:mm:ss a");

export const formatTime = (date: Date | string) =>
  format(new Date(date), "HH:mm:ss");
