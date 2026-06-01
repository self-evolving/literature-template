"use strict";
// CLI: create or reuse the tracking issue for a manual release prepare run.
// Usage: node .agent/dist/cli/prepare-release.js
// Env: GITHUB_REPOSITORY, VERSION, REQUESTED_BY, RUNNER_TEMP
// Outputs: issue_number, issue_url, request_text, version
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_crypto_1 = require("node:crypto");
const github_js_1 = require("../github.js");
const output_js_1 = require("../output.js");
const release_version_js_1 = require("../release-version.js");
function normalizeVersion(raw) {
    const value = raw.trim();
    return value ? (0, release_version_js_1.parseReleaseVersion)(value).version : "";
}
function issueTitle(version) {
    return version ? `Prepare Sepo release ${version}` : "Prepare next Sepo release";
}
function issueBody(version, requestedBy) {
    const request = version
        ? `Prepare the Sepo ${version} release pull request.`
        : "Determine and prepare the next Sepo release pull request.";
    return [
        "## Goal",
        request,
        "",
        "## Acceptance criteria",
        "- Keep `.agent/package.json` as the canonical Sepo package/runtime version.",
        "- Validate the release version against `.agent/docs/technical-details/versioning.md`.",
        "- Update `.agent/package-lock.json` if package metadata changes require it.",
        "- Update `.agent/CHANGELOG.md` with release notes for the version.",
        "- Update docs or checklist content changed by this release.",
        "- Open a pull request.",
        "- Do not create git tags, GitHub Releases, or package publications.",
        "",
        `Requested by: ${requestedBy || "workflow_dispatch"}`,
        "",
        `<!-- sepo-agent-release-prepare version:${version || "next"} -->`,
    ].join("\n");
}
function requestText(version) {
    return version
        ? `Prepare the Sepo ${version} release pull request.`
        : "Determine and prepare the next Sepo release pull request.";
}
function findOpenIssue(repo, title) {
    const raw = (0, github_js_1.gh)([
        "issue",
        "list",
        "--repo",
        repo,
        "--state",
        "open",
        "--search",
        title,
        "--json",
        "number,title,url",
    ]);
    const issues = JSON.parse(raw);
    return issues.find((issue) => issue.title === title && issue.number && issue.url) || null;
}
function createReleaseIssue(repo, title, version, requestedBy) {
    const runnerTemp = process.env.RUNNER_TEMP || "/tmp";
    const bodyFile = (0, node_path_1.join)(runnerTemp, `release-prepare-${(0, node_crypto_1.randomBytes)(8).toString("hex")}.md`);
    (0, node_fs_1.writeFileSync)(bodyFile, issueBody(version, requestedBy) + "\n", "utf8");
    const url = (0, github_js_1.createIssue)({ title, bodyFile, repo });
    const numberMatch = url.match(/\/issues\/(\d+)$/);
    if (!numberMatch) {
        console.error(`Could not parse created release prepare issue number from URL: ${url || "(empty)"}`);
        process.exitCode = 1;
        return null;
    }
    return { number: Number.parseInt(numberMatch[1], 10), title, url };
}
const repo = process.env.GITHUB_REPOSITORY || "";
const requestedBy = process.env.REQUESTED_BY || "";
const version = normalizeVersion(process.env.VERSION || "");
if (!repo) {
    console.error("Missing required env: GITHUB_REPOSITORY");
    process.exitCode = 2;
}
else {
    const title = issueTitle(version);
    const existing = findOpenIssue(repo, title);
    const issue = existing || createReleaseIssue(repo, title, version, requestedBy);
    if (issue) {
        (0, output_js_1.setOutput)("issue_number", String(issue.number || ""));
        (0, output_js_1.setOutput)("issue_url", issue.url || "");
        (0, output_js_1.setOutput)("issue_action", existing ? "reused" : "created");
        (0, output_js_1.setOutput)("request_text", requestText(version));
        (0, output_js_1.setOutput)("version", version);
        console.log(`${existing ? "Reused" : "Created"} release prepare issue: ${issue.url}`);
    }
}
//# sourceMappingURL=prepare-release.js.map