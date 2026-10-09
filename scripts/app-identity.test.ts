import { describe, expect, it } from "vitest";
import { sharesStarterKitAppName } from "./app-identity";

describe("sharesStarterKitAppName", () => {
  it("does not warn once the app has its own name", () => {
    expect(
      sharesStarterKitAppName({ appName: "acme", domain: "acme.com", zoneVerified: true }),
    ).toBe(false);
  });

  it("does not warn when the name cannot be read", () => {
    expect(
      sharesStarterKitAppName({ appName: undefined, domain: "acme.com", zoneVerified: true }),
    ).toBe(false);
  });

  it("recognises the reference deploy: nuxfire.com whose zone is in the account", () => {
    expect(
      sharesStarterKitAppName({ appName: "nuxfire", domain: "nuxfire.com", zoneVerified: true }),
    ).toBe(false);
    expect(
      sharesStarterKitAppName({ appName: "nuxfire", domain: "Nuxfire.com", zoneVerified: true }),
    ).toBe(false);
  });

  it("warns a buyer who kept the name and deploys to their own zone", () => {
    expect(
      sharesStarterKitAppName({ appName: "nuxfire", domain: "acme.com", zoneVerified: true }),
    ).toBe(true);
  });

  it("warns when nuxfire.com is claimed but the zone is not proven in the account", () => {
    expect(
      sharesStarterKitAppName({ appName: "nuxfire", domain: "nuxfire.com", zoneVerified: false }),
    ).toBe(true);
  });

  it("warns when the branding did not load", () => {
    expect(
      sharesStarterKitAppName({ appName: "nuxfire", domain: undefined, zoneVerified: false }),
    ).toBe(true);
  });
});
