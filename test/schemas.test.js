import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { readYaml, repoRoot } from "../scripts/lib/files.js";
import { SECTION_ORDER } from "../scripts/lib/selection.js";
import { CV_SECTIONS } from "../scripts/lib/formatting.js";

const schemaDir = path.join(repoRoot, "schemas");
const loadSchema = (name) =>
  JSON.parse(fs.readFileSync(path.join(schemaDir, `${name}.schema.json`), "utf8"));

// Checks the JSON Schema subset these schemas use (type, required, properties,
// additionalProperties, items, enum, minItems, minLength, uniqueItems, oneOf,
// anyOf, local $ref), so the tests need no schema library. VS Code's YAML
// extension does the full validation while editing.
function schemaErrors(schema, value, root = schema, at = "$") {
  if (schema.$ref) {
    return schemaErrors(root.definitions[schema.$ref.split("/").pop()], value, root, at);
  }
  const errors = [];
  const typeOf = (v) =>
    Array.isArray(v) ? "array" : v === null ? "null" : Number.isInteger(v) ? "integer" : typeof v;
  if (schema.type) {
    const types = [].concat(schema.type);
    if (!types.includes(typeOf(value))) return [`${at}: expected ${types.join("|")}`];
  }
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${at}: not one of ${schema.enum}`);
  if (schema.minLength && typeof value === "string" && value.length < schema.minLength) {
    errors.push(`${at}: too short`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems && value.length < schema.minItems) errors.push(`${at}: too few items`);
    if (schema.uniqueItems && new Set(value).size !== value.length) errors.push(`${at}: duplicates`);
    if (schema.items) {
      value.forEach((v, i) => errors.push(...schemaErrors(schema.items, v, root, `${at}[${i}]`)));
    }
  }
  if (typeOf(value) === "object") {
    for (const key of schema.required || []) {
      if (!(key in value)) errors.push(`${at}: missing ${key}`);
    }
    for (const [key, v] of Object.entries(value)) {
      const sub = schema.properties?.[key] ?? schema.additionalProperties;
      if (sub === false) errors.push(`${at}: unexpected property ${key}`);
      else if (sub && sub !== true) errors.push(...schemaErrors(sub, v, root, `${at}.${key}`));
    }
  }
  if (schema.oneOf) {
    const passing = schema.oneOf.filter((s) => !schemaErrors(s, value, root, at).length);
    if (passing.length !== 1) errors.push(`${at}: matches ${passing.length} of oneOf`);
  }
  if (schema.anyOf && !schema.anyOf.some((s) => !schemaErrors(s, value, root, at).length)) {
    errors.push(`${at}: matches none of anyOf`);
  }
  return errors;
}

const settings = JSON.parse(fs.readFileSync(path.join(repoRoot, ".vscode/settings.json"), "utf8"));
const mapping = settings["yaml.schemas"];

// Real files each schema is mapped to, found by expanding the simple `dir/*.yaml` globs.
function filesFor(globs) {
  return globs.flatMap((glob) => {
    if (!glob.includes("*")) return [path.join(repoRoot, glob)];
    const [before, after] = glob.split("*");
    if (before.endsWith("/") && !after.includes("/")) {
      const dir = path.join(repoRoot, before);
      return fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(after))
        .map((f) => path.join(dir, f));
    }
    // applications/*/selected-tags.yaml
    const dir = path.join(repoRoot, before);
    return fs
      .readdirSync(dir)
      .map((f) => path.join(dir, f, after.slice(1)))
      .filter((f) => fs.existsSync(f));
  });
}

