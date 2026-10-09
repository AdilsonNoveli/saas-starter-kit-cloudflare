import { MailManager } from "./mail-manager";
import type { EmitterLike, MailerConfig, MailEvents, MailManagerTransportFactory } from "./types";

/**
 * No-op event emitter. `Mailer`/`MailManager` (ported from @adonisjs/mail,
 * see LICENSE.md) expect an application-wide emitter to notify about
 * `mail:sending`/`mail:sent`/etc — this fork runs with no AdonisJS
 * container to supply a real one, and nothing in this codebase listens for
 * those events, so every method is a no-op.
 */
export class Emitter implements EmitterLike<MailEvents> {
  emit() {}
  emitSerial() {}
  listenerCount() {
    return 0;
  }
  hasListeners() {
    return false;
  }
}

/**
 * Builds a ready-to-use `MailManager` from a plain config object — the
 * `mailers` factories are already resolved functions (e.g.
 * `resend: () => new ResendTransport({...})`), never AdonisJS's
 * `ConfigProvider`-wrapped form, since nothing in this codebase runs
 * inside an AdonisJS application container.
 */
export function generateMailer<KnownMailers extends Record<string, MailManagerTransportFactory>>(
  config: MailerConfig & {
    default?: keyof KnownMailers;
    mailers: KnownMailers;
  },
): MailManager<KnownMailers> {
  return new MailManager(new Emitter(), config);
}
