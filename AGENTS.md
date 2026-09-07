# AGENTS.md

## Instructions for AI Agents

- Keep all data local and file-based (YAML, JSON, Markdown)
- Never introduce cloud dependencies or external databases
- Maintain clear separation:
  - `data/profile/` for base profile data
  - `data/experience/` for work history
  - `data/skills/` for skills
  - `data/cv-variants/` for CV templates/variants (YAML config only)
  - `data/cover-templates/` for reusable cover letter templates
  - `data/bullet-bank/` for reusable bullet points (YAML)
- Scripts and logic go in `scripts/`
- Output CVs go in `output/`
- Prefer explicit, readable files over clever abstractions
- Bullet-bank and job-ad matching logic is allowed from Phase 2+
- Bullet selection for variants is tag-based (see below)
- Never replace validation with a stub or success-only implementation. Validation must fail on invalid data.
- Always keep the repo easy to edit in VS Code

### Bullet Bank Conventions

- All bullets are stored in `data/bullet-bank/bullets.yaml` as YAML objects with `text` and `tags`.
- Tags are simple strings (e.g., `frontend`, `leadership`, `performance`).
- To add a bullet, edit `bullets.yaml` and add a new entry.

### CV Variant Conventions

- Each variant is a YAML file in `data/cv-variants/` (e.g., `frontend-focused.yaml`).
- Variants specify which bullet tags to include (and optionally exclude).
- To attach a bullet to a variant, add the tag to the variant's `include_tags`.

### Scripts

- `npm run validate` — Validate all source data (bullets, variants)
- `npm run build -- --variant <variant>` — Build a CV for a variant

### Output

- Built CVs are written to `output/<variant>.md`
