"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runOnboardingCheck = runOnboardingCheck;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const github_js_1 = require("./github.js");
const trigger_labels_js_1 = require("./trigger-labels.js");
const ONBOARDING_TITLE = "Sepo setup check";
const COMMENT_MARKER = "<!-- sepo-agent-onboarding-check -->";
function apiPath(repo, suffix) {
    return `repos/${repo}/${suffix}`;
}
function branchExists(repo, branch) {
    const ref = branch.trim();
    if (!ref)
        return false;
    const output = (0, github_js_1.gh)([
        "api",
        apiPath(repo, `git/matching-refs/heads/${ref}`),
        "--jq",
        ".[].ref",
    ]);
    return output.split(/\r?\n/).some((line) => line.trim() === `refs/heads/${ref}`);
}
function findExistingOnboardingIssue(repo) {
    const output = (0, github_js_1.gh)([
        "issue",
        "list",
        "--repo",
        repo,
        "--state",
        "open",
        "--search",
        `${JSON.stringify(ONBOARDING_TITLE)} in:title`,
        "--json",
        "number,title",
    ]);
    const issues = JSON.parse(output);
    return issues.find((issue) => issue.title === ONBOARDING_TITLE) ?? null;
}
function createOnboardingIssue(opts) {
    const bodyFile = writeOnboardingIssueBody(opts);
    const issueUrl = (0, github_js_1.createIssue)({ title: ONBOARDING_TITLE, bodyFile, repo: opts.repo });
    const match = issueUrl.match(/(\d+)$/);
    if (!match) {
        throw new Error(`Could not parse issue number from ${issueUrl}`);
    }
    return Number.parseInt(match[1], 10);
}
function updateOnboardingIssueBody(opts, issueNumber) {
    const bodyFile = writeOnboardingIssueBody(opts);
    (0, github_js_1.gh)(["issue", "edit", String(issueNumber), "--repo", opts.repo, "--body-file", bodyFile]);
}
function findOnboardingComment(repo, issueNumber) {
    const output = (0, github_js_1.gh)([
        "api",
        apiPath(repo, `issues/${issueNumber}/comments`),
    ]);
    const comments = JSON.parse(output);
    return comments.find((comment) => comment.body.includes(COMMENT_MARKER)) ?? null;
}
function updateIssueComment(repo, commentId, body) {
    (0, github_js_1.gh)([
        "api",
        "-X",
        "PATCH",
        apiPath(repo, `issues/comments/${commentId}`),
        "-f",
        `body=${body}`,
    ]);
}
function issueBody() {
    return `Use this issue to track Sepo setup for this repository.

The latest setup status is maintained in the comment below.
`;
}
function writeOnboardingIssueBody(opts) {
    const bodyFile = (0, node_path_1.join)(opts.runnerTemp, `sepo-onboarding-${(0, node_crypto_1.randomBytes)(8).toString("hex")}.md`);
    (0, node_fs_1.writeFileSync)(bodyFile, issueBody(), "utf8");
    return bodyFile;
}
function authStatusBody(authMode) {
    const resolvedMode = authMode.trim();
    if (resolvedMode) {
        return `- [x] GitHub App/auth: resolved via \`${resolvedMode}\``;
    }
    return [
        "- [ ] GitHub App/auth: not resolved",
        "  - Install the Sepo GitHub App or configure a supported auth path.",
    ].join("\n");
}
function credentialNames(opts) {
    const names = [];
    if (opts.openaiConfigured)
        names.push("`OPENAI_API_KEY`");
    if (opts.claudeConfigured)
        names.push("`CLAUDE_CODE_OAUTH_TOKEN`");
    return names;
}
function andList(items) {
    if (items.length <= 1)
        return items[0] || "";
    return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
function providerDetailBody(opts) {
    const provider = opts.provider.trim();
    if (!provider)
        return [];
    const reason = opts.providerReason.trim();
    return [`  - Agent provider: \`${provider}\`${reason ? ` (${reason})` : ""}`];
}
function modelStatusBody(opts) {
    const names = credentialNames(opts);
    if (names.length === 0) {
        return [
            "- [ ] Model credentials: not configured",
            "  - Add `OPENAI_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN` as a repository secret.",
            "  - Optional: configure `AGENT_DEFAULT_PROVIDER`.",
            ...providerDetailBody(opts),
        ].join("\n");
    }
    return [
        `- [x] Model credentials: ${andList(names)} configured`,
        ...providerDetailBody(opts),
    ].join("\n");
}
function branchStatusBody(label, ref, ready, actionName, optional = false) {
    if (ready) {
        return `- [x] ${label}: initialized (\`${ref}\`)`;
    }
    const prefix = optional ? "Optional: run" : "Run";
    return [
        `- [ ] ${label}: not initialized`,
        `  - ${prefix} **Actions > ${actionName}**.`,
    ].join("\n");
}
function remainingSetupBody(opts, memoryReady, rubricsReady) {
    const items = [];
    if (!opts.authMode.trim()) {
        items.push("Resolve GitHub App/auth.");
    }
    if (credentialNames(opts).length === 0) {
        items.push("Configure one model provider credential.");
    }
    if (!memoryReady) {
        items.push(`Initialize memory branch \`${opts.memoryRef}\`.`);
    }
    if (!rubricsReady) {
        items.push(`Optional: initialize rubrics branch \`${opts.rubricsRef}\`.`);
    }
    if (items.length === 0) {
        return "- [x] Required setup is complete.";
    }
    return items.map((item) => `- [ ] ${item}`).join("\n");
}
function checklistBody(opts, memoryReady, rubricsReady) {
    return `${COMMENT_MARKER}
## Sepo setup status

### Current status

${authStatusBody(opts.authMode)}
${modelStatusBody(opts)}
${branchStatusBody("Memory", opts.memoryRef, memoryReady, "Agent / Memory / Initialization")}
${branchStatusBody("Rubrics", opts.rubricsRef, rubricsReady, "Agent / Rubrics / Initialization", true)}

### Remaining setup

${remainingSetupBody(opts, memoryReady, rubricsReady)}

### Test Sepo

After setup, try:

\`\`\`md
@sepo-agent /answer Is Sepo configured correctly in this repository?
\`\`\`

Try implementation:

\`\`\`md
@sepo-agent /implement Create a small README update that verifies the agent can open a PR.
\`\`\`

On an open pull request:

\`\`\`md
@sepo-agent /review
\`\`\`

Last checked: ${opts.runUrl || "GitHub Actions"}
`;
}
function runOnboardingCheck(opts) {
    for (const label of trigger_labels_js_1.BUILT_IN_TRIGGER_LABELS) {
        (0, github_js_1.ensureLabel)({
            name: label.name,
            color: label.color,
            description: label.description,
            repo: opts.repo,
        });
    }
    const memoryReady = branchExists(opts.repo, opts.memoryRef);
    const rubricsReady = branchExists(opts.repo, opts.rubricsRef);
    const existingIssue = findExistingOnboardingIssue(opts.repo);
    const issueNumber = existingIssue?.number ?? createOnboardingIssue(opts);
    if (existingIssue) {
        updateOnboardingIssueBody(opts, issueNumber);
    }
    const body = checklistBody(opts, memoryReady, rubricsReady);
    const existingComment = findOnboardingComment(opts.repo, issueNumber);
    if (existingComment) {
        updateIssueComment(opts.repo, existingComment.id, body);
    }
    else {
        (0, github_js_1.postIssueComment)(issueNumber, body, opts.repo);
    }
    return issueNumber;
}
//# sourceMappingURL=onboarding.js.map