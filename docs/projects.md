---
layout: page
title: Projects
permalink: /projects/
---

## Application Composer

A local, file-based CV and cover letter composer. Candidate facts live in YAML,
reusable achievements in a tagged bullet bank, and each job application in its
own folder. Small Node.js scripts select the most relevant bullets for a role,
assemble a Markdown CV, and export it to PDF with Pandoc and WeasyPrint.

![Example CV page rendered from fictional sample data]({{ "/assets/example-cv.png" | relative_url }})

*Example output, rendered from fictional sample data.*

- **Stack:** Node.js, YAML, Markdown, Pandoc, WeasyPrint, Vitest, GitHub Actions
- **Source:** [github.com/lteyjolfur/application-composer-public](https://github.com/lteyjolfur/application-composer-public)