describe("schema files", () => {
  const names = fs.readdirSync(schemaDir).map((f) => f.replace(".schema.json", ""));

  it.each(names)("%s is draft-07 with a title", (name) => {
    const schema = loadSchema(name);
    expect(schema.$schema).toBe("https://json-schema.org/draft-07/schema#");
    expect(schema.title).toBeTruthy();
  });

  it("are all mapped in .vscode/settings.json", () => {
    expect(Object.keys(mapping).sort()).toEqual(names.map((n) => `./schemas/${n}.schema.json`).sort());
  });

  it("keep enums in sync with the code", () => {
    expect(loadSchema("bullets").definitions.bullet.properties.section.enum).toEqual(SECTION_ORDER);
    expect(loadSchema("application").properties.cv_sections.items.enum).toEqual(CV_SECTIONS);
    expect(loadSchema("cv-variant").properties.cv_sections.items.enum).toEqual(CV_SECTIONS);
  });
});

describe("repository data matches its schema", () => {
  for (const [schemaPath, globs] of Object.entries(mapping)) {
    const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, schemaPath), "utf8"));
    const files = filesFor(globs);

    it(`${schemaPath} has files to check`, () => {
      expect(files.length).toBeGreaterThan(0);
    });

    it.each(files.map((f) => path.relative(repoRoot, f)))(`%s`, (file) => {
      expect(schemaErrors(schema, readYaml(path.join(repoRoot, file)))).toEqual([]);
    });
  }
});

describe("schemas accept every supported field and reject typos", () => {
  it("application", () => {
    const schema = loadSchema("application");
    const full = {
      company: "Acme",
      role: "Developer",
      variant: "fullstack",
      tags: ["react"],
      exclude_tags: ["payments"],
      pin: ["a"],
      cv_sections: ["experience", "skills"],
    };
    expect(schemaErrors(schema, full)).toEqual([]);
    expect(schemaErrors(schema, { varient: "fullstack" })).toEqual([
      "$: missing variant",
      "$: unexpected property varient",
    ]);
    expect(schemaErrors(schema, { variant: "x", cv_sections: ["hobbies"] })).toHaveLength(1);
  });

  it("bullets", () => {
    const schema = loadSchema("bullets");
    const full = { id: "a", text: "Did it.", tags: ["react"], section: "impact", job: "acme" };
    expect(schemaErrors(schema, [full])).toEqual([]);
    expect(schemaErrors(schema, { bullets: [full] })).toEqual([]);
    expect(schemaErrors(schema, [{ ...full, section: "projects" }])).not.toEqual([]);
    expect(schemaErrors(schema, [{ ...full, tag: ["react"] }])).not.toEqual([]);
  });

  it("cv-variant", () => {
    const schema = loadSchema("cv-variant");
    const full = { variant: "fe", include_tags: ["react"], exclude_tags: [], pin: ["a"], cv_sections: ["experience"] };
    expect(schemaErrors(schema, full)).toEqual([]);
    expect(schemaErrors(schema, { variant: "fe", include_tags: [] })).toEqual(["$.include_tags: too few items"]);
  });

  it("experience", () => {
    const schema = loadSchema("experience");
    const entry = { id: "acme", role: "Dev", company: "Acme", start: 2020, end: "Present", location: "x", summary: "y", bullets: ["z"] };
    expect(schemaErrors(schema, [entry])).toEqual([]);
    expect(schemaErrors(schema, entry)).toEqual([]);
    expect(schemaErrors(schema, [{ role: "Dev" }])).not.toEqual([]);
  });

  it("skills", () => {
    const schema = loadSchema("skills");
    expect(schemaErrors(schema, { groups: { Core: ["Go"] } })).toEqual([]);
    expect(schemaErrors(schema, { skills: ["Go"] })).toEqual([]);
    expect(schemaErrors(schema, {})).toEqual(["$: matches none of anyOf"]);
  });

  it("profile", () => {
    const schema = loadSchema("profile");
    expect(schemaErrors(schema, { name: "A", summary: "B", languages: [{ language: "English", level: "Fluent" }] })).toEqual([]);
    expect(schemaErrors(schema, { name: "A", summery: "B" })).toEqual([
      "$: missing summary",
      "$: unexpected property summery",
    ]);
  });
});
