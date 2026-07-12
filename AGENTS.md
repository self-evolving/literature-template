# Agent Instructions

This repository is a literature template with shipped example content.

When implementing a user-requested change that adapts the template for a real
project, remove the existing example notes and replace them with content that
follows the user's requirements. Do not keep the shipped placeholder notes
(`content/papers/vaswani2017attention.md`, `devlin2019bert.md`,
`brown2020language.md`, and the `content/notes/` examples) unless the user
explicitly asks to preserve them.

Keep the related literature files in sync with the replacement, including
`bibliography.bib`, `content/papers/`, `content/notes/`, and the `_meta.json`
navigation manifests when those files are affected.

## Working Locally

- The local site (`npm run dev`) renders **this repository's** `content/` —
  paper notes under `content/papers/` and synthesis notes under
  `content/notes/`. A checkout of another project outside this repo will
  never appear on the site.
- Paper notes are keyed by BibTeX citekey: the note filename, its `citekey`
  frontmatter, and the `bibliography.bib` entry must match, and `@citekey`
  references in markdown resolve against `bibliography.bib`.
- Folder listing order is controlled by `_meta.json` manifests; list new
  pages there when adding content.

## Pull Requests

For user-submitted pull requests, add the `agent/review` label or comment
`@sepo-agent /review` on the PR to launch a Sepo review. Add the `sepo-preview`
label to request a preview deployment for a non-agent PR.

## Literature Work

For paper imports, surveys, and reviews, use the repository skills under
`.skills/` — the routing lives here, not in the request:

- **Import or host a paper** (arXiv, LaTeX, PDF/HTML, DOI, review-style
  source): read `.skills/paper-to-site/SKILL.md` first and follow its import
  workflow, frontmatter conventions, and layout guidance.
- **Systematic reviews, surveys, bibliographies, topic tracking**: use
  `.skills/literature-review/SKILL.md`.
- **Broad research briefs** covering sources beyond papers (blog posts,
  repositories, datasets, benchmarks): use `.skills/deep-research/SKILL.md`.

Adding a single paper can also run through the `Agent / Add Paper` workflow
(manual dispatch with a URL, arXiv ID, DOI, title, PDF, or BibTeX entry), and
the `Agent / Daily Literature` workflow posts research updates to Discussions
when enabled.

Mutating work — importing papers, editing notes, changing the bibliography —
should go through the normal Sepo `/implement` workflow so changes are
verified and proposed by PR. To discuss or scope work first, use `/answer`
(or a plain `@sepo-agent` mention) and switch to `/implement` when ready to
dispatch.
