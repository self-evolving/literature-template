---
name: site-branch-install
description: Install the literature site as an orphan branch inside an existing repository — host project stays on the default branch, the Quartz/Sepo site lives on a dedicated branch with its own build, preview, and canonical-deploy workflows. Use when a repository wants a hosted literature site without adding Node tooling to its main tree.
argument-hint: "[site branch name, default: literature]"
allowed-tools: Bash, Read, Glob, Grep, Write, Edit
---

# Site-branch install

Plant the literature-template site on an orphan branch of the current
repository. After install:

- the **default branch** keeps the host project untouched except for the
  Sepo agent surface (`.github` agent workflows + `.agent`), which reacts
  to issues and comments repo-wide;
- the **site branch** (default name `literature`) carries the full site
  tree — Quartz, `content/`, `bibliography.bib`, and only the site
  workflows (validate, per-PR preview, canonical deploy), each scoped to
  the branch;
- literature work dispatched through Sepo lands as PRs **into the site
  branch** because `resolve-implementation-base` falls back to the
  `SEPO_SITE_BRANCH` repository variable.

## Preconditions

1. The Sepo agent layer must already be installed on the default branch
   (`.agent/` and `.github/workflows/agent-entrypoint.yml` exist). If not,
   stop and route the user through the normal `@sepo-agent /install`
   onboarding first.
2. The requested site branch must not already exist.

## Procedure

1. **Fetch the template.** Shallow-clone
   `https://github.com/self-evolving/literature-template` at `main` into a
   temp directory. Never copy its `.git`.
2. **Create the orphan branch.** In the host repository:
   `git checkout --orphan <site-branch>` and clear the index and worktree
   (`git rm -rf .` on the empty index). Copy the template tree onto it,
   **excluding** the agent-routing surface, which belongs to the default
   branch only:
   - drop `.github/workflows/agent-*.yml` **except**
     `agent-site-preview.yml` and `agent-deploy-site-main.yml`
   - drop `.github/prompts/` and `.github/ISSUE_TEMPLATE/`
   - keep everything else, including `.agent/` and `.github/actions/`
     (the preview and deploy workflows run the runtime's deployment CLIs
     from the checked-out branch) and `.skills/` (add-paper runs execute
     skill setup from the checked-out tree).
3. **Scope the deploy workflows to the branch.** On the site branch edit:
   - `agent-deploy-site-main.yml`: the push trigger `branches: [main]`
     becomes `branches: [<site-branch>]`; the job guard
     `github.ref == 'refs/heads/main'` becomes
     `github.ref == 'refs/heads/<site-branch>'`; rename the workflow
     "Agent / Deploy Site (<site-branch>)".
   - `deploy.yml` (validation) needs no branch scoping — it runs on
     `workflow_dispatch`.
   - `agent-site-preview.yml` needs no change: `pull_request` events run
     the copy on the PR's base branch, so it only fires for PRs into the
     site branch.
4. **Site identity.** Set `pageTitle`/`baseUrl` in `quartz.config.yaml`
   per the user's request; replace the shipped placeholder notes only if
   the user provided starting content (the normal template-adaptation rule
   applies on the site branch).
5. **Validate.** On the site branch: `npm ci`, `npm run check`,
   `npm run build`. Fix what they surface.
6. **Wire the routing.** Set the repository variable
   `SEPO_SITE_BRANCH=<site-branch>` (`gh variable set SEPO_SITE_BRANCH`).
   If the token cannot set variables, report the exact command for the
   user to run — the install is not functional until it is set.
7. **Dependabot.** If the host has `.github/dependabot.yml` on the default
   branch, add `target-branch: <site-branch>` entries for the site
   branch's npm and github-actions ecosystems; otherwise note it as a
   follow-up.
8. **Publish.** Push the site branch. The branch-scoped canonical deploy
   publishes the site; report its URL. Ensure the `sepo-preview` and
   `agent/review` labels exist so PR previews and reviews can be
   requested.

## Caveats to report to the user

- With `SEPO_SITE_BRANCH` set, **all** `/implement` and add-paper
  dispatches default their base to the site branch; host-project work
  through Sepo needs an explicit `base_branch`. Label-based routing is a
  future refinement.
- The agent layer on the default branch and the site plumbing on the site
  branch update independently (`update-agent` covers the former; the site
  branch re-syncs from literature-template).
- An orphan branch cannot be opened as a PR against the default branch;
  the install is the branch push itself. Propose default-branch changes
  (dependabot, docs pointers) as a normal PR.
