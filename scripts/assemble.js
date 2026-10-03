import { formatFileBase, formatHeader } from "./lib/formatting.js";

function formatExperience(exp, dynamicBullets) {
  let out = "## Experience\n\n";
  const entries = Array.isArray(exp) ? exp : [exp];
  entries.forEach((e, idx) => {
    if (!e.role && !e.company) return;
    out += `<div class="job">\n`;
    out +=
      `### ${e.role || ""}${e.role && e.company ? ", " : ""}${e.company || ""}`.trim() +
      "\n";
    let meta = [];
    if (e.start) meta.push(e.start + (e.end ? `–${e.end}` : ""));
    else if (e.end) meta.push(e.end);
    if (e.location) meta.push(e.location);
    if (meta.length) out += meta.join(" · ") + "\n";
    if (e.summary) out += "\n" + e.summary.trim() + "\n";
    // Bullets
    if (idx === 0 && dynamicBullets && dynamicBullets.length) {
      dynamicBullets.forEach((b) => {
        out += `\n- ${b.text.trim()}`;
      });
      out += "\n";
    }
    // Static bullets (if present)
    if (idx !== 0 && e.bullets && Array.isArray(e.bullets)) {
      e.bullets.forEach((b) => {
        if (b && typeof b === "string" && b.trim()) out += `\n- ${b.trim()}`;
      });
      out += "\n";
    }
    out += `\n</div>\n\n`;
  });
  return out;
}
function formatProfile(profile) {
  if (!profile.summary) return "";
  return `## Profile\n\n${profile.summary.trim()}\n\n`;
}

// scripts/assemble.js
// Assemble a full markdown CV from YAML data and selected bullets.
import fs from "fs";
import path from "path";
import yaml from "yaml";
import { fileURLToPath, pathToFileURL } from "url";

import { loadBullets, loadVariant, selectBullets } from "./lib/selection.js";
import { prepareCover } from "./prepare-cover.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function readYaml(filePath) {
  return yaml.parse(fs.readFileSync(filePath, "utf8"));
}

function getProfile() {
  const profilePath = path.join(repoRoot, "data/profile/base-profile.yaml");
  return readYaml(profilePath);
}

function getExperience() {
  const expPath = path.join(repoRoot, "data/experience/experience.yaml");
  return readYaml(expPath);
}

function getSkills() {
  const skillsPath = path.join(repoRoot, "data/skills/skills.yaml");
  return readYaml(skillsPath);
}

function getEducation() {
  const eduPath = path.join(repoRoot, "data/profile/education.yaml");

  if (fs.existsSync(eduPath)) {
    return readYaml(eduPath);
  }

  return null;
}

function getLanguages(profile) {
  return Array.isArray(profile.languages) ? profile.languages : [];
}

function getAllowedTags() {
  const tagsPath = path.join(repoRoot, "data/tags/tags.yaml");
  const tagsYaml = readYaml(tagsPath);

  if (!tagsYaml || !Array.isArray(tagsYaml.tags)) {
    throw new Error("data/tags/tags.yaml must contain a 'tags' array.");
  }

  return new Set(tagsYaml.tags);
}

function assertKnownTags(tagSources) {
  const allowedTags = getAllowedTags();
  const errors = [];

  for (const { label, tags } of tagSources) {
    for (const tag of tags || []) {
      if (typeof tag !== "string" || !tag.trim()) {
        errors.push(`${label}: tag must be a non-empty string.`);
      } else if (!allowedTags.has(tag)) {
        errors.push(`${label}: unknown tag '${tag}'.`);
      }
    }
  }

  if (errors.length) {
    const detail = errors.map((e) => `- ${e}`).join("\n");
    throw new Error(`Unknown tags found:\n${detail}`);
  }
}

function formatSkills(skillsYaml) {
  if (!skillsYaml) return "";

  let out = "## Skills\n\n";

  if (skillsYaml.groups && typeof skillsYaml.groups === "object") {
    for (const [groupName, skills] of Object.entries(skillsYaml.groups)) {
      if (!Array.isArray(skills) || !skills.length) continue;

      const cleanSkills = skills
        .filter((s) => typeof s === "string" && s.trim())
        .map((s) => s.trim());

      if (!cleanSkills.length) continue;

      out += `### ${groupName}\n`;
      out += `${cleanSkills.join(", ")}\n\n`;
    }

    return out === "## Skills\n\n" ? "" : out;
  }

  if (Array.isArray(skillsYaml.skills)) {
    const cleanSkills = skillsYaml.skills
      .filter((s) => typeof s === "string" && s.trim())
      .map((s) => s.trim());

    if (!cleanSkills.length) return "";

    out += `${cleanSkills.join(", ")}\n\n`;
    return out;
  }

  return "";
}

