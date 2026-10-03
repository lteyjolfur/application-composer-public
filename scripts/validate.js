// Application folder validation (Phase 3E)
function validateApplicationFolder(appPath) {
  const required = ["selected-tags.yaml"];
  const files = fs.readdirSync(appPath);
  let ok = true;

  for (const req of required) {
    if (!files.includes(req)) {
      console.error(`${appPath}: missing required file: ${req}`);
      ok = false;
    }
  }
  return ok;
}
import fs from "fs";
import path from "path";
import yaml from "yaml";
import { fileURLToPath } from "url";
import { normalizeBullets, SECTION_ORDER } from "./lib/selection.js";

function readYaml(filePath) {
  return yaml.parse(fs.readFileSync(filePath, "utf8"));
}

function validateBullets(bullets) {
  const errors = [];
  const ids = new Set();
  const knownTags = new Set();

  if (!Array.isArray(bullets)) {
    errors.push(
      "Bullet bank must be an array or an object with a bullets array.",
    );
    return { errors, knownTags };
  }

  bullets.forEach((b, i) => {
    const prefix = `bullet[${i}]`;

    if (!b || typeof b !== "object") {
      errors.push(`${prefix} must be an object.`);
      return;
    }

    if (typeof b.id !== "string" || b.id.trim() === "") {
      errors.push(`${prefix}.id must be a non-empty string.`);
    } else if (ids.has(b.id)) {
      errors.push(`${prefix}.id "${b.id}" is duplicated.`);
    } else {
      ids.add(b.id);
    }

    if (typeof b.text !== "string" || b.text.trim() === "") {
      errors.push(`${prefix}.text must be a non-empty string.`);
    }

    if (b.section !== undefined && !SECTION_ORDER.includes(b.section)) {
      errors.push(
        `${prefix}.section "${b.section}" must be one of: ${SECTION_ORDER.join(", ")}.`,
      );
    }

    if (!Array.isArray(b.tags) || b.tags.length === 0) {
      errors.push(`${prefix}.tags must be a non-empty array.`);
    } else {
      const localTags = new Set();

      b.tags.forEach((tag, tagIndex) => {
        if (typeof tag !== "string" || tag.trim() === "") {
          errors.push(
            `${prefix}.tags[${tagIndex}] must be a non-empty string.`,
          );
          return;
        }

        if (localTags.has(tag)) {
          errors.push(`${prefix} has duplicate tag "${tag}".`);
        }

        localTags.add(tag);
        knownTags.add(tag);
      });
    }
  });

  return { errors, knownTags };
}

function validateVariant(variant, filename) {
  const errors = [];
  const prefix = `variant "${filename}"`;

  if (!variant || typeof variant !== "object") {
    errors.push(`${prefix} must be an object.`);
    return errors;
  }

  if (variant.exclude_tags !== undefined && !Array.isArray(variant.exclude_tags)) {
    errors.push(`${prefix}.exclude_tags must be an array if present.`);
  } else if (Array.isArray(variant.exclude_tags)) {
    variant.exclude_tags.forEach((tag, i) => {
      if (typeof tag !== "string" || tag.trim() === "") {
        errors.push(`${prefix}.exclude_tags[${i}] must be a non-empty string.`);
      }
    });
  }

  if (typeof variant.variant !== "string" || !variant.variant.trim()) {
    errors.push(`${prefix}.variant must be a non-empty string.`);
  }

  if (
    !Array.isArray(variant.include_tags) ||
    variant.include_tags.length === 0
  ) {
    errors.push(`${prefix}.include_tags must be a non-empty array.`);
  } else {
    variant.include_tags.forEach((tag, i) => {
      if (typeof tag !== "string" || tag.trim() === "") {
        errors.push(`${prefix}.include_tags[${i}] must be a non-empty string.`);
      }
    });
  }

  return errors;
}

function validateProfile(profile) {
  const errors = [];
  if (!profile || typeof profile !== "object") {
    errors.push("Profile is missing or not an object.");
    return errors;
  }
  if (
    !profile.name ||
    typeof profile.name !== "string" ||
    !profile.name.trim()
  ) {
    errors.push("Profile 'name' must exist and be a non-empty string.");
  }
  if (
    profile.email &&
    (typeof profile.email !== "string" || !profile.email.trim())
  ) {
    errors.push("Profile 'email' must be a non-empty string if present.");
  }
  if (
    !profile.summary ||
    typeof profile.summary !== "string" ||
    !profile.summary.trim()
  ) {
    errors.push("Profile 'summary' must exist and be a non-empty string.");
  }
  return errors;
}

