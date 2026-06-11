# Literature notes template

This repository is a minimal Quartz + Sepo template for maintaining a literature site.

The site keeps durable content directly in this repository:

- `content/papers/` — consolidated notes for individual papers.
- `content/notes/` — synthesis notes that connect papers around topics, methods, or research questions.
- `bibliography.bib` — BibTeX entries referenced by paper notes.

Transient review streams are intentionally not stored as Markdown. The intended direction is to render GitHub-hosted discussions, issues, or comments directly in the site in a future component, similar in spirit to how Giscus embeds GitHub Discussions.

## Content model

### Paper notes

Paper notes live under `content/papers/`. Name each paper note after its BibTeX citekey:

```text
content/papers/author2026paper.md
```

Each paper note should include citation-oriented frontmatter:

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

Use the `paper` tag as a lightweight type hint. Graph tag nodes stay hidden by default; the template uses this hint together with the `content/papers/` path to render paper page nodes differently from synthesis notes.

Markdown citations such as `[@author2026paper]` still render from the matching BibTeX entry in `bibliography.bib`. The local literature-citations layer then checks whether `content/papers/author2026paper.md` exists. If it does, the rendered citation link opens that paper note and uses Quartz's normal internal-link popover.

The `citekey` frontmatter should match the filename for readability and future validation, but the filename is the canonical citation-to-note mapping. If no matching paper note exists, Quartz keeps the default bibliography-link behavior.

### Synthesis notes

Synthesis notes live under `content/notes/` and capture topic-level understanding across papers:

```yaml
---
title: "Topic or synthesis title"
type: note
tags:
  - note
  - synthesis
---
```

Use the `note` tag as the corresponding lightweight type tag for durable synthesis notes. Additional topical tags such as `synthesis`, `methods`, or `evaluation` are optional.

A synthesis note should link back to the relevant paper notes and make the relationship between papers explicit.

### Navigation manifests and folder ordering

The left navigation is driven by `_meta.json` files next to your notes. Every folder under `content/` that contains Markdown should have a `_meta.json` manifest with a human-readable `label` and a `pages` array of child slugs.

For example, after adding `content/papers/new-paper.md`, add its slug without `.md` to `content/papers/_meta.json`:

```json
{
  "label": "Papers",
  "pages": ["vaswani2017attention", "devlin2019bert", "brown2020language", "new-paper"]
}
```

Folder listing pages follow the nearest `_meta.json` `pages` array when it exists. For example, `content/notes/_meta.json` controls the order shown on `/notes/`:

```json
{
  "label": "Notes",
  "pages": ["example-topic", "attention-patterns"]
}
```

Entries should omit `.md`. Folder index pages are implicit: keep `index.md` in the folder, but do not list `"index"` in `pages`. For nested folders, add the folder slug to the parent manifest and give the nested folder its own `_meta.json`. Pages not listed in `_meta.json` fall back to the default folder-page sort.

### Graph paper styling

The graph keeps tag nodes hidden by default, but it uses lightweight type hints to style paper nodes differently from synthesis notes:

- paper notes include `paper` and live under `content/papers/`
- synthesis notes include `note` and live under `content/notes/`

When a note cites or links to a paper page, the paper node appears as a same-size hollow circle with an accent outline. This keeps the graph focused on pages while still making cited papers visually distinct.

## Local development

Use Node `22.x`:

```bash
npm ci
npm run install-plugins
npm run dev
```

Useful commands:

```bash
npm run check
npm run check:site
npm run build
```

`npm run check` runs the fast TypeScript and formatting checks. `npm run check:site` also
restores enabled Quartz plugins and builds the static site. `npm run dev` serves the Quartz site
locally. `npm run build` restores enabled Quartz plugins and writes the static site to `public/`.
Disabled plugins remain in the config/lockfile for easy opt-in, but they are not restored during
normal builds.

## Vercel configuration

Import the repository into Vercel with:

- Framework preset: **Other**
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `public`

These settings are also captured in `vercel.json`.

Recommended Vercel environment variable:

| Name       | Value                                                                               |
| ---------- | ----------------------------------------------------------------------------------- |
| `SITE_URL` | Production domain without protocol, e.g. `literature.example.com` or a Vercel host. |

## Comments and GitHub-backed surfaces

Giscus comments are disabled by default. To enable them, set `GISCUS_ENABLED=true` and provide all required Giscus identifiers:

