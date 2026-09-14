import type {
  CfProperties,
  Request,
  ExecutionContext,
  Queue,
} from "@cloudflare/workers-types";
import type { EmailsWorker } from "@nuxfire/functions/sender";

declare module "h3" {
  interface H3EventContext {
    cf: CfProperties;
    cloudflare: {
      request: Request;
      env: {
        Emails: EmailsWorker;
        Websockets: {
          publish(topic: string, data: unknown): Promise<void>;
        };
        JobQueue: Queue;
      };
      context: ExecutionContext;
    };
  }
}
