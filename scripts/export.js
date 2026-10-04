// scripts/export.js
// Export a CV and cover letter from Markdown to HTML (Pandoc) and PDF (WeasyPrint).
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { pathToFileURL } from "url";
import { formatFileBase } from "./lib/formatting.js";
import { repoRoot, readYaml, getCssPath } from "./lib/files.js";
import { getApplicationDir, getArg, toPlainName } from "./lib/cli.js";

const USAGE =
  "Usage: npm run export -- --application <folder> [--only cv|cover] or --variant <variant>";

const INSTALL_HINTS = {
  pandoc: "brew install pandoc (macOS) or see https://pandoc.org/installing.html",
  weasyprint: "brew install weasyprint (macOS) or see https://doc.courtbouillon.org/weasyprint/",
};

// Which Markdown files to export and where the HTML and PDF go.
// Paths are absolute; each export sits next to its Markdown source.
export function planExports({ profile, applicationName, variantName, only }) {
  const docs = applicationName
    ? [
        { kind: "cv", file: "cv.md", css: ["style.css"] },
        { kind: "cover", file: "cover-letter.md", css: ["style.css", "cover.css"] },
      ]
    : [{ kind: "cv", file: `${variantName}.md`, css: ["style.css"] }];
  const dir = applicationName
    ? path.join(repoRoot, "applications", applicationName)
    : path.join(repoRoot, "output");

  return docs
    .filter((doc) => !only || doc.kind === only)
    .map((doc) => {
      const mdPath = path.join(dir, doc.file);
      const baseName = formatFileBase({
        profile,
        context: applicationName || variantName,
        type: doc.kind,
      });
      return {
        kind: doc.kind,
        mdPath,
        htmlPath: path.join(dir, `${baseName}.html`),
        pdfPath: path.join(dir, `${baseName}.pdf`),
        cssPaths: doc.css.map((css) => getCssPath(mdPath, css)),
        title: `${profile.name} – ${doc.kind === "cv" ? "CV" : "Cover Letter"}`,
      };
    });
}

// The two commands for one planned export, run from the repo root.
export function exportCommands(job) {
  const rel = (p) => path.relative(repoRoot, p);
  return [
    {
      cmd: "pandoc",
      args: [
        rel(job.mdPath),
        "-o",
        rel(job.htmlPath),
        "--standalone",
        ...job.cssPaths.map((css) => `--css=${css}`),
        "--metadata",
        `pagetitle=${job.title}`,
      ],
    },
    { cmd: "weasyprint", args: ["--quiet", rel(job.htmlPath), rel(job.pdfPath)] },
  ];
}

function run({ cmd, args }) {
  const result = spawnSync(cmd, args, { cwd: repoRoot, stdio: "inherit" });
  if (result.error?.code === "ENOENT") {
    throw new Error(`${cmd} is not installed. Install it with: ${INSTALL_HINTS[cmd]}`);
  }
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${cmd} failed with exit code ${result.status}.`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const rawApplication = getArg(args, "application");
  const rawVariant = getArg(args, "variant");
  const only = getArg(args, "only");
  if (!rawApplication && !rawVariant) throw new Error(USAGE);
  if (only && !["cv", "cover"].includes(only)) {
    throw new Error(`--only must be 'cv' or 'cover', not '${only}'.`);
  }

  const applicationName = rawApplication
    ? toPlainName(rawApplication, "application name")
    : undefined;
  if (applicationName) getApplicationDir(applicationName);
  const variantName = applicationName
    ? undefined
    : toPlainName(rawVariant, "variant name");

  const profile = readYaml(path.join(repoRoot, "data/profile/base-profile.yaml"));
  const jobs = planExports({ profile, applicationName, variantName, only });

  for (const job of jobs) {
    const mdRel = path.relative(repoRoot, job.mdPath);
    if (!fs.existsSync(job.mdPath)) {
      console.log(`Skipping ${mdRel}: file not found.`);
      continue;
    }
    exportCommands(job).forEach(run);
    console.log(`Exported ${mdRel} -> ${path.relative(repoRoot, job.pdfPath)}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}
