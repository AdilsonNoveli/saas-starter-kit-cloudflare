import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// SPEC-0010 (Fase 3b), AC-045: keyboard-only flow and errors that do not depend
// on color. There is no Vue component runner in this repository, so the
// contract is read from the source of the onboarding steps and of the account
// preferences form.
const componentsRoot = join(import.meta.dirname, "..");
const STEPPER = join(componentsRoot, "onboarding/OnboardingSteps.vue");
const FORMS = [
  join(componentsRoot, "onboarding/OnboardingProfileStep.vue"),
  join(componentsRoot, "onboarding/OnboardingPreferencesStep.vue"),
  join(componentsRoot, "onboarding/OnboardingSpaceStep.vue"),
  join(componentsRoot, "account/AccountPreferencesForm.vue"),
];
// Static attributes a person reads; bound ones (`:label`) come from t().
const LITERAL_ATTRIBUTE = /\s(label|placeholder|title|description|aria-label|text)="[^"]*\p{L}[^"]*"/u;

function template(source: string) {
  const start = source.indexOf("<template>");
  const end = source.lastIndexOf("</template>");
  return start >= 0 && end > start ? source.slice(start + "<template>".length, end) : "";
}

function literalText(markup: string) {
  return markup
    .replace(/<!--[\s\S]*?-->/gu, " ")
    .replace(/\{\{[\s\S]*?\}\}/gu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function read(path: string) {
  expect(existsSync(path), path).toBe(true);
  return readFileSync(path, "utf8");
}

describe("onboarding and account forms, keyboard and screen readers", () => {
  // SPECSFY: US-001 US-003 FR-009 NFR-006 AC-045
  it("uses UStepper, moves focus to the first field of each step, exposes the step position and shows errors as text tied by aria-describedby", () => {
    const stepper = read(STEPPER);
    expect(stepper).toMatch(/<UStepper\b/u);
    // Focus follows the step change, after the new step renders.
    expect(stepper).toMatch(/watch\([\s\S]*?(nextTick|flush:\s*["']post["'])[\s\S]*?\.focus\(/u);
    // The step indicator tells screen readers where the person is.
    expect(stepper).toMatch(/aria-(current|live|valuenow)\b/u);

    for (const path of [STEPPER, ...FORMS]) {
      const source = read(path);
      const markup = template(source);
      expect(markup, `${path} has a template`).not.toBe("");
      expect(source, `${path} reads its text from t()`).toMatch(/\$?\bt\(\s*["'`]/u);
      expect(literalText(markup), `${path} literal text`).not.toMatch(/\p{L}/u);
      expect(markup, `${path} literal attribute`).not.toMatch(LITERAL_ATTRIBUTE);
    }
    for (const path of FORMS) {
      // An error is text next to its field: either an explicit aria-describedby
      // or UFormField, which wires the field's aria-describedby to its error.
      expect(template(read(path)), `${path} error tied to its field`).toMatch(
        /aria-describedby|<UFormField\b[^>]*\bname=/u,
      );
    }
  });
});
