/**
 * Tiny stand-in for `@adonisjs/core/helpers/string`'s `string.pluralize`,
 * used only by the fake mailer's assertion messages ("Expected to send 1
 * mail" vs "2 mails"). Every word passed to it here is a plain, regular
 * English noun ("mail", "message", "time"), so a full inflector is not
 * worth depending on for three call sites.
 */
export function pluralize(word: string, count: number): string {
  return count === 1 ? word : `${word}s`;
}
