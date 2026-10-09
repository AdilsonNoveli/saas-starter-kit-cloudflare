import { unknown, array, object, string, intersect } from "valibot";
import type { InferOutput } from "valibot";
import { createSubjects } from "@openauthjs/openauth/subject";

const baseUser = object({
  id: string(),
  email: string(),
  name: string(),
  image: string(),
});

const fullUser = intersect([
  baseUser,
  object({
    createdAt: string(),
    updatedAt: string(),
    accounts: array(
      object({
        linkedAt: string(),
        type: string(),
        data: unknown(),
      }),
    ),
  }),
]);

// `sid` names one login and survives every renewal of it, so "sign out of the
// other sessions" can spare the caller's records. `provider` says which login
// opened the session (password, code, google or github), which decides whether
// the e-mail can be changed. Both are required: a token issued before they
// existed fails verification and the person logs in again, once.
export const subjects = createSubjects({
  user: intersect([baseUser, object({ sid: string(), provider: string() })]),
});

export type SubjectUser = InferOutput<typeof subjects.user>;

export type FullUser = InferOutput<typeof fullUser>;
