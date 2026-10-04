// scripts/prepare-cover.js
// Prepend a formatted header to a cover letter template for a given application
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { fillPlaceholders, formatHeader } from "./lib/formatting.js";
import { repoRoot, readYaml } from "./lib/files.js";
import {
  getApplicationDir,
  getArg,
  readApplicationConfig,
  toPlainName,
} from "./lib/cli.js";

const PLACEHOLDER_COVER_RE =
  /^# Cover Letter\s+Draft or generated cover letter goes here\./m;

export function prepareCover({
  applicationName,
  templateName = "base",
  skipExisting = false,
} = {}) {
  if (!applicationName) {
    throw new Error("Missing --application argument.");
  }

  const appDir = getApplicationDir(applicationName);
  toPlainName(templateName, "template name");

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
  const { company, role } = fs.existsSync(path.join(appDir, "selected-tags.yaml"))
    ? readApplicationConfig(appDir)
    : {};
  const body = fillPlaceholders(template.replace(/^# Cover Letter\s*/i, ""), {
    COMPANY: company,
    ROLE: role,
    YOUR_NAME: profile.name,
  });
  const out = header + body;
  fs.writeFileSync(coverPath, out);
  console.log(
    `Wrote cover-letter.md for application: ${applicationName} using template: ${templateName}`,
  );
  console.log(
    `\nExport to HTML and PDF: npm run export -- --application ${applicationName} --only cover\n`,
  );

  return { coverPath, skipped: false, templateName };
}

function main() {
  const args = process.argv.slice(2);
  try {
    const rawApplication = getArg(args, "application");
    if (!rawApplication) throw new Error("Missing --application argument.");
    const applicationName = toPlainName(rawApplication, "application name");
    const templateName = toPlainName(getArg(args, "template") || "base", "template name");
    prepareCover({ applicationName, templateName });
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
