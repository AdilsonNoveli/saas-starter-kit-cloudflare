import { describe, expect, it } from "vitest";
import { getErrorMessage } from "./error-message";

describe("getErrorMessage", () => {
  it("returns the message of an Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns the message of an error-shaped object", () => {
    expect(getErrorMessage({ message: "from the server" })).toBe("from the server");
  });

  it("falls back when there is no usable message", () => {
    for (const value of [undefined, null, "text", 42, {}, { message: "" }, { message: 1 }, new Error("")]) {
      expect(getErrorMessage(value)).toBe("Something went wrong");
    }
  });

  it("uses the caller's fallback", () => {
    expect(getErrorMessage(undefined, "Could not save")).toBe("Could not save");
  });
});