function validateExperience(exp) {
  const errors = [];
  if (!exp) {
    errors.push("Experience is missing.");
    return errors;
  }
  // Accept array or single object
  const entries = Array.isArray(exp) ? exp : [exp];
  if (!entries.length) {
    errors.push("Experience must have at least one entry.");
    return errors;
  }
  // Latest/current role must exist
  const latest = entries[0];
  if (!latest || typeof latest !== "object") {
    errors.push("Latest experience entry is missing or not an object.");
  } else {
    if (
      !latest.company ||
      typeof latest.company !== "string" ||
      !latest.company.trim()
    ) {
      errors.push("Latest experience entry must have a non-empty 'company'.");
    }
    if (
      !latest.role ||
      typeof latest.role !== "string" ||
      !latest.role.trim()
    ) {
      errors.push("Latest experience entry must have a non-empty 'role'.");
    }
  }
  // Validate all entries
  entries.forEach((e, i) => {
    const prefix = `experience[${i}]`;
    if (!e.company || typeof e.company !== "string" || !e.company.trim()) {
      errors.push(`${prefix} must have a non-empty 'company'.`);
    }
    if (!e.role || typeof e.role !== "string" || !e.role.trim()) {
      errors.push(`${prefix} must have a non-empty 'role'.`);
    }
    if (e.bullets && !Array.isArray(e.bullets)) {
      errors.push(`${prefix}.bullets must be an array if present.`);
    }
  });
  return errors;
}

function validateSkills(skillsYaml) {
  const errors = [];
  if (!skillsYaml || typeof skillsYaml !== "object") {
    errors.push("Skills YAML is missing or not an object.");
    return errors;
  }
  const hasGroups = Object.prototype.hasOwnProperty.call(skillsYaml, "groups");
  const hasSkills = Object.prototype.hasOwnProperty.call(skillsYaml, "skills");
  if (!hasGroups && !hasSkills) {
    errors.push("Skills YAML must contain either 'groups' or 'skills'.");
    return errors;
  }
  if (hasGroups) {
    if (
      typeof skillsYaml.groups !== "object" ||
      Array.isArray(skillsYaml.groups) ||
      skillsYaml.groups === null
    ) {
      errors.push("'groups' must be an object.");
    } else {
      for (const [group, arr] of Object.entries(skillsYaml.groups)) {
        if (!Array.isArray(arr)) {
          errors.push(`Group '${group}' must be an array.`);
        } else {
          arr.forEach((skill, i) => {
            if (typeof skill !== "string" || !skill.trim()) {
              errors.push(
                `Group '${group}' skill[${i}] must be a non-empty string.`,
              );
            }
          });
        }
      }
    }
  }
  if (hasSkills) {
    if (!Array.isArray(skillsYaml.skills)) {
      errors.push("'skills' must be an array.");
    } else {
      skillsYaml.skills.forEach((skill, i) => {
        if (typeof skill !== "string" || !skill.trim()) {
          errors.push(`skills[${i}] must be a non-empty string.`);
        }
      });
    }
  }
  return errors;
}

