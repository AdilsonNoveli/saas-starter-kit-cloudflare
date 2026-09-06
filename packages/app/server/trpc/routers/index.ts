import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { router } from "../trpc";
import account from "./account";
import admin from "./admin";
import billing from "./billing";
import invites from "./invites";
import pub from "./public";
import teams from "./teams";
import notifications from "./notifications";
import stripe from "./stripe";

export const appRouter = router({
  teams,
  account,
  stripe,
  billing,
  invites,
  notifications,
  public: pub,
  admin,
});

export type AppRouter = typeof appRouter;
export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;
