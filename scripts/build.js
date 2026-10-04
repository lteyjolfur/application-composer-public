// build.js — Assemble a CV variant from bullet bank

import fs from "fs";
import { pathToFileURL } from "url";
import { repoRoot } from "./lib/files.js";
import { resolveBuildTarget } from "./lib/cli.js";
import {
  loadBullets,
  loadVariant,
  selectBullets,
  SECTION_ORDER,
} from "./lib/selection.js";

const PLACEHOLDER_CV_RE = /^# Generated CV\s+Run:/m;

function buildCV(variantName, cliTags) {
  const bullets = loadBullets(repoRoot);
  const variant = loadVariant(repoRoot, variantName);
  const effectiveTags = [
    ...new Set([
      ...variant.include_tags,
      ...(cliTags && cliTags.length ? cliTags : []),
    ]),
  ];
  console.log("Tags:", effectiveTags.join(", "));
  const selected = selectBullets(
    bullets,
    effectiveTags,
    variant.exclude_tags || [],
  );

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
    const { applicationName, variantName, tags, outputPath } =
      resolveBuildTarget(
        process.argv.slice(2),
        "Usage: npm run build -- --variant <variant> [--tags tag1,tag2] or --application <folder>",
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
    fs.writeFileSync(outputPath, buildCV(variantName, tags));
    console.log(`Built CV for variant: ${variantName}`);
    if (applicationName) {
      console.log(`Output: applications/${applicationName}/cv.md`);
    }
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}
