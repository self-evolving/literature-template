---
title: Sepo Docs
socialDescription: Documentation for Sepo, a GitHub-native agent runtime for self-evolving repositories.
---

This site is generated from [`self-evolving/repo`](https://github.com/self-evolving/repo).

During CI, the docs site syncs the source repository's root `README.md` and `.agent/docs/` directory into this Quartz content folder before building.

For local development, run:

```bash
npm run sync:source-docs -- ../sepo
npx quartz build --serve
```
