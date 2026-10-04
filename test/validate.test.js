import { describe, expect, it } from "vitest";
import {
  validateBullets,
  validateExperience,
  validateProfile,
  validateSkills,
  validateTags,
  validateVariant,
} from "../scripts/validate.js";

const allowed = new Set(["frontend", "backend"]);

describe("validateTags", () => {
  it("returns the allowed tag set", () => {
    const { errors, allowedTags } = validateTags({ tags: ["frontend", "backend"] });
    expect(errors).toEqual([]);
    expect(allowedTags).toEqual(allowed);
  });

  it("rejects duplicates, empty tags, and a missing list", () => {
    expect(validateTags({ tags: ["a", "a", ""] }).errors).toHaveLength(2);
    expect(validateTags({}).errors).toHaveLength(1);
  });
});

describe("validateBullets", () => {
  const valid = { id: "a", text: "Did a thing.", tags: ["frontend"], section: "impact" };

  it("accepts valid bullets in either file shape", () => {
    expect(validateBullets([valid], allowed)).toEqual([]);
    expect(validateBullets({ bullets: [valid] }, allowed)).toEqual([]);
  });

  it.each([
    ["missing id", { ...valid, id: "" }, /id must be/],
    ["empty text", { ...valid, text: " " }, /text must be/],
    ["unknown section", { ...valid, section: "projects" }, /section "projects"/],
    ["no tags", { ...valid, tags: [] }, /tags must be a non-empty array/],
    ["unknown tag", { ...valid, tags: ["golang"] }, /unknown tag 'golang'/],
    ["repeated tag", { ...valid, tags: ["frontend", "frontend"] }, /duplicate tag/],
  ])("rejects %s", (_, bullet, message) => {
    const errors = validateBullets([bullet], allowed);
    expect(errors.join("\n")).toMatch(message);
  });

  it("rejects duplicate ids", () => {
    expect(validateBullets([valid, valid], allowed).join("\n")).toMatch(/duplicated/);
  });

  it("rejects a file that is not a bullet list", () => {
    expect(validateBullets({ items: [] }, allowed)).toHaveLength(1);
  });
});

describe("validateVariant", () => {
  it("accepts a valid variant", () => {
    expect(
      validateVariant({ variant: "fe", include_tags: ["frontend"], exclude_tags: [] }, "fe.yaml", allowed),
    ).toEqual([]);
  });

  it("rejects missing name, empty include_tags, and unknown exclude tags", () => {
    const errors = validateVariant(
      { include_tags: [], exclude_tags: ["golang"] },
      "bad.yaml",
      allowed,
    );
    expect(errors.join("\n")).toMatch(/variant must be/);
    expect(errors.join("\n")).toMatch(/include_tags must be/);
    expect(errors.join("\n")).toMatch(/unknown tag 'golang'/);
  });
});

describe("validateProfile", () => {
  it("requires name and summary", () => {
    expect(validateProfile({ name: "A", summary: "B" })).toEqual([]);
    expect(validateProfile({ name: "", summary: "" })).toHaveLength(2);
  });
});

describe("validateExperience", () => {
  it("requires role and company on every entry", () => {
    expect(validateExperience([{ role: "Dev", company: "Acme" }])).toEqual([]);
    expect(validateExperience([{ role: "Dev", company: "Acme" }, { role: "Dev" }])).toEqual([
      "experience[1] must have a non-empty 'company'.",
    ]);
  });

  it("rejects non-array bullets", () => {
    expect(validateExperience([{ role: "Dev", company: "Acme", bullets: "x" }])).toHaveLength(1);
  });
});

describe("validateSkills", () => {
  it("accepts groups or a flat list", () => {
    expect(validateSkills({ groups: { Core: ["Go"] } })).toEqual([]);
    expect(validateSkills({ skills: ["Go"] })).toEqual([]);
  });

  it("rejects empty skills and a missing shape", () => {
    expect(validateSkills({ groups: { Core: [""] } })).toHaveLength(1);
    expect(validateSkills({})).toHaveLength(1);
  });
});
