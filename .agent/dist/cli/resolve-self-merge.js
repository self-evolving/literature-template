"use strict";
// CLI: preflight and perform deterministic self-merge for an approved PR.
// Env: GITHUB_REPOSITORY, TARGET_NUMBER, TARGET_KIND, AGENT_ALLOW_SELF_MERGE
// Outputs: conclusion, merged, auto_merge_enabled, status_post, reason, body_file
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const github_js_1 = require("../github.js");
const output_js_1 = require("../output.js");
const self_approval_js_1 = require("../self-approval.js");
const self_merge_js_1 = require("../self-merge.js");
function writeBodyFile(body) {
    const dir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "sepo-self-merge-"));
    const file = (0, node_path_1.join)(dir, "body.md");
    (0, node_fs_1.writeFileSync)(file, body, "utf8");
    return file;
}
function currentRunUrl() {
    const server = process.env.GITHUB_SERVER_URL || "";
    const repo = process.env.GITHUB_REPOSITORY || "";
    const runId = process.env.GITHUB_RUN_ID || "";
    return server && repo && runId ? `${server}/${repo}/actions/runs/${runId}` : "";
}
function errorText(err) {
    const record = err;
    return [record.message, record.stderr, record.stdout]
        .map((part) => {
        if (Buffer.isBuffer(part))
            return part.toString("utf8");
        return typeof part === "string" ? part : "";
    })
        .filter(Boolean)
        .join("\n") || String(err);
}
function normalizeTargetKind(value) {
    return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}
const repo = process.env.GITHUB_REPOSITORY || "";
const prNumber = Number(process.env.TARGET_NUMBER || process.env.PR_NUMBER || "");
const targetKind = process.env.TARGET_KIND || "pull_request";
const allowSelfMerge = (0, self_approval_js_1.envFlagEnabled)(process.env.AGENT_ALLOW_SELF_MERGE);
function resolveCurrentSelfMerge() {
    if (!allowSelfMerge || normalizeTargetKind(targetKind) !== "pull_request" || !repo || !prNumber) {
        return {
            verifiedHeadSha: "",
            result: (0, self_merge_js_1.resolveSelfMerge)({
                allowSelfMerge,
                targetKind,
                prState: "",
                isDraft: false,
                currentHeadSha: "",
                reviewDecision: "",
                mergeStateStatus: "",
                mergeable: "",
                statusChecks: [],
                approval: {
                    approved: false,
                    approvedHeadSha: "",
                    reason: repo && prNumber ? "missing current-head self-approval" : "missing pull request target",
                },
            }),
        };
    }
    try {
        const meta = (0, github_js_1.fetchPrMergeMeta)(prNumber, repo);
        let approval;
        try {
            approval = (0, self_merge_js_1.evaluateSelfMergeApproval)({
                reviews: (0, github_js_1.fetchPrReviewRecords)(prNumber, repo),
                trustedActorLogin: (0, github_js_1.fetchAuthenticatedActorLogin)(),
                currentHeadSha: meta.headOid,
            });
        }
        catch {
            approval = {
                approved: false,
                approvedHeadSha: "",
                reason: "could not read current-head self-approval reviews",
            };
        }
        const result = (0, self_merge_js_1.resolveSelfMerge)({
            allowSelfMerge,
            targetKind,
            prState: meta.state,
            isDraft: meta.isDraft,
            currentHeadSha: meta.headOid,
            reviewDecision: meta.reviewDecision,
            mergeStateStatus: meta.mergeStateStatus,
            mergeable: meta.mergeable,
            autoMergeRequestExists: meta.autoMergeRequestExists,
            statusChecks: meta.statusChecks,
            approval,
        });
        return {
            verifiedHeadSha: approval.approved ? approval.approvedHeadSha || meta.headOid : "",
            result,
        };
    }
    catch {
        return {
            verifiedHeadSha: "",
            result: {
                conclusion: "failed",
                nextStep: "none",
                markReady: false,
                reason: "could not read pull request metadata during self-merge preflight",
            },
        };
    }
}
let { result, verifiedHeadSha } = resolveCurrentSelfMerge();
if (result.markReady) {
    try {
        (0, github_js_1.markPullRequestReady)(prNumber, repo);
        ({ result, verifiedHeadSha } = resolveCurrentSelfMerge());
    }
    catch (err) {
        result = {
            conclusion: "failed",
            nextStep: "none",
            markReady: false,
            reason: `mark ready failed: ${errorText(err) || "unknown error"}`,
        };
    }
}
if (result.nextStep === "merge") {
    try {
        (0, github_js_1.mergePullRequest)(prNumber, repo, verifiedHeadSha);
        result = { ...result, conclusion: "merged" };
    }
    catch (err) {
        result = {
            conclusion: "failed",
            nextStep: "none",
            markReady: false,
            reason: `merge failed: ${errorText(err) || "unknown error"}`,
        };
    }
}
else if (result.nextStep === "enable_auto_merge") {
    try {
        (0, github_js_1.enablePullRequestAutoMerge)(prNumber, repo, verifiedHeadSha);
        result = { ...result, conclusion: "auto_merge_enabled" };
    }
    catch (err) {
        result = {
            conclusion: "failed",
            nextStep: "none",
            markReady: false,
            reason: `auto-merge enable failed: ${errorText(err) || "unknown error"}`,
        };
    }
}
const bodyFile = writeBodyFile((0, self_merge_js_1.formatSelfMergeBody)({
    conclusion: result.conclusion,
    reason: result.reason,
    runUrl: currentRunUrl(),
}));
(0, output_js_1.setOutput)("conclusion", result.conclusion);
(0, output_js_1.setOutput)("merged", String(result.conclusion === "merged"));
(0, output_js_1.setOutput)("auto_merge_enabled", String(result.conclusion === "auto_merge_enabled"));
(0, output_js_1.setOutput)("status_post", "true");
(0, output_js_1.setOutput)("reason", result.reason);
(0, output_js_1.setOutput)("body_file", bodyFile);
//# sourceMappingURL=resolve-self-merge.js.map