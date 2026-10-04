import fs from "fs";
import os from "os";
import path from "path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { assembleCV } from "../scripts/assemble.js";

// Fictional data in test/fixtures/repo, independent of the template data in data/.
const root = path.join(import.meta.dirname, "fixtures/repo");
let tmp;

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "assemble-test-"));
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterAll(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function assemble(options) {
  const outputPath = path.join(tmp, "cv.md");
  assembleCV({ variantName: "backend", tags: [], excludeTags: [], pin: [], outputPath, root, ...options });
  return fs.readFileSync(outputPath, "utf8");
}
const headings = (cv) => cv.match(/^## .+$/gm);
const jobBlocks = (cv) => cv.split('<div class="job">').slice(1);

describe("assembleCV", () => {
  it("renders the header and every section in the default order", () => {
    const cv = assemble({});
    expect(cv.startsWith("# Jordan Example\n")).toBe(true);
    expect(headings(cv)).toEqual(["## Profile", "## Experience", "## Skills", "## Education", "## Languages"]);
  });

  it("places each selected bullet under its job, with static bullets as the fallback", () => {
    const [acme, globex] = jobBlocks(assemble({}));
    expect(acme).toContain("- Acme API bullet.");
    expect(acme).not.toContain("Acme static bullet.");
    expect(globex).toContain("- Globex refunds bullet.");
    expect(globex).not.toContain("Globex static bullet.");
  });

  it("drops bullets with an application exclude tag", () => {
    const [acme, globex] = jobBlocks(assemble({ excludeTags: ["payments"] }));
    expect(acme).toContain("- Acme API bullet.");
    expect(globex).toContain("- Globex static bullet.");
    expect(globex).not.toContain("refunds");
  });

  it("adds pinned bullets that the variant's tags would not select", () => {
    const cv = assemble({ pin: ["mentoring"] });
    expect(cv).toContain("- Acme mentoring bullet.");
  });

  it("renders only the chosen cv_sections, in their order", () => {
    expect(headings(assemble({ cvSections: ["skills", "experience"] }))).toEqual(["## Skills", "## Experience"]);
  });

  it("rejects tags that are not declared in tags.yaml", () => {
    expect(() => assemble({ tags: ["golang"] })).toThrow(/unknown tag 'golang'/);
  });
});
