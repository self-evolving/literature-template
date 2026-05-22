"use strict";
// CLI: preflight self-approval before running the approval agent.
// Env: GITHUB_REPOSITORY, TARGET_NUMBER, TARGET_KIND, AGENT_ALLOW_SELF_APPROVE,
//      SOURCE_RECOMMENDED_NEXT_STEP
// Outputs: should_run, head_sha, reason, body_file
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const github_js_1 = require("../github.js");
const output_js_1 = require("../output.js");
const self_approval_js_1 = require("../self-approval.js");
function normalizeToken(value) {
    return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}
function writeBodyFile(body) {
    const dir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "sepo-self-approve-"));
    const file = (0, node_path_1.join)(dir, "body.md");
    (0, node_fs_1.writeFileSync)(file, body, "utf8");
    return file;
}
function stop(reason) {
    const bodyFile = writeBodyFile((0, self_approval_js_1.formatSelfApprovalBody)({
        conclusion: "blocked",
        reason,
        approved: false,
    }));
    (0, output_js_1.setOutput)("should_run", "false");
    (0, output_js_1.setOutput)("head_sha", "");
    (0, output_js_1.setOutput)("reason", reason);
    (0, output_js_1.setOutput)("body_file", bodyFile);
}
const repo = process.env.GITHUB_REPOSITORY || "";
const targetNumber = Number(process.env.TARGET_NUMBER || process.env.PR_NUMBER || "");
const targetKind = normalizeToken(process.env.TARGET_KIND || "pull_request");
const allowSelfApprove = (0, self_approval_js_1.envFlagEnabled)(process.env.AGENT_ALLOW_SELF_APPROVE);
const sourceRecommendedNextStep = normalizeToken(process.env.SOURCE_RECOMMENDED_NEXT_STEP || "");
const isHumanDecisionGate = sourceRecommendedNextStep === "human_decision";
if (!allowSelfApprove) {
    stop("AGENT_ALLOW_SELF_APPROVE is not enabled");
}
else if (targetKind !== "pull_request") {
    stop("self-approval is only supported for pull requests");
}
else if (!repo || !targetNumber) {
    stop("missing pull request target");
}
else {
    let shouldContinue = true;
    let headSha = "";
    let authenticatedActorLogin = "";
    try {
        const meta = (0, github_js_1.fetchPrMeta)(targetNumber, repo);
        if (String(meta.state || "").trim().toUpperCase() !== "OPEN") {
            stop(`pull request is ${String(meta.state || "not open").toLowerCase()}`);
            shouldContinue = false;
        }
        else if (!meta.headOid) {
            stop("could not resolve pull request head SHA");
            shouldContinue = false;
        }
        else {
            headSha = meta.headOid;
        }
    }
    catch {
        stop("could not read pull request metadata during self-approval preflight");
        shouldContinue = false;
    }
    if (shouldContinue) {
        try {
            authenticatedActorLogin = (0, github_js_1.fetchAuthenticatedActorLogin)();
            const approvalActor = (0, self_approval_js_1.evaluateSelfApprovalActor)({
                approvalActorLogin: authenticatedActorLogin,
                prAuthorLogin: (0, github_js_1.fetchPrAuthorLogin)(targetNumber, repo),
            });
            if (!approvalActor.allowed) {
                stop(approvalActor.reason);
                shouldContinue = false;
            }
        }
        catch {
            stop("could not verify approval actor during self-approval preflight");
            shouldContinue = false;
        }
    }
    if (shouldContinue) {
        try {
            const provenance = (0, self_approval_js_1.evaluateSelfApprovalProvenance)({
                comments: (0, github_js_1.fetchIssueCommentRecords)(targetNumber, repo),
                trustedActorLogin: authenticatedActorLogin,
                expectedHeadSha: headSha,
                allowHumanDecisionGate: isHumanDecisionGate,
            });
            if (!provenance.trusted) {
                stop(provenance.reason);
            }
            else {
                (0, output_js_1.setOutput)("should_run", "true");
                (0, output_js_1.setOutput)("head_sha", headSha);
                (0, output_js_1.setOutput)("reason", "");
                (0, output_js_1.setOutput)("body_file", "");
            }
        }
        catch {
            stop("could not read trusted review synthesis during self-approval preflight");
        }
    }
}
//# sourceMappingURL=prepare-self-approve.js.map