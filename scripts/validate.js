// scripts/validate.js
// Validate all source data. Exits 1 and lists every problem when anything is invalid.
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { repoRoot, readYaml } from "./lib/files.js";
import { normalizeBullets, SECTION_ORDER } from "./lib/selection.js";

const PATHS = {
  tags: "data/tags/tags.yaml",
  bullets: "data/bullet-bank/bullets.yaml",
  profile: "data/profile/base-profile.yaml",
  experience: "data/experience/experience.yaml",
  skills: "data/skills/skills.yaml",
  variants: "data/cv-variants",
  applications: "applications",
};

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

// Parse a YAML file, recording a parse error instead of throwing.
function tryReadYaml(relPath, errors) {
  try {
    return readYaml(path.join(repoRoot, relPath));
  } catch (e) {
    errors.push(`Error parsing ${relPath}: ${e.message}`);
    return undefined;
  }
}

// Check every tag in a list is a non-empty string declared in tags.yaml.
function validateTagList(tags, label, allowedTags) {
  const errors = [];
  tags.forEach((tag, i) => {
    if (!isNonEmptyString(tag)) {
      errors.push(`${label}[${i}] must be a non-empty string.`);
    } else if (!allowedTags.has(tag)) {
      errors.push(`${label}: unknown tag '${tag}' (add it to ${PATHS.tags}).`);
    }
  });
  return errors;
}

function validateTags(tagsYaml) {
  const errors = [];
  if (!tagsYaml || !Array.isArray(tagsYaml.tags)) {
    return { errors: [`${PATHS.tags} must contain a 'tags' array.`], allowedTags: new Set() };
  }
  const allowedTags = new Set();
  tagsYaml.tags.forEach((tag, i) => {
    if (!isNonEmptyString(tag)) {
      errors.push(`${PATHS.tags}: tags[${i}] must be a non-empty string.`);
    } else if (allowedTags.has(tag)) {
      errors.push(`${PATHS.tags}: duplicate tag '${tag}'.`);
    } else {
      allowedTags.add(tag);
    }
  });
  return { errors, allowedTags };
}

function validateBullets(data, allowedTags) {
  const bullets = normalizeBullets(data);
  if (!bullets) {
    return [`${PATHS.bullets} must be an array or an object with a bullets array.`];
  }

  const errors = [];
  const ids = new Set();
  bullets.forEach((b, i) => {
    const prefix = `bullet[${i}]`;
    if (!b || typeof b !== "object") {
      errors.push(`${prefix} must be an object.`);
      return;
    }

    if (!isNonEmptyString(b.id)) {
      errors.push(`${prefix}.id must be a non-empty string.`);
    } else if (ids.has(b.id)) {
      errors.push(`${prefix}.id "${b.id}" is duplicated.`);
    } else {
      ids.add(b.id);
    }

    if (!isNonEmptyString(b.text)) {
      errors.push(`${prefix}.text must be a non-empty string.`);
    }

    if (b.section !== undefined && !SECTION_ORDER.includes(b.section)) {
      errors.push(
        `${prefix}.section "${b.section}" must be one of: ${SECTION_ORDER.join(", ")}.`,
      );
    }

    if (!Array.isArray(b.tags) || b.tags.length === 0) {
      errors.push(`${prefix}.tags must be a non-empty array.`);
      return;
    }
    const label = `${prefix} (${b.id}).tags`;
    errors.push(...validateTagList(b.tags, label, allowedTags));
    const seen = new Set();
    for (const tag of b.tags) {
      if (seen.has(tag)) errors.push(`${label} has duplicate tag "${tag}".`);
      seen.add(tag);
    }
  });
  return errors;
}

function validateVariant(variant, file, allowedTags) {
  const prefix = `variant ${file}`;
  if (!variant || typeof variant !== "object") {
    return [`${prefix} must be an object.`];
  }

  const errors = [];
  if (!isNonEmptyString(variant.variant)) {
    errors.push(`${prefix}.variant must be a non-empty string.`);
  }

  if (!Array.isArray(variant.include_tags) || variant.include_tags.length === 0) {
    errors.push(`${prefix}.include_tags must be a non-empty array.`);
  } else {
    errors.push(
      ...validateTagList(variant.include_tags, `${prefix}.include_tags`, allowedTags),
    );
  }

  if (variant.exclude_tags !== undefined) {
    if (!Array.isArray(variant.exclude_tags)) {
      errors.push(`${prefix}.exclude_tags must be an array if present.`);
    } else {
      errors.push(
        ...validateTagList(variant.exclude_tags, `${prefix}.exclude_tags`, allowedTags),
      );
    }
  }
  return errors;
}

// Returns the set of variant names declared across all variant files.
function validateVariants(allowedTags, errors) {
  const variantsDir = path.join(repoRoot, PATHS.variants);
  const files = fs
    .readdirSync(variantsDir)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
  if (!files.length) errors.push(`No variant YAML files found in ${PATHS.variants}.`);

  const names = new Set();
  for (const file of files) {
    const variant = tryReadYaml(path.join(PATHS.variants, file), errors);
    if (variant === undefined) continue;
    errors.push(...validateVariant(variant, file, allowedTags));
    if (isNonEmptyString(variant?.variant)) {
      if (names.has(variant.variant)) {
        errors.push(`variant ${file}: variant name '${variant.variant}' is used by another file.`);
      }
      names.add(variant.variant);
    }
  }
  return names;
}

