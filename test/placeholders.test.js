import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { findPlaceholders } from "../scripts/lib/placeholders.js";
import { describePlaceholders } from "../scripts/export.js";
import { repoRoot } from "../scripts/lib/files.js";

const texts = (md) => findPlaceholders(md).map((p) => p.text);

describe("findPlaceholders", () => {
  it("finds unfilled <PLACEHOLDER> tokens with line numbers", () => {
    expect(findPlaceholders("Hello,\n\nI am applying to <COMPANY> as <ROLE>.")).toEqual([
      { line: 3, text: "<COMPANY>", why: "unfilled placeholder" },
      { line: 3, text: "<ROLE>", why: "unfilled placeholder" },
    ]);
  });

  it("finds example bullets and template instructions", () => {
    expect(texts("- [EXAMPLE — replace or remove] Describe a feature.")).toEqual([
      "[EXAMPLE — replace or remove]",
      "replace or remove",
    ]);
    expect(texts("Replace this text with a summary.")).toEqual(["Replace this"]);
    expect(texts("Replace with your primary skill")).toEqual(["Replace with your"]);
  });

  it("finds template profile data once per line", () => {
    expect(texts("# Your Name\n\n[you@example.com](mailto:you@example.com) | Your Location")).toEqual([
      "Your Name",
      "you@example.com",
      "Your Location",
    ]);
  });

  it("finds the stubs written by new-app", () => {
    expect(texts("# Generated CV\n\nRun:")).toEqual(["# Generated CV"]);
    expect(texts("# Cover Letter\n\nDraft or generated cover letter goes here.")).toEqual([
      "Draft or generated cover letter goes here.",
    ]);
  });

  it("ignores HTML, lowercase angle brackets, and ordinary uses of 'replace'", () => {
    expect(
      findPlaceholders('<div class="job">\nReplaced a legacy queue; <br> worked on Your-Team tooling.'),
    ).toEqual([]);
  });

  it("finds nothing in a finished CV", () => {
    const cv = fs.readFileSync(path.join(import.meta.dirname, "fixtures/finished-cv.md"), "utf8");
    expect(findPlaceholders(cv)).toEqual([]);
  });

  it("flags the untouched template example application", () => {
    const cv = fs.readFileSync(path.join(repoRoot, "applications/test-app/cv.md"), "utf8");
    expect(findPlaceholders(cv).length).toBeGreaterThan(0);
  });
});

describe("describePlaceholders", () => {
  it("lists up to 10 matches and counts the rest", () => {
    const found = Array.from({ length: 12 }, (_, i) => ({ line: i + 1, text: "<X>", why: "unfilled placeholder" }));
    const lines = describePlaceholders("cv.md", found);
    expect(lines).toHaveLength(11);
    expect(lines[0]).toBe("  cv.md:1  <X>  (unfilled placeholder)");
    expect(lines[10]).toBe("  ...and 2 more");
  });
});
