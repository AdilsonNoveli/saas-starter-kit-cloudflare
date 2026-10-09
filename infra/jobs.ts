import { flags } from "#nuxfire/config";
import { database } from "./database";
import { COMPATIBILITY } from "./utils/constants";

// messages that exhaust retries land here instead of vanishing —
// jobs-consumer.ts marks the job "failed" in the DB before that happens, so
// this is for operator visibility/replay, not job-status tracking.
export const jobsDeadLetterQueue = flags.jobsQueue
  ? new sst.cloudflare.Queue("JobDLQ")
  : undefined;

export const jobsQueue = flags.jobsQueue
  ? new sst.cloudflare.Queue("JobQueue", {
      maxConcurrency: 5,
      dlq: {
        queue: jobsDeadLetterQueue!.nodes.queue.queueName,
        retry: 3,
        // Duration strings, not bare numbers — a plain number here throws
        // ("duration.split is not a function") since SST's duration parser
        // always expects "<n> <unit>". This value itself is unused below: SST
        // 4.14.0 has a bug in queue-worker-subscriber.ts that converts it
        // with toMilliseconds() instead of toSeconds() before sending it to
        // Cloudflare, which validates retry_delay in *seconds* (max 86400) —
        // so any duration string over ~86 seconds gets rejected by the API.
        // The real value is set via transform.consumer below instead.
        retryDelay: "60 seconds",
      },
    })
  : undefined;

if (flags.jobsQueue) {
  jobsQueue!.subscribe(
    {
      // relative — see infra/emails.ts for why
      handler: "apps/functions/src/jobs-consumer.ts",
      compatibility: COMPATIBILITY,
      link: [database],
    },
    {
      batch: {
        size: 10,
        window: "5 seconds",
      },
      transform: {
        consumer: (args) => {
          // Work around the SST 4.14.0 ms/seconds bug above: overwrite the
          // already-computed (and wrongly ×1000'd) retryDelay with the real
          // number of seconds we want, bypassing dlq.retryDelay entirely.
          args.settings = { ...args.settings, retryDelay: 120 };
        },
      },
    },
  );

  // The DLQ gets no dlq/retry of its own on purpose: this consumer only writes
  // a DeadLetterRecord row and acks, so there is nothing left to retry and
  // nowhere further for a message to fall.
  jobsDeadLetterQueue!.subscribe({
    handler: "apps/functions/src/dlq-consumer.ts",
    compatibility: COMPATIBILITY,
    link: [database],
  });
}

export const outputs = flags.jobsQueue
  ? {
      JobsQueue: jobsQueue!.nodes.queue.queueName,
      JobsDeadLetterQueue: jobsDeadLetterQueue!.nodes.queue.queueName,
    }
  : undefined;
