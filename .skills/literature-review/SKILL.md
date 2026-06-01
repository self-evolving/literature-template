---
name: literature-review
description: Conduct a systematic research literature review using agent-papers-cli and related source discovery. Use for surveys, bibliographies, state-of-the-field reviews, or focused topic tracking that should cover research items beyond papers, including blog posts, GitHub repositories, docs/releases, datasets, benchmarks, and optional social discovery signals.
argument-hint: [topic]
allowed-tools: Bash, Read, Glob, Grep, Write
---

Conduct a systematic review on the user's requested topic. Use the repo-local setup script if `paper` or `paper-search` is missing:

```bash
.skills/literature-review/setup.sh
```

The setup installs the pinned `agent-papers-cli` version and runs non-secret smoke checks. Search and browse commands may need `SERPER_API_KEY`, `S2_API_KEY`, or `JINA_API_KEY` in the shell environment.

## Scope

Define the review scope before searching:

- Topic boundaries and excluded areas
- Default year range, normally the last five years unless the topic needs seminal work
- Target communities, venues, organizations, repositories, datasets, or benchmarks
- Desired number of core research items
- Source mix: papers, blog posts, GitHub repositories, docs/releases, datasets, benchmarks, and optional tweets/threads

If the user did not provide scope constraints, make reasonable assumptions and state them briefly in the final report.

## Search Plan

Use several query variants to improve coverage. Track queries and deduplicate by title, DOI/arXiv ID, URL, or repository owner/name.

```bash
paper-search semanticscholar papers "<main query>" --limit 20 --year <range>
paper-search semanticscholar papers "<synonym query>" --limit 20 --year <range>
paper-search google scholar "<topic>"
paper-search google web "<topic> blog OR release OR benchmark OR dataset OR github"
gh search repos "<topic>" --limit 20
```

Use PubMed for biomedical topics:

```bash
paper-search pubmed "<query>" --limit 20
```

## Triage

For each candidate research item, capture:

- Type: `paper`, `blogpost`, `github_repo`, `docs_release`, `dataset`, `benchmark`, or `tweet_thread`
- Canonical URL and source
- Date or year
- Relevance: high, medium, low
- Reason for inclusion or exclusion
- Relationship to other items, such as code for a paper or benchmark used by several papers

Prefer primary sources. Treat social posts as discovery hints unless corroborated by papers, repos, docs, datasets, or benchmark pages.

## Deep Review

For high-relevance papers:

```bash
paper outline <arxiv_id_or_pdf>
paper skim <arxiv_id_or_pdf> --lines 2
paper read <arxiv_id_or_pdf> introduction
paper read <arxiv_id_or_pdf> method
paper read <arxiv_id_or_pdf> results
paper read <arxiv_id_or_pdf> conclusion
paper-search semanticscholar citations <paper_id> --limit 20
paper-search semanticscholar references <paper_id> --limit 20
```

For non-paper primary sources:

```bash
paper-search browse <url>
gh repo view <owner/repo> --json nameWithOwner,description,url,stargazerCount,pushedAt,defaultBranchRef
gh release list --repo <owner/repo> --limit 5
```

Record problem, method or artifact, evidence, limitations, adoption or impact signals, and open questions.

## Report

Organize the final review by theme, not by individual item. Include:

- Scope and search assumptions
- Research-item table with type-aware metadata
- Key themes and points of agreement
- Contradictions or weak evidence
- Gaps and future directions
- Reference list with URLs and paper IDs
- BibTeX entries for cited papers when useful

Use this table shape for the candidate set or final shortlist:

| Type | Title / Item | URL | Source | Date / Year | Why it matters | Relevance | Follow-up |
| ---- | ------------ | --- | ------ | ----------- | -------------- | --------- | --------- |
