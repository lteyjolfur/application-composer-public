import path from "path";
import { describe, expect, it } from "vitest";
import { exportCommands, planExports } from "../scripts/export.js";
import { repoRoot } from "../scripts/lib/files.js";

const profile = { name: "Jordan Example" };
const appDir = path.join(repoRoot, "applications", "acme-frontend");

describe("planExports", () => {
  it("plans the CV and cover letter for an application", () => {
    const jobs = planExports({ profile, applicationName: "acme-frontend" });
    expect(jobs).toEqual([
      {
        kind: "cv",
        mdPath: path.join(appDir, "cv.md"),
        htmlPath: path.join(appDir, "Jordan_Example_Acme_Frontend_CV.html"),
        pdfPath: path.join(appDir, "Jordan_Example_Acme_Frontend_CV.pdf"),
        cssPaths: ["../../style.css"],
        title: "Jordan Example – CV",
      },
      {
        kind: "cover",
        mdPath: path.join(appDir, "cover-letter.md"),
        htmlPath: path.join(appDir, "Jordan_Example_Acme_Frontend_Cover_Letter.html"),
        pdfPath: path.join(appDir, "Jordan_Example_Acme_Frontend_Cover_Letter.pdf"),
        cssPaths: ["../../style.css", "../../cover.css"],
        title: "Jordan Example – Cover Letter",
      },
    ]);
  });

  it("limits the plan with only", () => {
    const jobs = planExports({ profile, applicationName: "acme-frontend", only: "cover" });
    expect(jobs.map((j) => j.kind)).toEqual(["cover"]);
  });

  it("plans a variant CV in output/", () => {
    const [job] = planExports({ profile, variantName: "frontend" });
    expect(job.mdPath).toBe(path.join(repoRoot, "output", "frontend.md"));
    expect(job.pdfPath).toBe(path.join(repoRoot, "output", "Jordan_Example_Frontend_CV.pdf"));
    expect(job.cssPaths).toEqual(["../style.css"]);
  });
});

describe("exportCommands", () => {
  it("runs pandoc with every stylesheet and a page title, then weasyprint", () => {
    const [cover] = planExports({ profile, applicationName: "acme-frontend", only: "cover" });
    expect(exportCommands(cover)).toEqual([
      {
        cmd: "pandoc",
        args: [
          "applications/acme-frontend/cover-letter.md",
          "-o",
          "applications/acme-frontend/Jordan_Example_Acme_Frontend_Cover_Letter.html",
          "--standalone",
          "--css=../../style.css",
          "--css=../../cover.css",
          "--metadata",
          "pagetitle=Jordan Example – Cover Letter",
        ],
      },
      {
        cmd: "weasyprint",
        args: [
          "--quiet",
          "applications/acme-frontend/Jordan_Example_Acme_Frontend_Cover_Letter.html",
          "applications/acme-frontend/Jordan_Example_Acme_Frontend_Cover_Letter.pdf",
        ],
      },
    ]);
  });
});
