# AGENTS.md

Local, file-based CV and cover letter composer. Workflow, data formats, and
commands: `README.md`. Candidate priorities: `PROJECT.md`. Scripts: `package.json`.

## Content is factual

Every achievement, metric, employer, date, and skill in a CV or cover letter
comes from the candidate's data files or from the user. Where a fact is
missing, leave a visible placeholder (`<LIKE_THIS>`) and ask the user.

This repo is a public template: committed content stays generic and marked
(`Your Name`, `[EXAMPLE — replace or remove]`). Real candidate data and real
applications stay out of commits.

## Where things go

Follow the layout in README → "Personalize This Repository". The one rule that
is easy to get wrong: candidate facts live in `data/`, and anything specific to
one job (ad, notes, generated CV and letter) lives in `applications/<slug>/`.

## Tags

`data/tags/tags.yaml` is the allow-list for every tag used in
`data/bullet-bank/bullets.yaml`, `data/cv-variants/*.yaml`, and
`applications/*/selected-tags.yaml`. When you add or rename a tag anywhere,
update `tags.yaml` in the same change.

## Generated files

`npm run assemble -- --application <slug>` and `npm run build -- --application <slug>`
overwrite that application's `cv.md`. Ask the user before regenerating an
application whose `cv.md` has hand edits. `prepare-cover` already protects an
edited `cover-letter.md`.

## Code style

- Store data as local YAML, JSON, or Markdown that a person can edit by hand.
  Dependencies are local npm packages; the tool runs fully offline.
- Write explicit files and plain functions in `scripts/` (shared helpers in
  `scripts/lib/`).
- `scripts/validate.js` exists to reject bad data. When you add a field or a
  file type, add a check that fails on invalid input.

## Commits

Write commit messages and PR titles as Conventional Commits
(`fix(cli): ...`, `docs: ...`). Types, scopes, and how they map to version
bumps: README → "Commits And Versioning".

## Done means

- `npm run validate` exits 0 after any change to `data/` or `scripts/`.
- `npm test` and `npm run lint` pass after any change to `scripts/` or `test/`.
  New or changed behavior in `scripts/` gets a test in `test/`.
- After a script change, run the affected command against
  `applications/test-app` (or `--variant <name>`) and read the output.
