// build.js — Assemble a CV variant from bullet bank

import fs from "fs";
import { pathToFileURL } from "url";
import { repoRoot } from "./lib/files.js";
import { resolveBuildTarget } from "./lib/cli.js";
import {
  loadBullets,
  loadVariant,
  resolveTags,
  selectBullets,
  SECTION_ORDER,
} from "./lib/selection.js";

const PLACEHOLDER_CV_RE = /^# Generated CV\s+Run:/m;

function buildCV(variantName, tags, excludeTags) {
  const bullets = loadBullets(repoRoot);
  const variant = loadVariant(repoRoot, variantName);
  const { include, exclude } = resolveTags(variant, { tags, excludeTags });
  console.log("Tags:", include.join(", "));
  if (exclude.length) console.log("Excluded:", exclude.join(", "));
  const selected = selectBullets(bullets, include, exclude);

  const grouped = Object.fromEntries(SECTION_ORDER.map((s) => [s, []]));

  selected.forEach((b) => {
    grouped[b.section || "experience"].push(b);
  });

  let out = `# CV: ${variantName}\n\n`;

  for (const section of SECTION_ORDER) {
    if (!grouped[section].length) continue;

    const title = section.charAt(0).toUpperCase() + section.slice(1);

    out += `## ${title}\n`;
    grouped[section].forEach((b) => {
      out += `- ${b.text.trim()}\n`;
    });
    out += `\n`;
  }

  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { applicationName, variantName, tags, excludeTags, outputPath } =
      resolveBuildTarget(
        process.argv.slice(2),
        "Usage: npm run build -- --variant <variant> [--tags a,b] [--exclude-tags c,d] or --application <folder>",
      );
    // Only replace the placeholder written by new-app; never an assembled or edited CV.
    if (
      applicationName &&
      fs.existsSync(outputPath) &&
      !PLACEHOLDER_CV_RE.test(fs.readFileSync(outputPath, "utf8"))
    ) {
      throw new Error(
        `applications/${applicationName}/cv.md already has content. Refusing to overwrite.`,
      );
    }
    fs.writeFileSync(outputPath, buildCV(variantName, tags, excludeTags));
    console.log(`Built CV for variant: ${variantName}`);
    if (applicationName) {
      console.log(`Output: applications/${applicationName}/cv.md`);
    }
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}
