import type { AnyRouter } from "@trpc/server";
import account from "./account";

/**
 * This layer's contribution to `appRouter`: the `account` key the client
 * already calls (`trpc.account.*`). `satisfies`, never a
 * `: Record<string, AnyRouter>` annotation, so the procedures keep their input
 * and output types on the client.
 */
export const routers = {
  account,
} satisfies Record<string, AnyRouter>;
