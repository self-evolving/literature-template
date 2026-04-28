# Sepo documentation site

This repository contains the Quartz shell and generated content for the Sepo documentation site on Vercel.

The documentation source of truth stays in the product repository:

- `self-evolving/repo:README.md`
- `self-evolving/repo:.agent/docs/**`

Synchronization happens in GitHub Actions in this repository. The workflow checks out `self-evolving/repo`, runs `scripts/sync-source-docs.mjs`, commits the generated `content/**` files back to this repository, and then Vercel deploys the updated `repo-docs` commit.

Vercel only builds this repository. It does not need access to `self-evolving/repo`.

## Local development

From this repository:

```bash
npm ci
npm run sync:source-docs -- ../sepo
npx quartz build --serve
```

Use a different source checkout by passing its path:

```bash
npm run sync:source-docs -- /path/to/self-evolving/repo
```

## Vercel configuration

Import `self-evolving/repo-docs` into Vercel with:

- Framework preset: **Other**
- Install command: `npm ci`
- Build command: `npx quartz build`
- Output directory: `public`

These are also captured in `vercel.json`.

Recommended Vercel environment variable:

| Name       | Value                                                                                 |
| ---------- | ------------------------------------------------------------------------------------- |
| `SITE_URL` | Production domain without protocol, e.g. `docs.example.com` or `repo-docs.vercel.app` |

## Source sync configuration

The `Sync source docs` GitHub Actions workflow refreshes `content/**` on:

- manual `workflow_dispatch`,
- a 15-minute polling schedule,
- optional `repository_dispatch` with type `source-docs-updated`.

If `self-evolving/repo` is private, add a `SOURCE_REPO_TOKEN` secret to **this** repository (`self-evolving/repo-docs`). Use a fine-grained personal access token or GitHub App token with read-only Contents access to `self-evolving/repo`.

The workflow needs `contents: write` so it can commit synchronized docs back to `repo-docs`. If commits fail, enable read/write workflow permissions in this repository's Actions settings.
