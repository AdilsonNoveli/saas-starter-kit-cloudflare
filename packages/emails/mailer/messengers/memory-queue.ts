/*
 * @adonisjs/mail
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import fastq, { type done } from "fastq";

import debug from "../debug";
import type { MailResponse } from "../mail-response";
import type {
  EmitterLike,
  MailEvents,
  MailerContract,
  MailerMessenger,
  NodeMailerMessage,
  MessageBodyTemplates,
  MailTransportContract,
} from "../types";

/**
 * Worker to send emails
 */
function sendEmail(
  this: MemoryQueueMessenger,
  task: {
    mail: { message: NodeMailerMessage; views: MessageBodyTemplates };
    sendConfig?: unknown;
  },
  cb: done,
) {
  this.mailer
    .sendCompiled(task.mail, task.sendConfig)
    .then((result) => cb(null, result))
    .catch((error) => cb(error));
}

/**
 * Memory queue messenger uses "fastq" npm package to keep
 * emails within memory and send them in the chunks of 10
 */
export class MemoryQueueMessenger implements MailerMessenger {
  #emitter: EmitterLike<MailEvents>;
  #queue = fastq(this, sendEmail, 10);
  #jobCompletedCallback?: (error: Error | null, result: MailResponse<unknown>) => void = (
    error,
  ) => {
    if (error) {
      this.#emitter.emit("queued:mail:error", {
        error,
        mailerName: this.mailer.name,
      });
    }
  };

  constructor(
    public mailer: MailerContract<MailTransportContract>,
    emitter: EmitterLike<MailEvents>,
  ) {
    this.#emitter = emitter;
  }

  /**
   * Queues the email within memory
   */
  async queue(
    mail: { message: NodeMailerMessage; views: MessageBodyTemplates },
    sendConfig?: unknown,
  ) {
    debug("pushing email to in-memory queue");
    this.#queue.push(
      {
        mail,
        sendConfig,
      },
      this.#jobCompletedCallback,
    );
  }
}
