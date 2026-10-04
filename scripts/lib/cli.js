// scripts/lib/cli.js
// Shared command-line parsing for the build scripts.
import fs from "fs";
import path from "path";
import { repoRoot, readYaml } from "./files.js";

export const applicationsDir = path.join(repoRoot, "applications");

// Value of `--name value` or `--name=value`, or undefined when absent.
export function getArg(argv, name) {
  const flag = `--${name}`;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === flag) {
      const next = argv[i + 1];
      return next !== undefined && !next.startsWith("--") ? next : undefined;
    }
    if (argv[i].startsWith(`${flag}=`)) return argv[i].slice(flag.length + 1);
  }
  return undefined;
}

function parseTagList(value) {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// A file or folder name from the command line must be one plain name, so
// `--application ../x` or `--template a/b` cannot reach outside its folder.
// Returns the name without trailing slashes (as tab completion adds them).
export function toPlainName(rawName, label) {
  const name = typeof rawName === "string" ? rawName.replace(/[\\/]+$/, "") : rawName;
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name === "." ||
    name === ".." ||
    name !== path.basename(name) ||
    /[\\/]/.test(name)
  ) {
    throw new Error(`Invalid ${label} '${rawName}': use a single folder or file name.`);
  }
  return name;
}

export function getApplicationDir(rawName) {
  const applicationName = toPlainName(rawName, "application name");
  const appDir = path.join(applicationsDir, applicationName);
  if (!fs.existsSync(appDir)) {
    throw new Error(`Application folder not found: applications/${applicationName}`);
  }
  return appDir;
}

function readApplicationConfig(appDir) {
  const tagsPath = path.join(appDir, "selected-tags.yaml");
  if (!fs.existsSync(tagsPath)) {
    throw new Error(`Missing selected-tags.yaml in application folder: ${tagsPath}`);
  }
  let config;
  try {
    config = readYaml(tagsPath);
  } catch (e) {
    throw new Error(`Error parsing selected-tags.yaml: ${e.message}`, { cause: e });
  }
  if (!config?.variant || typeof config.variant !== "string") {
    throw new Error("selected-tags.yaml must contain a 'variant' string.");
  }
  for (const key of ["tags", "exclude_tags"]) {
    if (config[key] && !Array.isArray(config[key])) {
      throw new Error(`'${key}' in selected-tags.yaml must be an array if present.`);
    }
  }
  return {
    variantName: config.variant,
    tags: config.tags || [],
    excludeTags: config.exclude_tags || [],
  };
}

// Resolve what to build from `--application <folder>` or
// `--variant <name> [--tags a,b] [--exclude-tags c,d]`.
// The application config wins when both are given.
export function resolveBuildTarget(argv, usage) {
  const rawApplication = getArg(argv, "application");

  if (rawApplication) {
    const applicationName = toPlainName(rawApplication, "application name");
    if (getArg(argv, "variant") !== undefined) {
      console.warn("Warning: --variant is ignored when --application is provided.");
    }
    const appDir = getApplicationDir(applicationName);
    const { variantName, tags, excludeTags } = readApplicationConfig(appDir);
    return {
      applicationName,
      variantName,
      tags,
      excludeTags,
      outputPath: path.join(appDir, "cv.md"),
    };
  }

  const rawVariant = getArg(argv, "variant");
  if (!rawVariant) throw new Error(usage);
  const variantName = toPlainName(rawVariant, "variant name");

  const tagsArg = getArg(argv, "tags");
  const excludeArg = getArg(argv, "exclude-tags");
  const outputDir = path.join(repoRoot, "output");
  fs.mkdirSync(outputDir, { recursive: true });
  return {
    applicationName: undefined,
    variantName,
    tags: tagsArg ? parseTagList(tagsArg) : [],
    excludeTags: excludeArg ? parseTagList(excludeArg) : [],
    outputPath: path.join(outputDir, `${variantName}.md`),
  };
}
