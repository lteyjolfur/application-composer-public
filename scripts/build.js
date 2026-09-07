// build.js — Assemble a CV variant from bullet bank

import fs from "fs";
import path from "path";
import yaml from "yaml";
import { fileURLToPath } from "url";
import {
  loadBullets,
  loadVariant,
  selectBullets,
  SECTION_ORDER,
} from "./lib/selection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

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

  const grouped = {
    experience: [],
    impact: [],
    leadership: [],
  };

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

if (import.meta.url === `file://${process.argv[1]}`) {
  const appEq = process.argv.find((a) => a.startsWith("--application="));
  const appIdx = process.argv.indexOf("--application");
  let applicationName;
  if (appEq) {
    applicationName = appEq.split("=")[1];
  } else if (appIdx !== -1 && process.argv[appIdx + 1]) {
    applicationName = process.argv[appIdx + 1];
  }

  let variantName;
  let cliTags = [];
  let outputPath;

  if (applicationName) {
    // If both --application and --variant are given, prefer application and warn
    if (process.argv.some((a) => a.startsWith("--variant"))) {
      console.warn(
        "Warning: --variant is ignored when --application is provided.",
      );
    }
    const appDir = path.join(repoRoot, "applications", applicationName);
    const tagsPath = path.join(appDir, "selected-tags.yaml");
    if (!fs.existsSync(appDir)) {
      console.error(`Application folder not found: ${appDir}`);
      process.exit(1);
    }
    if (!fs.existsSync(tagsPath)) {
      console.error(
        `Missing selected-tags.yaml in application folder: ${tagsPath}`,
      );
      process.exit(1);
    }
    let appConfig;
    try {
      appConfig = yaml.parse(fs.readFileSync(tagsPath, "utf8"));
    } catch (e) {
      console.error(`Error parsing selected-tags.yaml: ${e}`);
      process.exit(1);
    }
    if (!appConfig.variant || typeof appConfig.variant !== "string") {
      console.error(`selected-tags.yaml must contain a 'variant' string.`);
      process.exit(1);
    }
    variantName = appConfig.variant;
    if (appConfig.tags && !Array.isArray(appConfig.tags)) {
      console.error(
        `'tags' in selected-tags.yaml must be an array if present.`,
      );
      process.exit(1);
    }
    cliTags = appConfig.tags || [];
    outputPath = path.join(appDir, "cv.md");
  } else {
    // Normal variant build
    const variantEq = process.argv.find((a) => a.startsWith("--variant="));
    const variantIdx = process.argv.indexOf("--variant");
    if (variantEq) {
      variantName = variantEq.split("=")[1];
    } else if (variantIdx !== -1 && process.argv[variantIdx + 1]) {
      variantName = process.argv[variantIdx + 1];
    } else {
      console.error(
        "Usage: npm run build -- --variant <variant> [--tags tag1,tag2] or --application <folder>",
      );
      process.exit(1);
    }
    // Parse --tags tag1,tag2,tag3
    const tagsEq = process.argv.find((a) => a.startsWith("--tags="));
    const tagsIdx = process.argv.indexOf("--tags");
    if (tagsEq) {
      cliTags = tagsEq
        .split("=")[1]
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    } else if (tagsIdx !== -1 && process.argv[tagsIdx + 1]) {
      cliTags = process.argv[tagsIdx + 1]
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
    const outputDir = path.join(repoRoot, "output");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    outputPath = path.join(outputDir, `${variantName}.md`);
  }

  const out = buildCV(variantName, cliTags);
  fs.writeFileSync(outputPath, out);
  console.log(`Built CV for variant: ${variantName}`);
  if (applicationName) {
    console.log(`Output: applications/${applicationName}/cv.md`);
  }
}
