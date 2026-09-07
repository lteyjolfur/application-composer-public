"use strict";
// scripts/prepare-cover.js
// Prepend a formatted header to a cover letter template for a given application
import fs from "fs";
import path from "path";
import yaml from "yaml";
import { fileURLToPath } from "url";
import { formatHeader, formatFileBase } from "./lib/formatting.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "");
const PLACEHOLDER_COVER_RE =
  /^# Cover Letter\s+Draft or generated cover letter goes here\./m;

function readYaml(filePath) {
  return yaml.parse(fs.readFileSync(filePath, "utf8"));
}

function getCssPath(outputPath) {
  const relative = path.relative(
    path.dirname(outputPath),
    path.join(repoRoot, "style.css"),
  );
  return relative || "style.css";
}

function rel(filePath) {
  return path.relative(repoRoot, filePath);
}

function printCoverExportCommand({ profile, applicationName, coverPath }) {
  const appDir = path.dirname(coverPath);
  const baseName = formatFileBase({
    profile,
    context: applicationName,
    type: "cover",
  });
  const htmlPath = path.join(appDir, `${baseName}.html`);
  const pdfPath = path.join(appDir, `${baseName}.pdf`);
  const cssPath = getCssPath(coverPath);
  const mdRel = rel(coverPath);
  const htmlRel = rel(htmlPath);
  const pdfRel = rel(pdfPath);

  console.log("\nPDF export:");
  console.log(
    `pandoc ${mdRel} -o ${htmlRel} --css=${cssPath} --css=../../cover.css --standalone && weasyprint --quiet ${htmlRel} ${pdfRel}`,
  );
  console.log("");
}

export function prepareCover({
  applicationName,
  templateName = "base",
  skipExisting = false,
} = {}) {
  if (!applicationName) {
    throw new Error("Missing --application argument.");
  }

  const appDir = path.join(repoRoot, "applications", applicationName);
  if (!fs.existsSync(appDir)) {
    throw new Error(`Application folder not found: ${applicationName}`);
  }

  const coverPath = path.join(appDir, "cover-letter.md");
  if (fs.existsSync(coverPath)) {
    const existing = fs.readFileSync(coverPath, "utf8");
    if (!PLACEHOLDER_COVER_RE.test(existing)) {
      if (skipExisting) {
        console.log(
          `cover-letter.md already has content for application: ${applicationName}. Leaving it unchanged.`,
        );
        return { coverPath, skipped: true, templateName };
      }

      throw new Error(
        "cover-letter.md already exists and has content. Refusing to overwrite.",
      );
    }
  }

  const templatePath = path.join(
    repoRoot,
    "data/cover-templates",
    `${templateName}.md`,
  );
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Cover letter template not found: ${templatePath}`);
  }

  const profilePath = path.join(repoRoot, "data/profile/base-profile.yaml");
  const profile = readYaml(profilePath);
  const header = formatHeader(profile);
  const template = fs.readFileSync(templatePath, "utf8");
  const out = header + template.replace(/^# Cover Letter\s*/i, "");
  fs.writeFileSync(coverPath, out);
  console.log(
    `Wrote cover-letter.md for application: ${applicationName} using template: ${templateName}`,
  );
  printCoverExportCommand({ profile, applicationName, coverPath });

  return { coverPath, skipped: false, templateName };
}

function main() {
  const args = process.argv.slice(2);
  let applicationName = null;
  let templateName = "base";

  for (let i = 0; i < args.length; ++i) {
    if (args[i] === "--application" && args[i + 1]) {
      applicationName = args[i + 1];
      i++;
    } else if (args[i].startsWith("--application=")) {
      applicationName = args[i].split("=")[1];
    } else if (args[i] === "--template" && args[i + 1]) {
      templateName = args[i + 1];
      i++;
    } else if (args[i].startsWith("--template=")) {
      templateName = args[i].split("=")[1];
    }
  }

  try {
    prepareCover({ applicationName, templateName });
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
