/**
 * Minimal, dependency-free stand-ins for @adonisjs/core's `Exception` and
 * `RuntimeException` base classes. The upstream @adonisjs/mail source (see
 * LICENSE.md) throws these two from inside the mailer/message/error classes;
 * this fork has no AdonisJS application container to resolve them from, so
 * both are reimplemented locally with just the shape callers actually rely
 * on (a `message`, an optional `cause`, and — for `Exception` subclasses
 * like `E_INVALID_CONFIG` in errors.ts — static `code`/`status` fields).
 */

export class Exception extends Error {
  static status?: number;
  static code?: string;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class RuntimeException extends Exception {}
