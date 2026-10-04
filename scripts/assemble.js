// scripts/assemble.js
// Assemble a full markdown CV from YAML data and selected bullets.
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

import { formatHeader, resolveCvSections } from "./lib/formatting.js";
import { groupBulletsByJob, toEntries } from "./lib/experience.js";
import { repoRoot, readYaml } from "./lib/files.js";
import {
  loadBullets,
  loadVariant,
  resolveTags,
  selectBullets,
} from "./lib/selection.js";
import { resolveBuildTarget } from "./lib/cli.js";
import { prepareCover } from "./prepare-cover.js";

// Each entry shows the bullet-bank bullets selected for it, or its own static
// `bullets` when none were selected.
function formatExperience(exp, dynamicBullets) {
  let out = "## Experience\n\n";
  const entries = toEntries(exp);
  const selectedByJob = groupBulletsByJob(entries, dynamicBullets || []);
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
    const selected = selectedByJob[idx];
    const lines = selected.length
      ? selected.map((b) => b.text.trim())
      : (Array.isArray(e.bullets) ? e.bullets : [])
          .filter((b) => typeof b === "string" && b.trim())
          .map((b) => b.trim());
    if (lines.length) {
      out += lines.map((line) => `\n- ${line}`).join("") + "\n";
    }
    out += `\n</div>\n\n`;
  });
  return out;
}
function formatProfile(profile) {
  if (!profile.summary) return "";
  return `## Profile\n\n${profile.summary.trim()}\n\n`;
}


function getProfile(root) {
  const profilePath = path.join(root, "data/profile/base-profile.yaml");
  return readYaml(profilePath);
}

function getExperience(root) {
  const expPath = path.join(root, "data/experience/experience.yaml");
  return readYaml(expPath);
}

function getSkills(root) {
  const skillsPath = path.join(root, "data/skills/skills.yaml");
  return readYaml(skillsPath);
}

function getEducation(root) {
  const eduPath = path.join(root, "data/profile/education.yaml");

  if (fs.existsSync(eduPath)) {
    return readYaml(eduPath);
  }

  return null;
}

function getLanguages(profile) {
  return Array.isArray(profile.languages) ? profile.languages : [];
}

function getAllowedTags(root) {
  const tagsPath = path.join(root, "data/tags/tags.yaml");
  const tagsYaml = readYaml(tagsPath);

  if (!tagsYaml || !Array.isArray(tagsYaml.tags)) {
    throw new Error("data/tags/tags.yaml must contain a 'tags' array.");
  }

  return new Set(tagsYaml.tags);
}

function assertKnownTags(root, tagSources) {
  const allowedTags = getAllowedTags(root);
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
      if (e.start && e.end) meta.push(`${e.start}–${e.end}`);
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

function assembleCV({
  variantName,
  tags,
  excludeTags,
  pin,
  cvSections,
  outputPath,
  applicationName,
  root = repoRoot, // data folder root; tests point this at a fixture
}) {
  const profile = getProfile(root);
  const exp = getExperience(root);
  const skills = getSkills(root);
  const edu = getEducation(root);
  const lang = getLanguages(profile);
  const bullets = loadBullets(root);
  const variant = loadVariant(root, variantName);

  assertKnownTags(root, [
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
    {
      label: applicationName
        ? `application '${applicationName}' exclude_tags`
        : "CLI exclude tags",
      tags: excludeTags || [],
    },
  ]);

  const { include: effectiveTags, exclude, pin: pinnedIds } = resolveTags(variant, {
    tags,
    excludeTags,
    pin,
  });
  const selectedBullets = selectBullets(bullets, effectiveTags, exclude, pinnedIds);

  // Compose markdown: the header, then the chosen sections in order.
  const renderers = {
    profile: () => formatProfile(profile),
    experience: () => formatExperience(exp, selectedBullets),
    skills: () => formatSkills(skills),
    education: () => formatEducation(edu),
    languages: () => formatLanguages(lang),
  };
  const out =
    formatHeader(profile) +
    resolveCvSections(variant, cvSections)
      .map((name) => renderers[name]())
      .join("");

  fs.writeFileSync(outputPath, out);
  console.log(`Assembled CV for variant: ${variantName}`);
  if (applicationName) {
    console.log(`Output: applications/${applicationName}/cv.md`);
  } else {
    console.log(`Output: ${outputPath}`);
  }

  const target = applicationName
    ? `--application ${applicationName}`
    : `--variant ${variantName}`;
  console.log(`\nExport to HTML and PDF: npm run export -- ${target}\n`);

  if (applicationName) {
    const templateName = getCoverTemplateName(variantName, effectiveTags);

    console.log("Cover letter:");
    prepareCover({ applicationName, templateName, skipExisting: true });
    console.log("");
  }
}

export {
  assembleCV,
  formatExperience,
  formatSkills,
  formatEducation,
  formatLanguages,
  getCoverTemplateName,
};

// CLI entry
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const target = resolveBuildTarget(
      process.argv.slice(2),
      "Usage: npm run assemble -- --variant <variant> [--tags a,b] [--exclude-tags c,d] [--pin id1,id2] or --application <folder>",
    );
    assembleCV(target);
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}
