// scripts/lib/selection.js
// Shared bullet selection logic for build.js and assemble.js
import fs from "fs";
import path from "path";
import { readYaml } from "./files.js";

export const SECTION_ORDER = ["experience", "impact", "leadership"];

// bullets.yaml may be a top-level array or an object with a `bullets` array.
export function normalizeBullets(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.bullets)) return data.bullets;
  return null;
}

export function loadBullets(repoRoot) {
  const bulletPath = path.join(repoRoot, "data/bullet-bank/bullets.yaml");
  const bullets = normalizeBullets(readYaml(bulletPath));
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
  const files = fs.readdirSync(variantsDir).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
  for (const f of files) {
    const variant = readYaml(path.join(variantsDir, f));
    if (variant.variant === variantName) return variant;
  }
  throw new Error(`Variant not found: ${variantName}`);
}

// Combine a variant's tags and pins with extra ones from an application or the CLI.
// Excluded tags win: a tag in both lists is removed from the include list.
export function resolveTags(variant, { tags = [], excludeTags = [], pin = [] } = {}) {
  const exclude = [...new Set([...(variant.exclude_tags || []), ...excludeTags])];
  const excluded = new Set(exclude);
  const include = [...new Set([...(variant.include_tags || []), ...tags])].filter(
    (tag) => !excluded.has(tag),
  );
  return { include, exclude, pin: [...new Set([...(variant.pin || []), ...pin])] };
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
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isDuplicate(text, selected) {
  const norm = normalize(text);
  return selected.some((b) => {
    const existing = normalize(b.text);
    return existing.includes(norm) || norm.includes(existing);
  });
}

// Pinned bullets (by id) come first, regardless of tags, exclusions, or the cap.
// Remaining slots are filled by score.
export function selectBullets(bullets, effectiveTags, excludeTags = [], pinnedIds = []) {
  const byId = new Map(bullets.map((b) => [b.id, b]));
  const unknown = pinnedIds.filter((id) => !byId.has(id));
  if (unknown.length) {
    throw new Error(`Pinned bullet id not found in bullets.yaml: ${unknown.join(", ")}.`);
  }
  const pinned = new Set(pinnedIds);
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
    .filter((b) => !pinned.has(b.id))
    .filter((b) => b.score > 0 && !b.tags.some((tag) => excluded.has(tag)))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const selected = pinnedIds.map((id) => scored.find((b) => b.id === id));
  const sectionCounts = Object.fromEntries(SECTION_ORDER.map((s) => [s, 0]));
  for (const b of selected) sectionCounts[b.section]++;

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
