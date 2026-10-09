import { userPreferences, users } from "@nuxfire/functions/schema";
import {
  buildSessionRecord,
  upsertSession,
} from "@nuxfire/layer-account/server/utils/session-registry";
import { eq } from "drizzle-orm";
import { getClient } from "~~/server/utils/auth";
import { preferenceCookies } from "~~/server/utils/preference-cookies";

// One year, the lifetime the i18n and color mode modules give their own cookies.
const PREFERENCE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

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
          // flow (layers/account/server/trpc/account.ts) exists to prevent.
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
        // SPEC-0010 (DEC-008): the browser reaches this handler itself, so
        // this is where its User-Agent and Cloudflare place are real. The row
        // is metadata only (the issuer decides which sessions are alive), so
        // a failure to record it is logged and never blocks the login.
        try {
          await upsertSession(
            buildSessionRecord({
              sid: session.sid,
              userId: session.id,
              userAgent: getRequestHeader(event, "user-agent"),
              cf: (event.context as { cf?: unknown }).cf,
              now: new Date(),
            }),
          );
        } catch (error) {
          const err = error as { message?: string; name?: string; stack?: string };
          console.error("auth callback: session registration failed", {
            message: err?.message,
            name: err?.name,
            stack: err?.stack,
          });
        }
        // SPEC-0010 (DEC-006): copy the server preference into the cookies
        // the i18n and color mode modules read, before the redirect, so a new
        // browser's first paint already has the person's locale and theme.
        // No row (not onboarded yet) leaves the browser's own cookies alone.
        try {
          const [row] = await useDB()
            .select({
              locale: userPreferences.locale,
              theme: userPreferences.theme,
            })
            .from(userPreferences)
            .where(eq(userPreferences.userId, session.id));
          if (row) {
            for (const [name, value] of Object.entries(preferenceCookies(row))) {
              setCookie(event, name, value, {
                path: "/",
                sameSite: "lax",
                secure: true,
                maxAge: PREFERENCE_COOKIE_MAX_AGE_SECONDS,
                // Both modules read them in the browser too.
                httpOnly: false,
              });
            }
          }
        } catch (error) {
          const err = error as { message?: string; name?: string; stack?: string };
          console.error("auth callback: preference cookies failed", {
            message: err?.message,
            name: err?.name,
            stack: err?.stack,
          });
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
