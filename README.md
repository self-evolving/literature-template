# Literature notes template

This repository is a minimal Quartz + Sepo template for maintaining a literature site.

The site keeps durable content directly in this repository:

- `content/papers/` — consolidated notes for individual papers.
- `content/notes/` — synthesis notes that connect papers around topics, methods, or research questions.
- `bibliography.bib` — BibTeX entries referenced by paper notes.

Transient review streams are intentionally not stored as Markdown. The intended direction is to render GitHub-hosted discussions, issues, or comments directly in the site in a future component, similar in spirit to how Giscus embeds GitHub Discussions.

## Content model

### Paper notes

Paper notes live under `content/papers/` and should include citation-oriented frontmatter:

```yaml
---
title: "Paper title"
type: paper
citekey: author2026paper
authors:
  - First Author
year: 2026
venue: Example Venue
url:
doi:
status: unread
tags:
  - paper
---
```

Quartz's citations plugin does **not** read `citekey` frontmatter directly. The `citekey` field is a template convention for humans, agents, and future tooling to match a paper note to an entry in `bibliography.bib`.

Markdown citations such as `[@author2026paper]` render from the matching BibTeX entry. Links to paper-note pages should still use normal internal links. When you want both a paper-note link and an academic citation, write them together:

```md
[Paper title](../papers/paper-slug.md) [@author2026paper]
```

### Synthesis notes

Synthesis notes live under `content/notes/` and capture topic-level understanding across papers:

```yaml
---
title: "Topic or synthesis title"
type: note
tags:
  - synthesis
---
```

A synthesis note should link back to the relevant paper notes and make the relationship between papers explicit.

## Local development

Use Node `22.x`:

```bash
npm ci
npx quartz plugin restore
npm run dev
```

Useful commands:

```bash
npm run check
npm run build
```

`npm run dev` serves the Quartz site locally. `npm run build` writes the static site to `public/`.

## Vercel configuration

Import the repository into Vercel with:

- Framework preset: **Other**
- Install command: `npm ci`
- Build command: `npx quartz plugin restore && npx quartz build`
- Output directory: `public`

These settings are also captured in `vercel.json`.

Recommended Vercel environment variable:

| Name       | Value                                                                               |
| ---------- | ----------------------------------------------------------------------------------- |
| `SITE_URL` | Production domain without protocol, e.g. `literature.example.com` or a Vercel host. |

## Comments and GitHub-backed surfaces

Giscus comments are disabled by default. To enable them, set `GISCUS_ENABLED=true` and provide all required Giscus identifiers:

| Name                 | Description                                       |
| -------------------- | ------------------------------------------------- |
| `GISCUS_REPO`        | Repository that hosts GitHub Discussions.         |
| `GISCUS_REPO_ID`     | Giscus repository ID.                             |
| `GISCUS_CATEGORY`    | Discussion category name.                         |
| `GISCUS_CATEGORY_ID` | Giscus category ID.                               |
| `GISCUS_MAPPING`     | Optional mapping; defaults to `pathname`.         |
| `GISCUS_THEME_URL`   | Optional theme base URL for custom Giscus themes. |

This is separate from the future transient-review surface described in issue #65, which should render GitHub content directly rather than committing transient Markdown files.

## Sepo controls

Sepo workflows can be paused without disabling GitHub Actions globally by setting the repository variable `AGENT_ENABLED=false`. Remove the variable or set it to `true` to allow packaged `agent-*.yml` jobs to run again.
