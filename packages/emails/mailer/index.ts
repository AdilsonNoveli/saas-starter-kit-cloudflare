/**
 * `@nuxfire/emails/mailer` — a fork of @adonisjs/mail@10.4.0 (see
 * LICENSE.md), vendored so the multi-provider mailer engine used by
 * `apps/functions/src/emails.ts` is owned source instead of a dependency
 * on a third-party fork. See the git history of packages/emails for the full
 * history and rationale.
 *
 * Dropped from upstream on purpose (framework/build-tool glue with zero
 * consumers here, not part of the mail-sending abstraction itself):
 * `providers/`, `services/`, `commands/`, `stubs/`, `configure.ts`, the
 * AdonisJS-container test suite, and the Edge.js/MJML template plugin
 * (`plugins/edge.ts`). `define_config.ts`'s `defineConfig`/`transports`
 * config-provider helpers are also dropped — they exist to resolve
 * AdonisJS's `ConfigProvider`-wrapped config shape, which nothing in this
 * codebase produces; `generate.ts` replaces them with a direct
 * `generateMailer(config)` that takes already-resolved mailer factories.
 */

export * as errors from "./errors";
export { Mailer } from "./mailer";
export { Message } from "./message";
export { BaseMail } from "./base-mail";
export { FakeMailer } from "./fake-mailer";
export { MailManager } from "./mail-manager";
export { MailResponse } from "./mail-response";
export { Emitter, generateMailer } from "./generate";

export type * from "./types";
