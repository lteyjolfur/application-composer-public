import { describe, expect, it } from "vitest";
import { groupBulletsByJob, resolveJobIndex, toEntries } from "../scripts/lib/experience.js";
import { validateBulletJobs, validateExperience } from "../scripts/validate.js";

const entries = [
  { role: "Lead", company: "Acme" },
  { id: "acme-dev", role: "Dev", company: "Acme" },
  { role: "Dev", company: "Globex" },
];

describe("resolveJobIndex", () => {
  it("defaults to the first entry", () => {
    expect(resolveJobIndex(entries, undefined)).toBe(0);
  });

  it("matches an entry id before company", () => {
    expect(resolveJobIndex(entries, "acme-dev")).toBe(1);
  });

  it("matches a unique company", () => {
    expect(resolveJobIndex(entries, "Globex")).toBe(2);
  });

  it("rejects a company shared by several entries", () => {
    expect(() => resolveJobIndex(entries, "Acme")).toThrow(/matches 2 experience entries; give each an 'id'/);
  });

  it("rejects an unknown job", () => {
    expect(() => resolveJobIndex(entries, "Initech")).toThrow(/does not match/);
  });
});

describe("groupBulletsByJob", () => {
  it("groups bullets per entry and keeps their order", () => {
    const groups = groupBulletsByJob(entries, [
      { id: "a", job: "Globex" },
      { id: "b" },
      { id: "c", job: "Globex" },
    ]);
    expect(groups.map((g) => g.map((b) => b.id))).toEqual([["b"], [], ["a", "c"]]);
  });
});

describe("toEntries", () => {
  it("wraps a single entry object and handles missing data", () => {
    expect(toEntries({ role: "Dev" })).toEqual([{ role: "Dev" }]);
    expect(toEntries(undefined)).toEqual([]);
  });
});

describe("validateBulletJobs", () => {
  it("accepts bullets without job or with a resolvable job", () => {
    expect(validateBulletJobs([{ id: "a" }, { id: "b", job: "Globex" }], entries)).toEqual([]);
  });

  it("reports ambiguous and unknown jobs with the bullet id", () => {
    const errors = validateBulletJobs([{ id: "a", job: "Acme" }, { id: "b", job: "Initech" }], entries);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatch(/^bullet\[0\] \(a\): .*give each an 'id'/);
    expect(errors[1]).toMatch(/^bullet\[1\] \(b\): .*does not match/);
  });
});

describe("validateExperience ids", () => {
  it("rejects duplicate and empty ids", () => {
    const errors = validateExperience([
      { id: "x", role: "A", company: "B" },
      { id: "x", role: "A", company: "B" },
      { id: "", role: "A", company: "B" },
    ]);
    expect(errors).toEqual([
      "experience[1].id 'x' is duplicated.",
      "experience[2].id must be a non-empty string if present.",
    ]);
  });
});
