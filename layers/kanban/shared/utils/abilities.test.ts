import { allows } from "nuxt-authorization/utils";
import { describe, expect, it } from "vitest";
import {
  kanbanCreateBoard,
  kanbanCreateCard,
  kanbanDeleteBoard,
  kanbanDeleteCard,
  kanbanListBoards,
  kanbanMoveCard,
  kanbanUpdateBoard,
  kanbanUpdateCard,
} from "./abilities";
import { KANBAN_PERMISSIONS } from "./permissions";
import manifest from "../../layer.manifest";

// Mirrors packages/app/shared/utils/abilities.test.ts. Every one of these is a
// tenant-scoped `hasTeamPermission` check, so the table below pairs each
// ability with the exact permission string it must gate on — the cross-tenant
// case being the one that actually matters.

const TEAM = "team_a";
const OTHER_TEAM = "team_b";
const USER_ID = "user_1";

/** A user who belongs to `TEAM` holding exactly `permissions` there. */
function member(permissions: string[], teamId = TEAM) {
  return {
    id: USER_ID,
    teams: [teamId],
    permissions: { [teamId]: permissions },
  };
}

/** A signed-in user with no team membership at all. */
const outsider = { id: USER_ID, teams: [], permissions: {} };

const permissionGated = [
  ["kanbanListBoards", kanbanListBoards, KANBAN_PERMISSIONS.BOARDS.VIEW],
  ["kanbanCreateBoard", kanbanCreateBoard, KANBAN_PERMISSIONS.BOARDS.CREATE],
  ["kanbanUpdateBoard", kanbanUpdateBoard, KANBAN_PERMISSIONS.BOARDS.UPDATE],
  ["kanbanDeleteBoard", kanbanDeleteBoard, KANBAN_PERMISSIONS.BOARDS.DELETE],
  ["kanbanCreateCard", kanbanCreateCard, KANBAN_PERMISSIONS.CARDS.CREATE],
  ["kanbanUpdateCard", kanbanUpdateCard, KANBAN_PERMISSIONS.CARDS.UPDATE],
  ["kanbanMoveCard", kanbanMoveCard, KANBAN_PERMISSIONS.CARDS.MOVE],
  ["kanbanDeleteCard", kanbanDeleteCard, KANBAN_PERMISSIONS.CARDS.DELETE],
] as const;

describe.each(permissionGated)(
  "%s (permission-gated)",
  (_name, ability, permission) => {
    it("denies a guest", async () => {
      expect(await allows(ability, null, TEAM)).toBe(false);
    });

    it("denies a user with no membership", async () => {
      expect(await allows(ability, outsider, TEAM)).toBe(false);
    });

    it("denies a member of a different team holding the permission there", async () => {
      // The permission exists, but scoped to OTHER_TEAM — leaking a board
      // across tenants is the failure this check exists to prevent.
      expect(
        await allows(ability, member([permission], OTHER_TEAM), TEAM),
      ).toBe(false);
    });

    it("denies a member of the team without the permission", async () => {
      expect(await allows(ability, member([]), TEAM)).toBe(false);
    });

    it("denies when the user holds a different kanban permission", async () => {
      expect(
        await allows(ability, member(["kanban:something:else"]), TEAM),
      ).toBe(false);
    });

    it("allows a member holding the exact permission on that team", async () => {
      expect(await allows(ability, member([permission]), TEAM)).toBe(true);
    });
  },
);

describe("permission catalogue", () => {
  // The manifest is what the plan treats as the layer's public declaration of
  // its RBAC surface; KANBAN_PERMISSIONS is what the code actually checks. A
  // string present in one and not the other is a permission that either can
  // never be granted or is granted but never enforced.
  const declared = [...manifest.permissions].sort();
  const used = Object.values(KANBAN_PERMISSIONS)
    .flatMap((group) => Object.values(group))
    .sort();

  it("matches the manifest exactly", () => {
    expect(used).toEqual(declared);
  });

  it("namespaces every permission under the layer name", () => {
    for (const permission of used) {
      expect(permission.startsWith("kanban:")).toBe(true);
    }
  });
});

describe("ability naming convention", () => {
  // Unprefixed ability names collide silently across layers in Nuxt's flat
  // auto-import namespace (plan §5) — this is the guard for that rule.
  it("prefixes every exported ability with the layer name", async () => {
    const module = await import("./abilities");
    const exported = Object.keys(module);

    expect(exported.length).toBeGreaterThan(0);
    for (const name of exported) {
      expect(name.startsWith("kanban")).toBe(true);
    }
  });
});
