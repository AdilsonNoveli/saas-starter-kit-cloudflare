import { describe, expect, it } from "vitest";
import { formatDate } from "./date";

describe("formatDate", () => {
  // SPECSFY: blog-byline-date-matches-frontmatter
  it("shows the calendar day of a date-only value whatever the timezone", () => {
    expect(formatDate("2026-09-25")).toBe("September 25th, 2026");
    expect(formatDate("2026-01-01")).toBe("January 1st, 2026");
  });

  // SPECSFY: blog-byline-date-legacy-format
  it("reads the legacy DD-MM-YYYY format and returns unparsable input as it is", () => {
    expect(formatDate("15-01-2026")).toBe("January 15th, 2026");
    expect(formatDate("not a date")).toBe("not a date");
    expect(formatDate("")).toBe("");
  });
});
