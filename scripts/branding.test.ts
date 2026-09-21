import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BrandingError, envFileName, loadBranding, parseEnvFile } from "./branding";

const VALID = [
  "BRAND_NAME=Acme",
  "BRAND_DOMAIN=acme.io",
  "BRAND_EMAIL=contact@acme.io",
].join("\n");

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "branding-"));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const write = (file: string, body: string) => writeFileSync(join(root, file), body);
const load = (stage: string, env: Record<string, string> = {}) =>
  loadBranding({ stage, root, env });
const issuesOf = (fn: () => unknown): string[] => {
  try {
    fn();
  } catch (e) {
    if (e instanceof BrandingError) return e.issues;
    throw e;
  }
  throw new Error("expected BrandingError");
};

describe("envFileName", () => {
  it("uses the production file only for the production stage", () => {
    expect(envFileName("production")).toBe(".env.production");
    expect(envFileName("dev")).toBe(".env.stage");
    expect(envFileName("alex")).toBe(".env.stage");
  });
});

describe("parseEnvFile", () => {
  it("handles comments, export, quotes, inline comments and CRLF", () => {
    const parsed = parseEnvFile(
      [
        "# a comment",
        "",
        "PLAIN=value",
        "export EXPORTED=yes",
        'QUOTED="two words # not a comment"',
        "SINGLE='single'",
        "INLINE=value # trailing comment",
        "EMPTY=",
        "NOT_A_PAIR",
      ].join("\r\n"),
    );
    expect(Object.fromEntries(parsed)).toEqual({
      PLAIN: "value",
      EXPORTED: "yes",
      QUOTED: "two words # not a comment",
      SINGLE: "single",
      INLINE: "value",
      EMPTY: "",
    });
  });
});

describe("loadBranding", () => {
  it("reads the stage file for development stages", () => {
    write(".env.stage", VALID);
    expect(load("alex")).toEqual({ name: "Acme", domain: "acme.io", email: "contact@acme.io" });
  });

  it("reads the production file only for the production stage", () => {
    write(".env.stage", VALID);
    write(".env.production", VALID.replace("acme.io", "acme.com").replace("acme.io", "acme.com"));
    expect(load("production").domain).toBe("acme.com");
    expect(load("alex").domain).toBe("acme.io");
  });

  it("does not fall back to the other stage's file", () => {
    write(".env.stage", VALID);
    expect(issuesOf(() => load("production"))).toHaveLength(3);
  });

  it("lets real environment variables override the file, variable by variable", () => {
    write(".env.stage", VALID);
    expect(load("dev", { BRAND_NAME: "Other" })).toEqual({
      name: "Other",
      domain: "acme.io",
      email: "contact@acme.io",
    });
  });

  it("works from environment variables alone (no file)", () => {
    expect(
      load("dev", { BRAND_NAME: "Acme", BRAND_DOMAIN: "acme.io", BRAND_EMAIL: "a@acme.io" }),
    ).toEqual({ name: "Acme", domain: "acme.io", email: "a@acme.io" });
  });

  it("reports every missing variable at once, naming the file", () => {
    let error: unknown;
    try {
      load("dev");
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(BrandingError);
    const { message, issues } = error as BrandingError;
    expect(issues).toHaveLength(3);
    expect(message).toContain(".env.stage");
    for (const key of ["BRAND_NAME", "BRAND_DOMAIN", "BRAND_EMAIL"]) expect(message).toContain(key);
  });

  it("normalizes the case of the domain and of the address's domain", () => {
    write(".env.stage", "BRAND_NAME=Acme\nBRAND_DOMAIN=ACME.io\nBRAND_EMAIL=Contact@ACME.io");
    expect(load("dev")).toEqual({ name: "Acme", domain: "acme.io", email: "Contact@acme.io" });
  });

  it.each([
    "https://acme.io",
    "acme.io/",
    "acme.io:8080",
    "localhost",
    "acme",
    "192.168.0.1",
    "-acme.io",
    "acme..io",
    "acme io",
  ])("rejects the domain %s", (domain) => {
    write(".env.stage", VALID.replace("BRAND_DOMAIN=acme.io", `BRAND_DOMAIN=${domain}`));
    expect(issuesOf(() => load("dev")).join()).toContain("BRAND_DOMAIN");
  });

  it.each([
    "contact",
    "@acme.io",
    "contact@",
    "contact@acme",
    "Acme <contact@acme.io>",
    "con tato@acme.io",
    "contact@@acme.io",
    ".contact@acme.io",
    "contact..x@acme.io",
  ])("rejects the address %s", (email) => {
    write(".env.stage", VALID.replace("BRAND_EMAIL=contact@acme.io", `BRAND_EMAIL=${email}`));
    expect(issuesOf(() => load("dev")).join()).toContain("BRAND_EMAIL");
  });

  it("accepts addresses on subdomains and with tags", () => {
    write(".env.stage", VALID.replace("contact@acme.io", "no-reply+app@mail.acme.io"));
    expect(load("dev").email).toBe("no-reply+app@mail.acme.io");
  });

  it("rejects a name with control characters (header injection) or that is too long", () => {
    expect(
      issuesOf(() =>
        load("dev", { BRAND_NAME: "Acme\r\nBcc: x@y.z", BRAND_DOMAIN: "acme.io", BRAND_EMAIL: "a@acme.io" }),
      ).join(),
    ).toContain("BRAND_NAME");
    expect(
      issuesOf(() =>
        load("dev", { BRAND_NAME: "x".repeat(81), BRAND_DOMAIN: "acme.io", BRAND_EMAIL: "a@acme.io" }),
      ).join(),
    ).toContain("BRAND_NAME");
  });
});
