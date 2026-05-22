"use strict";
// CLI: resolve a self-approval agent response and optionally approve a PR.
// Env: RESPONSE_FILE, GITHUB_REPOSITORY, TARGET_NUMBER, TARGET_KIND,
//      EXPECTED_HEAD_SHA, AGENT_ALLOW_SELF_APPROVE
// Outputs: conclusion, approved, handoff_context, reason, body_file
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const github_js_1 = require("../github.js");
const output_js_1 = require("../output.js");
const self_approval_js_1 = require("../self-approval.js");
function writeBodyFile(body) {
    const dir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "sepo-self-approve-"));
    const file = (0, node_path_1.join)(dir, "body.md");
    (0, node_fs_1.writeFileSync)(file, body, "utf8");
    return file;
}
function readResponse() {
    const responseFile = process.env.RESPONSE_FILE || "";
    if (!responseFile)
        return "";
    try {
        return (0, node_fs_1.readFileSync)(responseFile, "utf8");
    }
    catch {
        return "";
    }
}
function currentRunUrl() {
    const server = process.env.GITHUB_SERVER_URL || "";
    const repo = process.env.GITHUB_REPOSITORY || "";
    const runId = process.env.GITHUB_RUN_ID || "";
    return server && repo && runId ? `${server}/${repo}/actions/runs/${runId}` : "";
}
function submitApproval(repo, prNumber, headSha, body) {
    (0, github_js_1.gh)([
        "api",
        "--method",
        "POST",
        `repos/${repo}/pulls/${prNumber}/reviews`,
        "-f",
        `commit_id=${headSha}`,
        "-f",
        "event=APPROVE",
        "-f",
        `body=${body}`,
    ]);
}
function normalizeTargetKind(value) {
    return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}
const repo = process.env.GITHUB_REPOSITORY || "";
const prNumber = Number(process.env.TARGET_NUMBER || process.env.PR_NUMBER || "");
const targetKind = process.env.TARGET_KIND || "pull_request";
const expectedHeadSha = process.env.EXPECTED_HEAD_SHA || "";
const allowSelfApprove = (0, self_approval_js_1.envFlagEnabled)(process.env.AGENT_ALLOW_SELF_APPROVE);
const decision = (0, self_approval_js_1.parseSelfApprovalDecision)(readResponse());
let prState = "";
let currentHeadSha = "";
let metadataReadReason = "";
let approvalActorAllowed = false;
let approvalActorReason = "approval actor could not be verified as distinct from pull request author";
let approvalProvenanceTrusted = false;
let approvalProvenanceReason = "missing trusted review synthesis for self-approval";
if (allowSelfApprove && normalizeTargetKind(targetKind) === "pull_request" && repo && prNumber) {
    let authenticatedActorLogin = "";
    try {
        const meta = (0, github_js_1.fetchPrMeta)(prNumber, repo);
        prState = meta.state;
        currentHeadSha = meta.headOid;
    }
    catch {
        metadataReadReason = "could not read pull request metadata during self-approval resolution";
    }
    try {
        authenticatedActorLogin = (0, github_js_1.fetchAuthenticatedActorLogin)();
        const approvalActor = (0, self_approval_js_1.evaluateSelfApprovalActor)({
            approvalActorLogin: authenticatedActorLogin,
            prAuthorLogin: (0, github_js_1.fetchPrAuthorLogin)(prNumber, repo),
        });
        approvalActorAllowed = approvalActor.allowed;
        approvalActorReason = approvalActor.reason;
    }
    catch {
        approvalActorAllowed = false;
        approvalActorReason = "could not verify approval actor differs from pull request author";
    }
    try {
        const trustedActorLogin = authenticatedActorLogin || (0, github_js_1.fetchAuthenticatedActorLogin)();
        const provenance = (0, self_approval_js_1.evaluateSelfApprovalProvenance)({
            comments: (0, github_js_1.fetchIssueCommentRecords)(prNumber, repo),
            trustedActorLogin,
            expectedHeadSha,
        });
        approvalProvenanceTrusted = provenance.trusted;
        approvalProvenanceReason = provenance.reason;
    }
    catch {
        approvalProvenanceTrusted = false;
        approvalProvenanceReason = "could not read trusted review synthesis";
    }
}
else if (allowSelfApprove && normalizeTargetKind(targetKind) === "pull_request") {
    metadataReadReason = "missing pull request target";
}
let result = metadataReadReason
    ? {
        conclusion: "failed",
        shouldApprove: false,
        reason: metadataReadReason,
        handoffContext: decision?.handoffContext || "",
    }
    : (0, self_approval_js_1.resolveSelfApproval)({
        allowSelfApprove,
        targetKind,
        prState,
        expectedHeadSha,
        currentHeadSha,
        decision,
        approvalActorAllowed,
        approvalActorReason,
        approvalProvenanceTrusted,
        approvalProvenanceReason,
    });
let approved = false;
if (result.shouldApprove) {
    try {
        submitApproval(repo, prNumber, expectedHeadSha, (0, self_approval_js_1.formatSelfApprovalBody)({
            conclusion: result.conclusion,
            reason: result.reason,
            handoffContext: result.handoffContext,
            approved: true,
            runUrl: currentRunUrl(),
        }));
        approved = true;
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result = {
            conclusion: "failed",
            shouldApprove: false,
            reason: `approval submission failed: ${message || "unknown error"}`,
            handoffContext: result.handoffContext,
        };
    }
}
const body = (0, self_approval_js_1.formatSelfApprovalBody)({
    conclusion: result.conclusion,
    reason: result.reason,
    handoffContext: result.handoffContext,
    approved,
    runUrl: currentRunUrl(),
});
const bodyFile = writeBodyFile(body);
(0, output_js_1.setOutput)("conclusion", result.conclusion);
(0, output_js_1.setOutput)("approved", String(approved));
(0, output_js_1.setOutput)("handoff_context", result.handoffContext);
(0, output_js_1.setOutput)("reason", result.reason);
(0, output_js_1.setOutput)("body_file", bodyFile);
//# sourceMappingURL=resolve-self-approve.js.map