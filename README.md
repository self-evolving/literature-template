# Sepo documentation site

This repository contains the Quartz shell for the Sepo documentation site published from `self-evolving/repo` on Vercel.

The documentation source of truth stays in the product repository:

- `README.md`
- `.agent/docs/**`

The Vercel build checks out `self-evolving/repo`, runs `scripts/sync-source-docs.mjs`, and builds Quartz from the synchronized `content/` directory. This keeps the large Quartz site out of the source repository while avoiding manual copy/paste drift.

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

To test the Vercel build path locally:

```bash
SOURCE_REPO_TOKEN=<read-only token if source repo is private> npm run vercel-build
```

## Vercel configuration

Import `self-evolving/repo-docs` into Vercel with:

- Framework preset: **Other**
- Install command: `npm ci`
- Build command: `npm run vercel-build`
- Output directory: `public`

These are also captured in `vercel.json`.

Set Vercel environment variables:

| Name                | Required                                | Value                                                                                 |
| ------------------- | --------------------------------------- | ------------------------------------------------------------------------------------- |
| `SOURCE_REPO_TOKEN` | Yes, if `self-evolving/repo` is private | Fine-grained token with read-only Contents access to `self-evolving/repo`             |
| `SOURCE_REPOSITORY` | Optional                                | Defaults to `self-evolving/repo`                                                      |
| `SOURCE_REF`        | Optional                                | Defaults to `main`                                                                    |
| `SITE_URL`          | Recommended                             | Production domain without protocol, e.g. `docs.example.com` or `repo-docs.vercel.app` |

## Refresh behavior

Vercel automatically deploys when this docs-shell repository changes. It does not automatically know when only `self-evolving/repo` changes.

No workflow is required in `self-evolving/repo`. For source-only docs changes, create a Vercel Deploy Hook and add it to this repository as the `VERCEL_DEPLOY_HOOK_URL` Actions secret. The `Refresh Vercel deployment` workflow calls that hook hourly and can also be run manually.

If the deploy hook secret is not configured, the refresh workflow exits successfully without doing anything. In that case, use Vercel's manual **Redeploy** button when source-only docs change.
