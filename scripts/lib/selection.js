// scripts/lib/selection.js
// Shared bullet selection logic for build.js and assemble.js
import fs from "fs";
import path from "path";
import yaml from "yaml";

export const SECTION_ORDER = ["experience", "impact", "leadership"];

// bullets.yaml may be a top-level array or an object with a `bullets` array.
export function normalizeBullets(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.bullets)) return data.bullets;
  return null;
}

export function loadBullets(repoRoot) {
  const bulletPath = path.join(repoRoot, "data/bullet-bank/bullets.yaml");
  const bullets = normalizeBullets(
    yaml.parse(fs.readFileSync(bulletPath, "utf8")),
  );
  if (!bullets) {
    throw new Error(
      "bullets.yaml must be an array or an object with a bullets array. Run npm run validate.",
    );
  }
  for (const b of bullets) {
    if (b?.section !== undefined && !SECTION_ORDER.includes(b.section)) {
      throw new Error(
        `Bullet '${b.id}' has unknown section '${b.section}'. Allowed: ${SECTION_ORDER.join(", ")}.`,
      );
    }
  }
  return bullets;
}

export function loadVariant(repoRoot, variantName) {
  const variantsDir = path.join(repoRoot, "data/cv-variants");
  const files = fs.readdirSync(variantsDir).filter((f) => f.endsWith(".yaml"));
  for (const f of files) {
    const variant = yaml.parse(
      fs.readFileSync(path.join(variantsDir, f), "utf8"),
    );
    if (variant.variant === variantName) return variant;
  }
  throw new Error(`Variant not found: ${variantName}`);
}

const MAX_BULLETS = 4;
const TAG_WEIGHTS = {
  integration: 2,
  backend: 2,
  authentication: 2,
  payments: 2,
};

const SECTION_LIMITS = {
  experience: 2,
  impact: 1,
  leadership: 1,
};

function normalize(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, "");
}

function isDuplicate(text, selected) {
  const norm = normalize(text);
  return selected.some((b) => {
    const existing = normalize(b.text);
    return existing.includes(norm) || norm.includes(existing);
  });
}

export function selectBullets(bullets, effectiveTags, excludeTags = []) {
  const excluded = new Set(excludeTags);
  const scored = bullets.map((b, index) => {
    let score = 0;
    for (const tag of b.tags) {
      if (effectiveTags.includes(tag)) {
        score += TAG_WEIGHTS[tag] || 1;
      }
    }
    return {
      ...b,
      score,
      index,
      section: b.section || "experience",
    };
  });

  const sorted = scored
    .filter((b) => b.score > 0 && !b.tags.some((tag) => excluded.has(tag)))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const selected = [];
  const sectionCounts = {
    experience: 0,
    impact: 0,
    leadership: 0,
  };

  // PASS 1: respect section limits
  for (const b of sorted) {
    if (selected.length >= MAX_BULLETS) break;
    if (!SECTION_LIMITS[b.section]) continue;
    if (sectionCounts[b.section] >= SECTION_LIMITS[b.section]) continue;
    if (isDuplicate(b.text, selected)) continue;
    selected.push(b);
    sectionCounts[b.section]++;
  }

  // PASS 2: fill remaining slots ignoring section limits
  for (const b of sorted) {
    if (selected.length >= MAX_BULLETS) break;
    if (selected.some((s) => s.id === b.id)) continue;
    if (isDuplicate(b.text, selected)) continue;
    selected.push(b);
  }

  return selected;
}
