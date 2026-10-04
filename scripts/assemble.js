// scripts/assemble.js
// Assemble a full markdown CV from YAML data and selected bullets.
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

import { formatFileBase, formatHeader } from "./lib/formatting.js";
import { repoRoot, readYaml, getCssPath } from "./lib/files.js";
import { loadBullets, loadVariant, selectBullets } from "./lib/selection.js";
import { resolveBuildTarget } from "./lib/cli.js";
import { prepareCover } from "./prepare-cover.js";

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
  const lines = languages
    .filter((l) => l.language)
    .map((l) => `${l.language}: ${l.level || ""}`.trim());
  if (!lines.length) return "";
  // Trailing double space is a Markdown hard line break, one language per line.
  return `## Languages\n\n${lines.join("  \n")}\n\n`;
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
  try {
    const target = resolveBuildTarget(
      process.argv.slice(2),
      "Usage: npm run assemble -- --variant <variant> [--tags tag1,tag2] or --application <folder>",
    );
    assembleCV(target);
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}
