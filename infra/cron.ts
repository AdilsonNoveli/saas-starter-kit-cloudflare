import { database } from "./database";
import { COMPATIBILITY } from "./utils/constants";

export const emails = new sst.cloudflare.Cron("Cron", {
  schedules: ["0 * * * *"], // every hour
  job: {
    handler: "apps/functions/src/cron.ts",
    compatibility: COMPATIBILITY,
    link: [database],
  },
});
