---
layout: post
title: "Tailoring CVs with tagged bullets and plain files"
description: "How Application Composer selects, validates, and exports a CV per job application from YAML and Markdown."
tags: [node, yaml, tooling]
---

[Application Composer](https://github.com/lteyjolfur/application-composer-public)
builds a tailored CV and cover letter for each job application from YAML and
Markdown, with small Node.js scripts and no database or network calls.

![A CV page generated from fictional sample data]({{ "/assets/example-cv.png" | relative_url }})

## Data model

- `data/` holds the reusable facts: profile, work history, skills, and a bullet
  bank of achievements, each with tags.
- `data/cv-variants/` defines variants (frontend, fullstack, ...) as tag lists.
- `applications/<slug>/` holds one job: the ad, notes, a config, and the
  generated CV and letter.

```yaml
# applications/acme-frontend/selected-tags.yaml
company: Acme
role: Frontend Developer
variant: frontend
tags: [react]
exclude_tags: [payments]
pin: [design-system-migration]
cv_sections: [profile, experience, skills]
```

## Bullet selection

1. Pinned bullets are included first.
2. Other bullets score the sum of their matching tags; some tags weigh more.
   Bullets with an excluded tag are dropped.
3. Section quotas (experience, impact, leadership) balance the mix, and a cap
   keeps the CV short.
4. Near-duplicates are skipped: if one normalized text contains another, the
   higher-scoring bullet wins.

Each bullet can name the job it belongs to, so it renders under that role; jobs
with no selected bullets fall back to static ones.

The algorithm is intentionally simple: every selection can be explained from the
tags, and fixing a bad result means editing a bullet or a tag.

## Validation

`npm run validate` checks all files and reports every problem at once: unknown
tags, duplicate ids, missing pinned bullets, bullets linked to unknown jobs,
invalid section names. JSON Schemas give the same feedback in VS Code while
editing.

`npm run export` runs Pandoc and WeasyPrint, and refuses to produce a PDF while
placeholders such as `<COMPANY_MOTIVATION>` or `[EXAMPLE]` text remain.

## Tests

Vitest covers selection, validation, CLI parsing, and formatting. Integration
tests assemble a full CV from a fictional fixture data set, so they don't depend
on the real data in `data/`. Tests target observable behavior; tests that only
pinned internals or known limitations were removed.
