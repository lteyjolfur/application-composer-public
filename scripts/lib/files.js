// scripts/lib/files.js
// Shared file helpers: repo root, YAML reading, and stylesheet paths.
import fs from "fs";
import path from "path";
import yaml from "yaml";
import { fileURLToPath } from "url";

export const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export function readYaml(filePath) {
  return yaml.parse(fs.readFileSync(filePath, "utf8"));
}

// Relative path from a generated Markdown file's folder to a root stylesheet,
// as Pandoc needs it for --css.
export function getCssPath(outputPath, cssFile = "style.css") {
  const relative = path.relative(
    path.dirname(outputPath),
    path.join(repoRoot, cssFile),
  );
  return relative || cssFile;
}
