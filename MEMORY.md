# Memory

## Durable
- Paper imports: host full text under content/<paper-slug>/; reserve content/papers/ for cited/reference notes. [[github/self-evolving/literature-template/issue-4.json]]
- Paper imports: use frontmatter title only, rewrite LaTeX labels descriptively, and avoid backlink-polluting nav links. [[github/self-evolving/literature-template/pull-7.json]]
- Hypothesis site embed: keep browser-only/build-time; no API tokens or agent fetching in site PRs. [[github/self-evolving/literature-template/pull-10.json]]
- Hypothesis agent fetching belongs in .agent callable tooling; literature skills only teach when/how to use it. [[github/self-evolving/literature-template/issue-8.json]]
- Footer attribution should jointly credit Quartz and Sepo; Sepo links to https://self-evolving.app. [[github/self-evolving/literature-template/pull-6.json]]
- Preview workflow_run teardown must pass PR/head/artifact identity or document the service-side identity contract. [[github/self-evolving/literature-template/pull-14.json]]
- Quartz plugin restores: normal builds use enabled-only; disabled plugins stay in config/lockfile for opt-in. [[github/self-evolving/literature-template/pull-16.json]]
- Preview workflows: ignored label events must not cancel live deploy runs; scope concurrency to jobs or actions that actually deploy. [[github/self-evolving/literature-template/issue-13.json]]
