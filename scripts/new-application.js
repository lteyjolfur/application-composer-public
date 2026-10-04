#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { repoRoot } from "./lib/files.js";

function printUsage() {
  console.error("Usage: npm run new-app -- --name <company-role-slug>");
}

function isValidSlug(slug) {
  // Must be lowercase letters/numbers, separated by single hyphens, no leading/trailing/consecutive hyphens
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

// Parse args
let slug;
for (let i = 2; i < process.argv.length; i++) {
  let arg = process.argv[i];
  if (arg === "--name" && process.argv[i + 1]) {
    slug = process.argv[i + 1];
    break;
  } else if (arg.startsWith("--name=")) {
    slug = arg.slice("--name=".length);
    break;
  }
}
slug = slug ? slug.trim().toLowerCase() : null;

if (!slug) {
  printUsage();
  process.exit(1);
}

if (!isValidSlug(slug)) {
  console.error(
    "Error: Slug must contain only lowercase letters, numbers, and hyphens.",
  );
  process.exit(1);
}

const applicationsDir = path.join(repoRoot, "applications");
const appDir = path.join(applicationsDir, slug);
if (fs.existsSync(appDir)) {
  console.error(`Error: Folder applications/${slug} already exists.`);
  process.exit(1);
}
// Ensure applications/ exists
if (!fs.existsSync(applicationsDir)) {
  fs.mkdirSync(applicationsDir);
}
fs.mkdirSync(appDir);

const files = [
  {
    name: "job-ad.md",
    content: "# Job Ad\n\nPaste the job ad here.\n",
  },
  {
    name: "notes.md",
    content: "# Notes\n\nAdd application notes here.\n",
  },
  {
    name: "selected-tags.yaml",
    content: "variant: fullstack\ntags: []\n",
  },
  {
    name: "cv.md",
    content:
      "# Generated CV\n\nRun:\n\n    npm run assemble -- --application " +
      slug +
      "\n",
  },
  {
    name: "cover-letter.md",
    content: "# Cover Letter\n\nDraft or generated cover letter goes here.\n",
  },
];

const created = [];
for (const file of files) {
  const filePath = path.join(appDir, file.name);
  if (fs.existsSync(filePath)) {
    console.error(`Error: File ${filePath} already exists. Aborting.`);
    process.exit(1);
  }
  fs.writeFileSync(filePath, file.content);
  created.push(`applications/${slug}/${file.name}`);
}

console.log("Created:");
for (const f of created) {
  console.log("  " + f);
}
console.log("Edit tags and run:");
console.log(`npm run assemble -- --application ${slug}`);
