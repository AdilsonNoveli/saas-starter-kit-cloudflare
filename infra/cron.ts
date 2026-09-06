import { database } from "./database";

export const emails = new sst.cloudflare.Cron("Cron", {
  schedules: ["0 * * * *"], // every hour
  job: {
    handler: "packages/functions/src/cron.ts",
    link: [database],
  },
});