function validateApplication(folder, variantNames, allowedTags, errors) {
  const tagsRelPath = path.join(PATHS.applications, folder, "selected-tags.yaml");
  if (!fs.existsSync(path.join(repoRoot, tagsRelPath))) {
    errors.push(`Application '${folder}' is missing selected-tags.yaml.`);
    return;
  }
  const config = tryReadYaml(tagsRelPath, errors);
  if (config === undefined) return;

  const prefix = `application ${folder}`;
  if (!isNonEmptyString(config?.variant)) {
    errors.push(`${prefix}: selected-tags.yaml must contain a 'variant' string.`);
    return;
  }
  if (!variantNames.has(config.variant)) {
    errors.push(`${prefix}: unknown variant '${config.variant}'.`);
  }
  if (config.tags !== undefined && config.tags !== null) {
    if (!Array.isArray(config.tags)) {
      errors.push(`${prefix}: 'tags' must be an array if present.`);
    } else {
      errors.push(...validateTagList(config.tags, `${prefix}.tags`, allowedTags));
    }
  }
}

function validateApplications(variantNames, allowedTags, errors) {
  const applicationsDir = path.join(repoRoot, PATHS.applications);
  if (!fs.existsSync(applicationsDir)) return;
  for (const folder of fs.readdirSync(applicationsDir)) {
    if (!fs.statSync(path.join(applicationsDir, folder)).isDirectory()) continue;
    validateApplication(folder, variantNames, allowedTags, errors);
  }
}

function validateProfile(profile) {
  if (!profile || typeof profile !== "object") {
    return ["Profile is missing or not an object."];
  }
  const errors = [];
  if (!isNonEmptyString(profile.name)) {
    errors.push("Profile 'name' must be a non-empty string.");
  }
  if (profile.email !== undefined && !isNonEmptyString(profile.email)) {
    errors.push("Profile 'email' must be a non-empty string if present.");
  }
  if (!isNonEmptyString(profile.summary)) {
    errors.push("Profile 'summary' must be a non-empty string.");
  }
  return errors;
}

function validateExperience(exp) {
  if (!exp) return ["Experience is missing."];
  // Accept a list of entries or a single entry object.
  const entries = Array.isArray(exp) ? exp : [exp];
  if (!entries.length) return ["Experience must have at least one entry."];

  const errors = [];
  entries.forEach((e, i) => {
    const prefix = `experience[${i}]`;
    if (!e || typeof e !== "object") {
      errors.push(`${prefix} must be an object.`);
      return;
    }
    if (!isNonEmptyString(e.company)) {
      errors.push(`${prefix} must have a non-empty 'company'.`);
    }
    if (!isNonEmptyString(e.role)) {
      errors.push(`${prefix} must have a non-empty 'role'.`);
    }
    if (e.bullets !== undefined && !Array.isArray(e.bullets)) {
      errors.push(`${prefix}.bullets must be an array if present.`);
    }
  });
  return errors;
}

function validateSkillList(skills, label) {
  if (!Array.isArray(skills)) return [`${label} must be an array.`];
  return skills
    .map((skill, i) => (isNonEmptyString(skill) ? null : `${label}[${i}] must be a non-empty string.`))
    .filter(Boolean);
}

function validateSkills(skillsYaml) {
  if (!skillsYaml || typeof skillsYaml !== "object") {
    return ["Skills YAML is missing or not an object."];
  }
  const hasGroups = Object.hasOwn(skillsYaml, "groups");
  const hasSkills = Object.hasOwn(skillsYaml, "skills");
  if (!hasGroups && !hasSkills) {
    return ["Skills YAML must contain either 'groups' or 'skills'."];
  }

  const errors = [];
  if (hasGroups) {
    const groups = skillsYaml.groups;
    if (!groups || typeof groups !== "object" || Array.isArray(groups)) {
      errors.push("'groups' must be an object.");
    } else {
      for (const [group, skills] of Object.entries(groups)) {
        errors.push(...validateSkillList(skills, `Group '${group}'`));
      }
    }
  }
  if (hasSkills) {
    errors.push(...validateSkillList(skillsYaml.skills, "skills"));
  }
  return errors;
}

function main() {
  const missing = Object.values(PATHS)
    .filter((p) => p !== PATHS.applications)
    .filter((p) => !fs.existsSync(path.join(repoRoot, p)))
    .map((p) => `Missing: ${p}`);
  if (missing.length) {
    console.error("Validation failed:");
    missing.forEach((err) => console.error(`- ${err}`));
    process.exit(1);
  }

  const errors = [];
  const tagResult = validateTags(tryReadYaml(PATHS.tags, errors));
  errors.push(...tagResult.errors);
  const { allowedTags } = tagResult;

  errors.push(...validateBullets(tryReadYaml(PATHS.bullets, errors), allowedTags));
  const variantNames = validateVariants(allowedTags, errors);
  validateApplications(variantNames, allowedTags, errors);
  errors.push(...validateProfile(tryReadYaml(PATHS.profile, errors)));
  errors.push(...validateExperience(tryReadYaml(PATHS.experience, errors)));
  errors.push(...validateSkills(tryReadYaml(PATHS.skills, errors)));

  if (errors.length) {
    console.error("Validation failed:");
    errors.forEach((err) => console.error(`- ${err}`));
    process.exit(1);
  }
  console.log("Validation passed.");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export {
  validateTags,
  validateBullets,
  validateVariant,
  validateProfile,
  validateExperience,
  validateSkills,
};
