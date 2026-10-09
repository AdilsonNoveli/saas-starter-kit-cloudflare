import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import { previewBrand } from "../brand";
import { template } from "./Invitation";

// AC-039: the invitation goes out in the inviter's language (`locale` from
// their preferences) and calls the tenant a Space; with no preference it is
// English. Rendered the same way the Emails Worker does (apps/functions/src/emails.ts).
const baseProps = {
  teamName: "Clinica Aurora",
  invitedBy: "Maria Souza",
  username: "Ana",
  inviteLink: "https://app.example.com/invite/abc123",
};

async function build(locale?: string) {
  const props = locale === undefined ? baseProps : { ...baseProps, locale };
  const { subject, body } = template(props as never, previewBrand);
  const html = await render(body, { plainText: true });
  return { subject, html };
}

describe("Invitation e-mail (AC-039)", () => {
  // SPECSFY: US-006 FR-016 NFR-005 AC-039
  it("speaks the inviter's language and names the Space in it", async () => {
    const english = await build();
    expect(english.subject).toMatch(/invited/i);
    expect(english.html).toMatch(/\bSpace\b/);
    expect(english.html).not.toMatch(/\bteams?\b/i);
    expect(english.subject).not.toMatch(/\bteams?\b/i);

    const portuguese = await build("pt-br");
    expect(portuguese.subject).not.toBe(english.subject);
    expect(portuguese.subject).toMatch(/convid/i);
    expect(portuguese.html).toMatch(/Espaço/);
    expect(portuguese.html).not.toMatch(/\b(team|times?|equipes?)\b/i);

    const spanish = await build("es");
    expect(spanish.subject).toMatch(/invitad|invitaci/i);
    expect(spanish.html).toMatch(/Espacio/);
    expect(spanish.html).not.toMatch(/\b(team|equipos?)\b/i);
  });
});
