import { users } from "@nuxfire/functions/schema";
import { getClient } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  try {
    const callback = getRequestURL(event).origin + "/api/auth/callback";
    const code = getQuery(event).code?.toString() || "";
    const client = getClient(event);
    const tokens = await client.exchange(code, callback);
    if (tokens.err) {
      console.error("auth callback: token exchange failed", {
        name: tokens.err.name,
        message: (tokens.err as { message?: string }).message,
      });
    }
    if (!tokens.err) {
      const { access, refresh } = tokens.tokens;
      setTokens(event, access, refresh);
      const session = await getUserSession(event, access, refresh);
      if (session) {
        // Keyed on the identity provider's subject id, never on the email.
        // The email is an attribute of the identity and can change; the
        // subject id cannot. Matching on the email meant a change of
        // address produced a second profile row while TeamMembership,
        // TeamInvite and Notification still pointed at the original id —
        // the person silently lost their teams and permissions. The email
        // is refreshed here instead, so the profile follows the identity.
        try {
          await useDB()
            .insert(users)
            .values({
              id: session.id,
              email: session.email,
              name: session.name || null,
              image: session.image || null,
            })
            .onConflictDoUpdate({
              target: users.id,
              set: {
                email: session.email,
                name: sql`coalesce(${users.name}, ${session.name})`,
                image: sql`coalesce(${users.image}, ${session.image})`,
              },
            });
        } catch (error) {
          // User.email is unique, so a *new* subject id arriving with an
          // address that already belongs to another profile lands here.
          // With identity and profile stored in separate systems that can
          // only happen when the identity record was rebuilt without the
          // profile being removed with it — which the account deletion
          // flow (server/trpc/routers/account.ts) exists to prevent.
          // Failing loudly beats guessing: silently reusing the other row
          // would hand this login someone else's data, and silently
          // rewriting its id would orphan every TeamMembership,
          // TeamInvite and Notification pointing at it, none of which the
          // schema protects with a foreign key.
          const err = error as { code?: string; cause?: { code?: string } };
          if (err?.code === "23505" || err?.cause?.code === "23505") {
            console.error(
              "auth callback: email already belongs to a different profile — identity and profile are out of sync",
              { subjectId: session.id, email: session.email },
            );
          }
          throw error;
        }
      } else {
        console.error(
          "auth callback: token exchange succeeded but getUserSession returned no session",
        );
      }
      const redirect = getCookie(event, "nuxfire-redirect");
      if (redirect) {
        deleteCookie(event, "nuxfire-redirect");
      }
      return sendRedirect(event, redirect || "/");
    }
  } catch (error) {
    // Was a bare `catch {}` — silently discarded every failure here with
    // zero trace, the exact "invisible error" pattern already found and
    // fixed in apps/functions/src/emails.ts and sender.ts this
    // session. Error instances serialize to `{}` in Workers structured
    // logs (message/stack aren't enumerable), so pull them out explicitly.
    const err = error as { message?: string; name?: string; stack?: string };
    console.error("auth callback failed", {
      message: err?.message,
      name: err?.name,
      stack: err?.stack,
    });
  }
  throw createError({ status: 401, message: "Couldn't login." });
});