| Name                  | Description                                              |
| --------------------- | -------------------------------------------------------- |
| `GISCUS_REPO`         | Repository that hosts GitHub Discussions.                |
| `GISCUS_REPO_ID`      | Giscus repository ID.                                    |
| `GISCUS_CATEGORY`     | Discussion category name.                                |
| `GISCUS_CATEGORY_ID`  | Giscus category ID.                                      |
| `GISCUS_APP_HOST`     | Absolute http(s) URL of the Sepo comments service host.  |
| `GISCUS_MAPPING`      | Optional mapping; defaults to `pathname`.                |
| `GISCUS_LIGHT_THEME`  | Optional widget theme name in light mode; `sepo_light`.  |
| `GISCUS_DARK_THEME`   | Optional widget theme name in dark mode; `sepo_dark`.    |
| `GISCUS_TRIGGER_MODE` | Optional trigger style, `pill` or `bot`; default `pill`. |
| `GISCUS_TABS`         | Optional drawer tabs from `discussions,issues,pulls`.    |
| `GISCUS_DEFAULT_TAB`  | Optional tab shown on load; defaults to the first tab.   |
| `GISCUS_CONTENT_REPO` | Optional repo browsed by the issues/pulls tabs.          |
| `SEPO_PREVIEW_PR`     | PR number baked into preview builds; opens that PR tab.  |
| `SEPO_PREVIEW_BRANCH` | Optional branch label shown in the preview pill.         |
| `SEPO_PREVIEW_DOMAIN` | Preview apex override; `localhost` simulates locally.    |
| `SEPO_PREVIEW_API`    | Preview registry override for the deployment switcher.   |

`GISCUS_APP_HOST` defaults to the Sepo-operated `https://comment-api.sepo-preview.xyz` and must be an absolute http(s) URL (the build fails otherwise). The host must serve the Sepo embed runtime (`sepo.js`) — plain upstream `https://giscus.app` is not sufficient since the drawer ships from the service; use a local checkout of `self-evolving/comment-api` (e.g. `http://localhost:3000`) for development.

`SEPO_PREVIEW_BRANCH` and `SEPO_PREVIEW_DOMAIN` are forwarded verbatim: validation and escaping happen at the service boundary in `sepo.js`, which gates all preview behavior on the deployment hostname and HTML-escapes the branch label at its render sink.

When enabled, the site loads the drawer experience from the Sepo comments service (`sepo.js` on `GISCUS_APP_HOST`): a fixed trigger opens a right-side page discussion drawer instead of taking space at the bottom of the note. The drawer chrome, mascot animation, and the `sepo_light`/`sepo_dark` widget themes are all served by that host, so the template no longer vendors them; the site's own light/dark toggle drives the widget theme. The GitHub Discussion still maps to the page according to `GISCUS_MAPPING`.

The drawer can show extra read-only tabs served by the Sepo comments service: set `GISCUS_TABS=discussions,issues,pulls` to let readers browse the site repository's issues and pull requests next to the page discussion. `GISCUS_CONTENT_REPO` points those tabs at the site's source repository when it differs from `GISCUS_REPO` (which hosts the Discussions). On per-branch preview deployments, baking `SEPO_PREVIEW_PR=<number>` into the build makes the drawer open directly on that pull request's conversation (unless `GISCUS_DEFAULT_TAB` says otherwise).

For local testing, the public `self-evolving/repo-discussions` repository can host the Discussions. These identifiers are public Giscus configuration, not secrets:

```bash
GISCUS_ENABLED=true \
GISCUS_REPO=self-evolving/repo-discussions \
GISCUS_REPO_ID=R_kgDOSjgnjQ \
GISCUS_CATEGORY=General \
GISCUS_CATEGORY_ID=DIC_kwDOSjgnjc4C9gaF \
npm run dev
```

Hypothesis web annotations are also disabled by default. To let readers annotate rendered pages,
set the repository or hosting build variable `HYPOTHESIS_ENABLED=true`.

```bash
gh variable set HYPOTHESIS_ENABLED --body true --repo OWNER/REPO
```

Optional build-time variables:

| Name                          | Description                                                    |
| ----------------------------- | -------------------------------------------------------------- |
| `HYPOTHESIS_OPEN_SIDEBAR`     | Open the Hypothesis sidebar by default; defaults to `false`.   |
| `HYPOTHESIS_SHOW_HIGHLIGHTS`  | Show public highlights by default; defaults to `true`.         |
| `HYPOTHESIS_COMMENTS_MODE`    | Use Hypothesis page-note comments mode; defaults to `false`.   |
| `HYPOTHESIS_GROUPS_ALLOWLIST` | Optional comma-separated list of allowed Hypothesis group IDs. |
| `HYPOTHESIS_THEME`            | Optional Hypothesis sidebar theme, `classic` or `clean`.       |

