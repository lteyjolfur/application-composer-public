# Application Composer

A local, file-based CV and cover letter composer for software developer job applications.

The project is intentionally simple: YAML and Markdown source files, small Node.js scripts, and generated Markdown/HTML/PDF outputs. There is no UI, database, or cloud dependency.

## What It Is For

Use this repo to tailor applications quickly while keeping the underlying CV data easy to inspect and edit in VS Code. The included variants are reusable examples; choose, edit, or add variants that match your own background and target roles.

## Project Structure

- `data/profile/` - Base profile, education, languages, and contact data
- `data/experience/` - Work history
- `data/skills/` - Skills grouped for CV output
- `data/tags/` - Allowed tag list used by bullets, variants, and applications
- `data/bullet-bank/` - Reusable CV bullets
- `data/cv-variants/` - Variant configs such as frontend, fullstack, leadership, and test automation
- `data/cover-templates/` - Reusable cover letter templates
- `applications/` - Job-specific application folders
- `output/` - General variant CV output
- `scripts/` - Build, validation, scaffolding, and formatting logic
- `style.css` - CV HTML/PDF styling
- `cover.css` - Cover letter HTML/PDF styling

## Personalize This Repository

Before creating an application, replace all text marked `Example`, `Your`,
`Replace`, or `EXAMPLE` with your own factual information:

1. Add contact details, a professional summary, and languages in `data/profile/base-profile.yaml`.
2. Add education in `data/profile/education.yaml`.
3. Add work history in `data/experience/experience.yaml`.
4. Add your actual skills in `data/skills/skills.yaml`.
5. Replace the sample achievements in `data/bullet-bank/bullets.yaml`. Every bullet should be true and defensible in an interview.
6. Adapt the reusable text in `data/cover-templates/` and replace its angle-bracket placeholders when preparing a letter.
7. Review `data/cv-variants/` and `data/tags/tags.yaml` so selection reflects your target roles and experience.

Reusable candidate facts belong under `data/profile/`, `data/experience/`,
`data/skills/`, and `data/bullet-bank/`. Reusable wording and selection rules
belong under `data/cover-templates/` and `data/cv-variants/`. Each individual
job advertisement, its tailoring notes, and generated application documents
belong in a separate directory under `applications/`.

Install dependencies and verify your edits:

```sh
npm install
npm run validate
```

## Scripts

- `npm run validate` - Validate source data, tags, variants, and application folder structure
- `npm run lint` - Lint the scripts with ESLint
- `npm run new-app -- --name <company-role-slug>` - Create a new application folder
- `npm run assemble -- --application <folder>` - Build a complete CV for an application
- `npm run assemble -- --variant <variant>` - Build a complete CV for a variant into `output/`
- `npm run build -- --variant <variant>` - Build a minimal bullet-only CV variant
- `npm run prepare-cover -- --application <folder> --template <template>` - Generate a cover letter from a template

## Common Workflow

Create a new application:

```sh
npm run new-app -- --name example-role
```

Then:

1. Paste the job ad into `applications/example-role/job-ad.md`.
2. Add any notes or research to `applications/example-role/notes.md`.
3. Edit `applications/example-role/selected-tags.yaml`.
4. Build the CV:

```sh
npm run assemble -- --application example-role
```

5. Generate a cover letter:

```sh
npm run prepare-cover -- --application example-role --template frontend
```

6. Review and manually edit `cv.md` and `cover-letter.md`.
7. Export to HTML/PDF if needed.

## Application Folders

Each folder under `applications/` is one job application.

Source files:

- `job-ad.md` - Pasted job ad for traceability
- `notes.md` - Research, recruiter notes, interview prep, or tailoring notes
- `selected-tags.yaml` - Variant and extra tag selection
- `cv.md` - Generated or edited CV Markdown
- `cover-letter.md` - Generated or edited cover letter Markdown

Generated export files may also exist in application folders, usually as `.html` and `.pdf`.

Application folders other than `applications/test-app/` are gitignored because
they contain personal data, and so are generated `.html` and `.pdf` exports.

Example:

```text
applications/
  example-company-example-role/
    job-ad.md
    notes.md
    selected-tags.yaml
    cv.md
    cover-letter.md
    Your_Name_Example_Company_Example_Role_CV.html
    Your_Name_Example_Company_Example_Role_CV.pdf
```

Example `selected-tags.yaml`:

```yaml
variant: fullstack
tags:
  - authentication
  - payments
```

If both `--application` and `--variant` are passed to `assemble` or `build`, the application config wins.

