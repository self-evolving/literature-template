# Sepo documentation site

This repository contains the Quartz shell for the Sepo documentation site published from `self-evolving/repo`.

The documentation source of truth stays in the product repository:

- `README.md`
- `.agent/docs/**`

The GitHub Pages workflow in this repository checks out `self-evolving/repo`, runs `scripts/sync-source-docs.mjs`, and builds Quartz from the synchronized `content/` directory. This keeps the large Quartz site out of the source repository while avoiding manual copy/paste drift.

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

## Refresh behavior

The deploy workflow refreshes docs on:

- pushes to this docs repository,
- manual `workflow_dispatch`,
- a 15-minute polling schedule,
- optional `repository_dispatch` with type `source-docs-updated`.

No workflow is required in `self-evolving/repo`. The scheduled run checks out the latest `self-evolving/repo@main` and rebuilds the Pages artifact from that source. Use manual `workflow_dispatch` in this repository when you need an immediate refresh before the next scheduled poll.

If source-repository changes ever need to publish instantly, an external webhook, GitHub App, or source-repository workflow can send the optional `source-docs-updated` dispatch event to this repository, but polling is the default synchronization mechanism.