function formatEducation(eduYaml) {
  if (!eduYaml?.education || !Array.isArray(eduYaml.education)) {
    return "";
  }
  let out = "## Education\n\n";

  eduYaml.education.forEach((e) => {
    if (!e.degree && !e.school) return;
    out += `### ${e.degree || ""}`.trim() + "\n";
    const meta = [];
    if (e.school) meta.push(e.school);
    if (e.start || e.end) {
      if (e.start && e.end) meta.push(`${e.start}-${e.end}`);
      else meta.push(e.start || e.end);
    }
    if (e.location) meta.push(e.location);
    if (meta.length) {
      out += meta.join(" · ") + "\n";
    }
    if (e.summary) {
      out += "\n" + e.summary.trim() + "\n";
    }
    out += "\n";
  });

  return out;
}

function formatLanguages(languages) {
  if (!Array.isArray(languages) || !languages.length) return "";
  let out = "## Languages\n\n";
  languages.forEach((l) => {
    if (!l.language) return;
    out += `${l.language}: ${l.level || ""}`.trim() + "\n";
  });
  out += "\n";
  return out;
}

function getCssPath(outputPath) {
  const relative = path.relative(
    path.dirname(outputPath),
    path.join(repoRoot, "style.css"),
  );
  return relative || "style.css";
}

function getCoverTemplateName(variantName, effectiveTags) {
  const normalizedVariant = variantName.toLowerCase();
  const tagSet = new Set(effectiveTags || []);

  if (
    normalizedVariant.includes("testautomation") ||
    normalizedVariant.includes("test-automation")
  ) {
    return "test-automation";
  }

  if (normalizedVariant.includes("leadership")) {
    return "leadership";
  }

  if (normalizedVariant.includes("fullstack")) {
    return "fullstack";
  }

  if (normalizedVariant.includes("frontend")) {
    return "frontend";
  }

  if (tagSet.has("test-automation")) {
    return "test-automation";
  }

  if (tagSet.has("leadership") || tagSet.has("tech-lead")) {
    return "leadership";
  }

  if (tagSet.has("fullstack")) {
    return "fullstack";
  }

  if (tagSet.has("frontend")) {
    return "frontend";
  }

  return "base";
}

function assembleCV({ variantName, tags, outputPath, applicationName }) {
  const profile = getProfile();
  const exp = getExperience();
  const skills = getSkills();
  const edu = getEducation();
  const lang = getLanguages(profile);
  const bullets = loadBullets(repoRoot);
  const variant = loadVariant(repoRoot, variantName);

  assertKnownTags([
    {
      label: `variant '${variantName}' exclude_tags`,
      tags: variant.exclude_tags || [],
    },
    {
      label: `variant '${variantName}' include_tags`,
      tags: variant.include_tags || [],
    },
    {
      label: applicationName
        ? `application '${applicationName}' tags`
        : "CLI tags",
      tags: tags || [],
    },
  ]);

  const effectiveTags = [
    ...new Set([
      ...(variant.include_tags || []),
      ...(tags && tags.length ? tags : []),
    ]),
  ];
  const selectedBullets = selectBullets(
    bullets,
    effectiveTags,
    variant.exclude_tags || [],
  );

  // Compose markdown
  let out = "";
  out += formatHeader(profile);
  out += formatProfile(profile);
  out += formatExperience(exp, selectedBullets);
  out += formatSkills(skills);
  out += formatEducation(edu);
  out += formatLanguages(lang);

  fs.writeFileSync(outputPath, out);
  console.log(`Assembled CV for variant: ${variantName}`);
  if (applicationName) {
    console.log(`Output: applications/${applicationName}/cv.md`);
  } else {
    console.log(`Output: ${outputPath}`);
  }

  // New export file naming
  const context = applicationName || variantName;
  const baseName = formatFileBase({ profile, context, type: "cv" });
  const htmlPath = path.join(path.dirname(outputPath), `${baseName}.html`);
  const pdfPath = path.join(path.dirname(outputPath), `${baseName}.pdf`);
  const cssPath = getCssPath(outputPath);

  // Helper for relative paths from repo root
  function rel(filePath) {
    return path.relative(repoRoot, filePath);
  }
  const mdRel = rel(outputPath);
  const htmlRel = rel(htmlPath);
  const pdfRel = rel(pdfPath);

  console.log("\nPDF export:");
  console.log(
    `pandoc ${mdRel} -o ${htmlRel} --css=${cssPath} --standalone && weasyprint --quiet ${htmlRel} ${pdfRel}`,
  );
  console.log("");

  if (applicationName) {
    const templateName = getCoverTemplateName(variantName, effectiveTags);

    console.log("Cover letter:");
    prepareCover({ applicationName, templateName, skipExisting: true });
    console.log("");
  }
}

// CLI entry
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
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
      console.error(`Application folder not found: ${applicationName}`);
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
    // Normal variant mode
    const variantEq = process.argv.find((a) => a.startsWith("--variant="));
    const variantIdx = process.argv.indexOf("--variant");
    if (variantEq) {
      variantName = variantEq.split("=")[1];
    } else if (variantIdx !== -1 && process.argv[variantIdx + 1]) {
      variantName = process.argv[variantIdx + 1];
    } else {
      console.error(
        "Usage: npm run assemble -- --variant <variant> or --application <folder>",
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

  try {
    assembleCV({ variantName, tags: cliTags, outputPath, applicationName });
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}