## CV Variants

Variants live in `data/cv-variants/*.yaml`.

Each variant has:

- `variant` - The CLI name, such as `frontend`, `fullstack`, `leadership`, or `testautomation`
- `include_tags` - Tags used to select bullets
- `exclude_tags` - Tags that disqualify matching bullets

Example:

```yaml
variant: frontend
include_tags:
  - frontend
  - react
  - performance
  - reliability
exclude_tags: []
```

## Bullet Bank

Reusable bullets live in `data/bullet-bank/bullets.yaml`.

Each bullet should have:

- `id` - Stable unique identifier
- `text` - CV bullet text
- `tags` - Selection tags
- `section` - Optional section, usually `experience`, `impact`, or `leadership`

Example:

```yaml
- id: example-frontend-performance
  text: >
    [EXAMPLE — replace or remove] Describe a frontend improvement and its measurable result.
  tags:
    - frontend
    - react
    - performance
    - reliability
```

All tags used by bullets, variants, or applications must be declared in `data/tags/tags.yaml`.

## Bullet Selection

The selection logic is in `scripts/lib/selection.js`.

Current behavior:

- Tags from the selected variant and application are combined.
- Bullets are scored by matching tags.
- Some tags have higher weight, including `integration`, `backend`, `authentication`, and `payments`.
- The output is capped at a small number of bullets.
- Bullets are grouped into `experience`, `impact`, and `leadership` sections.
- Similar duplicate bullets are skipped.

This is intentionally simple and inspectable. Prefer improving bullet quality and tags before adding complex selection logic.

## Cover Letters

Cover templates live in `data/cover-templates/`.

Available templates include:

- `base`
- `frontend`
- `fullstack`
- `leadership`
- `test-automation`

Generate a cover letter:

```sh
npm run prepare-cover -- --application example-role --template frontend
```

The script prepends the profile header and refuses to overwrite a cover letter that already has real content.

## Validation

Run:

```sh
npm run validate
```

Validation checks:

- Required source files exist
- YAML parses correctly
- Bullet IDs are present and unique
- Bullet text and tags are valid
- Variants have valid names and include tags
- Application folders contain required files
- Application selected variants exist
- Tags used by bullets, variants, and applications exist in `data/tags/tags.yaml`
- Profile, experience, and skills have the required shape

Generated `.html` and `.pdf` exports are allowed alongside the core source files in application folders.

## Exporting HTML And PDF

The project generates Markdown by default. HTML and PDF export are handled with external CLI tools.

Recommended tools:

- Pandoc - Converts Markdown to HTML
- WeasyPrint - Converts HTML to PDF

Install on macOS:

```sh
brew install pandoc
brew install weasyprint
```

Example CV export:

```sh
pandoc applications/example-role/cv.md \
  -o applications/example-role/cv.html \
  --css=../../style.css \
  --standalone

weasyprint applications/example-role/cv.html \
  applications/example-role/cv.pdf
```

Example cover letter export:

```sh
pandoc applications/example-role/cover-letter.md \
  -o applications/example-role/cover-letter.html \
  --css=../../style.css \
  --css=../../cover.css \
  --standalone

weasyprint applications/example-role/cover-letter.html \
  applications/example-role/cover-letter.pdf
```

The `assemble` and `prepare-cover` scripts print ready-to-run export commands after writing Markdown.

## Troubleshooting

If the PDF looks unstyled:

- Check that the generated HTML links to the correct CSS path.
- From `applications/<name>/cv.html`, the relative path to root `style.css` is `../../style.css`.
- Cover letters should include both `../../style.css` and `../../cover.css`.

If Pandoc PDF export fails with LaTeX errors:

- Use the Markdown to HTML to WeasyPrint flow shown above.
- Direct Pandoc-to-PDF export uses LaTeX by default and is not required.

If validation reports unknown tags:

- Add the tag to `data/tags/tags.yaml`, or replace it with an existing tag.
- Keep tags simple and selection-oriented.

## Maintenance Notes

- Keep all data local and file-based.
- Keep source data easy to read and edit manually.
- Prefer explicit files over clever abstractions.
- Do not replace validation with a success-only stub.
- Every bullet should be defensible in an interview.
- Improve content quality before adding more automation.

## Next Improvements

- Expand the bullet bank for frontend, fullstack, leadership, and test automation variants.
- Tune scoring and section limits only after the source bullets are strong.
- Add optional pinned bullets per variant or application if manual control becomes too repetitive.