// --- PATCH: update main validation logic ---
(function () {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, "..");
  const allErrors = [];
  // 1. Check required files exist
  const bulletPath = path.join(repoRoot, "data", "bullet-bank", "bullets.yaml");
  const profilePath = path.join(
    repoRoot,
    "data",
    "profile",
    "base-profile.yaml",
  );
  const expPath = path.join(repoRoot, "data", "experience", "experience.yaml");
  const skillsPath = path.join(repoRoot, "data", "skills", "skills.yaml");
  const variantsDir = path.join(repoRoot, "data", "cv-variants");
  const tagsPath = path.join(repoRoot, "data", "tags", "tags.yaml");
  if (!fs.existsSync(bulletPath)) allErrors.push(`Missing file: ${bulletPath}`);
  if (!fs.existsSync(profilePath))
    allErrors.push(`Missing file: ${profilePath}`);
  if (!fs.existsSync(expPath)) allErrors.push(`Missing file: ${expPath}`);
  if (!fs.existsSync(skillsPath)) allErrors.push(`Missing file: ${skillsPath}`);
  if (!fs.existsSync(variantsDir))
    allErrors.push(`Missing directory: ${variantsDir}`);
  if (!fs.existsSync(tagsPath)) allErrors.push(`Missing file: ${tagsPath}`);
  // Stop early if missing files
  if (allErrors.length > 0) {
    allErrors.forEach((err) => console.error(err));
    process.exit(1);
  }

  // 2. Validate tags.yaml
  let tagsYaml;
  try {
    tagsYaml = readYaml(tagsPath);
  } catch (e) {
    allErrors.push(`Error parsing tags.yaml: ${e}`);
  }
  if (
    !tagsYaml ||
    typeof tagsYaml !== "object" ||
    !Array.isArray(tagsYaml.tags)
  ) {
    allErrors.push("tags.yaml must contain a 'tags' array.");
  } else {
    const tagSet = new Set();
    tagsYaml.tags.forEach((tag, i) => {
      if (typeof tag !== "string" || !tag.trim()) {
        allErrors.push(`tags.yaml: tags[${i}] must be a non-empty string.`);
      } else if (tagSet.has(tag)) {
        allErrors.push(`tags.yaml: duplicate tag '${tag}'.`);
      } else {
        tagSet.add(tag);
      }
    });
  }
  // Collect allowed tags
  const allowedTags =
    tagsYaml && Array.isArray(tagsYaml.tags)
      ? new Set(tagsYaml.tags)
      : new Set();

  // 3. Validate bullets.yaml
  let bulletData, bullets;
  try {
    bulletData = readYaml(bulletPath);
    bullets = normalizeBullets(bulletData);
  } catch (e) {
    allErrors.push(`Error parsing bullets.yaml: ${e}`);
  }
  if (!bullets) allErrors.push("bullets.yaml is missing or not an array.");
  else {
    const bulletValidation = validateBullets(bullets);
    allErrors.push(...bulletValidation.errors);
  }

  // 4. Validate variants
  let variantFiles = [];
  try {
    variantFiles = fs
      .readdirSync(variantsDir)
      .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
  } catch (e) {
    allErrors.push(`Error reading variants dir: ${e}`);
  }
  if (!variantFiles.length) allErrors.push("No variant YAML files found.");
  // Collect all valid variant names
  const validVariants = new Set();
  const variantTagMap = {};
  for (const file of variantFiles) {
    const variantPath = path.join(variantsDir, file);
    let variant;
    try {
      variant = readYaml(variantPath);
    } catch (e) {
      allErrors.push(`Error parsing variant file ${file}: ${e}`);
      continue;
    }
    if (variant && typeof variant.variant === "string") {
      validVariants.add(variant.variant);
    }
    allErrors.push(...validateVariant(variant, file));
    // Collect tags for later tag validation
    if (variant && Array.isArray(variant.include_tags)) {
      variantTagMap[file] = [
        ...variant.include_tags,
        ...(Array.isArray(variant.exclude_tags) ? variant.exclude_tags : []),
      ];
    }
  }

  // 5. Validate applications
  const applicationsDir = path.join(repoRoot, "applications");
  const appTagMap = {};
  if (fs.existsSync(applicationsDir)) {
    const appFolders = fs
      .readdirSync(applicationsDir)
      .filter((f) => fs.statSync(path.join(applicationsDir, f)).isDirectory());
    for (const folder of appFolders) {
      const appPath = path.join(applicationsDir, folder);

      if (!validateApplicationFolder(appPath)) {
        allErrors.push(
          `Application folder '${folder}' failed folder structure validation.`,
        );
      }

      const tagsPath = path.join(appPath, "selected-tags.yaml");
      if (!fs.existsSync(tagsPath)) {
        allErrors.push(
          `Application folder '${folder}' is missing selected-tags.yaml.`,
        );
        continue;
      }
      let appConfig;
      try {
        appConfig = readYaml(tagsPath);
      } catch (e) {
        allErrors.push(`Error parsing selected-tags.yaml in '${folder}': ${e}`);
        continue;
      }
      if (!appConfig.variant || typeof appConfig.variant !== "string") {
        allErrors.push(
          `selected-tags.yaml in '${folder}' must contain a 'variant' string.`,
        );
        continue;
      }
      if (!validVariants.has(appConfig.variant)) {
        allErrors.push(
          `selected-tags.yaml in '${folder}' references unknown variant '${appConfig.variant}'.`,
        );
      }
      if (appConfig.tags && !Array.isArray(appConfig.tags)) {
        allErrors.push(
          `'tags' in selected-tags.yaml in '${folder}' must be an array if present.`,
        );
      }
      // Collect tags for later tag validation
      if (Array.isArray(appConfig.tags)) {
        appTagMap[folder] = appConfig.tags;
      }
    }
  }

  // 6. Collect all used tags and check against allowedTags
  // a) From bullets.yaml
  if (bullets) {
    bullets.forEach((b) => {
      if (Array.isArray(b.tags)) {
        b.tags.forEach((tag) => {
          if (!allowedTags.has(tag)) {
            allErrors.push(`Unknown tag in bullets.yaml:\n  ${b.id}: ${tag}`);
          }
        });
      }
    });
  }
  // b) From variants
  for (const [file, tags] of Object.entries(variantTagMap)) {
    tags.forEach((tag) => {
      if (!allowedTags.has(tag)) {
        allErrors.push(`Unknown tag in variant:\n  ${file}: ${tag}`);
      }
    });
  }
  // c) From applications
  for (const [folder, tags] of Object.entries(appTagMap)) {
    tags.forEach((tag) => {
      if (!allowedTags.has(tag)) {
        allErrors.push(`Unknown tag in application:\n  ${folder}: ${tag}`);
      }
    });
  }

  // 7. Validate profile
  let profile;
  try {
    profile = readYaml(profilePath);
  } catch (e) {
    allErrors.push(`Error parsing base-profile.yaml: ${e}`);
  }
  allErrors.push(...validateProfile(profile));
  // 8. Validate experience
  let exp;
  try {
    exp = readYaml(expPath);
  } catch (e) {
    allErrors.push(`Error parsing experience.yaml: ${e}`);
  }
  allErrors.push(...validateExperience(exp));
  // 9. Validate skills
  let skillsYaml;
  try {
    skillsYaml = readYaml(skillsPath);
  } catch (e) {
    allErrors.push(`Error parsing skills.yaml: ${e}`);
  }
  allErrors.push(...validateSkills(skillsYaml));
  // Output
  if (allErrors.length > 0) {
    console.error("Validation failed:");
    allErrors.forEach((err) => console.error(`- ${err}`));
    process.exit(1);
  }
  console.log("Validation passed.");
})();