Do not put a Hypothesis API token in browser-side configuration. Site visitors should use
Hypothesis' normal login flow. Agent-facing Hypothesis API access should be added separately as a
Sepo runtime capability rather than as a site build setting.

This is separate from the future transient-review surface described in issue #65, which should render GitHub content directly rather than committing transient Markdown files.

## Literature workflows

This template includes two opt-in Sepo literature workflows adapted from `self-evolving/literature`:

- `Agent / Daily Literature` (`.github/workflows/agent-literature-daily.yml`) researches recent papers and posts a GitHub Discussion. The Discussion body uses mobile-friendly item cards instead of a giant table, and each item is posted as its own top-level Discussion comment so follow-up can happen per paper/source.
- `Agent / Add Paper` (`.github/workflows/agent-add-paper.yml`) accepts a paper URL, arXiv ID, DOI, title, PDF URL, or BibTeX entry, plus an optional natural-language additional request such as which synthesis note to update. It opens a PR that updates `bibliography.bib` plus the matching `content/papers/` note.

Both workflows use the `agent-literature` GitHub Environment for research-tool secrets:

```bash
gh secret set SERPER_API_KEY --env agent-literature --repo OWNER/REPO
gh secret set S2_API_KEY --env agent-literature --repo OWNER/REPO
gh secret set JINA_API_KEY --env agent-literature --repo OWNER/REPO
```

Manual dispatch is available by default. Scheduled daily literature runs are disabled unless the repository variable `AGENT_LITERATURE_DAILY_ENABLED=true` is set.

## Preview deployments

Pull requests can deploy a per-branch preview of the built site through the Sepo preview server, via `.github/workflows/agent-site-preview.yml`. The workflow builds the site, uploads it as an artifact, and asks the server (`preview-api.sepo.sh`) to publish it, authenticating with GitHub Actions **OIDC** so no deploy secrets live in the repository. The preview URL is published as a GitHub Deployment status, so the pull request timeline shows a bot-authored `deployed to Preview` event with a `View deployment` button instead of a generated preview comment. The workflow uses the resolved Sepo auth token for that event when it can create deployments, then falls back to `GITHUB_TOKEN`; the preview is torn down, and matching preview deployments are marked inactive, when the pull request closes.

Which pull requests preview is controlled by the `AGENT_PREVIEW_POLICY` repository variable, whose default is keyed to repository visibility:

| `AGENT_PREVIEW_POLICY`   | Public repo | Private repo |
| ------------------------ | ----------- | ------------ |
| unset / `auto` (default) | preview     | **off**      |
| `all`                    | preview     | preview      |
| `off`                    | off         | off          |

Preview URLs are **public** (served by Surge with no authentication), so a private repository does not publish its built site unless you opt in explicitly. **This template is private, so previews stay off until you set `AGENT_PREVIEW_POLICY=all`:**

```bash
gh variable set AGENT_PREVIEW_POLICY --body all --repo OWNER/REPO
```

Within an enabled repository:

- Every **agent** pull request (head branch under `agent/`) previews automatically — no label needed.
- Add the `sepo-preview` label to preview any other **same-repo** pull request. Fork pull requests are never previewed (they cannot mint OIDC tokens).
- Add the `no-preview` label to skip a pull request that would otherwise preview.

Label and policy changes affect **future** deploys only — they do not retract a preview that is already live. To take a live preview down, **close the pull request** (teardown runs on close). This requires the Sepo GitHub App on the repository (it mints a short-lived, read-only token to fetch the build artifact).

If this repository is also connected to a platform that builds its own pull-request previews — for example, Vercel's Git integration auto-deploys every PR — enable only one of them to avoid two preview URLs per pull request. Set `AGENT_PREVIEW_POLICY=off` to defer to that platform, or disable the platform's preview deployments to let Sepo own them. Sepo previews and production hosting do not otherwise interfere: Sepo only deploys PR previews to `*.surge.sh` and never touches the production deploy of the default branch. Sepo previews are most useful where the repository has no built-in PR previews (such as GitHub Pages) or where you want one consistent preview across many repositories.

## Sepo controls

Sepo workflows can be paused without disabling GitHub Actions globally by setting the repository variable `AGENT_ENABLED=false`. Remove the variable or set it to `true` to allow packaged `agent-*.yml` jobs to run again.
