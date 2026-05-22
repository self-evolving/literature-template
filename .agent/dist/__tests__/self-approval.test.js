"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const self_approval_js_1 = require("../self-approval.js");
const approveDecision = {
    verdict: "approve",
    reason: "Aligned.",
    handoffContext: "",
    inspectedHeadSha: "abc123",
};
const distinctApprovalActor = {
    approvalActorAllowed: true,
    approvalActorReason: "approval actor is distinct from pull request author",
};
(0, node_test_1.test)("parseSelfApprovalDecision accepts structured verdict JSON", () => {
    const decision = (0, self_approval_js_1.parseSelfApprovalDecision)([
        "```json",
        JSON.stringify({
            verdict: "REQUEST_CHANGES",
            reason: "The product direction needs a narrower trust boundary.",
            handoff_context: "Keep self-approval internal-only.",
            inspected_head_sha: "abc123",
        }),
        "```",
    ].join("\n"));
    node_assert_1.strict.equal(decision?.verdict, "request_changes");
    node_assert_1.strict.equal(decision?.reason, "The product direction needs a narrower trust boundary.");
    node_assert_1.strict.equal(decision?.handoffContext, "Keep self-approval internal-only.");
    node_assert_1.strict.equal(decision?.inspectedHeadSha, "abc123");
});
(0, node_test_1.test)("parseSelfApprovalDecision rejects malformed or unsupported decisions", () => {
    node_assert_1.strict.equal((0, self_approval_js_1.parseSelfApprovalDecision)("no json"), null);
    node_assert_1.strict.equal((0, self_approval_js_1.parseSelfApprovalDecision)('{"verdict":"MAYBE","reason":"unsure"}'), null);
    node_assert_1.strict.equal((0, self_approval_js_1.parseSelfApprovalDecision)("[1,2,3]"), null);
});
(0, node_test_1.test)("formatSelfApprovalBody surfaces blocked and failed conclusions visibly", () => {
    const blocked = (0, self_approval_js_1.formatSelfApprovalBody)({
        conclusion: "blocked",
        reason: "missing trusted review synthesis",
    });
    node_assert_1.strict.match(blocked, /\| Blocked \| `blocked` \|/);
    node_assert_1.strict.match(blocked, /<!-- sepo-agent-self-approval -->/);
    const failed = (0, self_approval_js_1.formatSelfApprovalBody)({
        conclusion: "failed",
        reason: "approval submission failed: unavailable",
    });
    node_assert_1.strict.match(failed, /\| Failed \| `failed` \|/);
    node_assert_1.strict.match(failed, /approval submission failed/);
});
(0, node_test_1.test)("resolveSelfApproval blocks when opt-in flag is disabled", () => {
    const result = (0, self_approval_js_1.resolveSelfApproval)({
        allowSelfApprove: false,
        targetKind: "pull_request",
        prState: "OPEN",
        expectedHeadSha: "abc123",
        currentHeadSha: "abc123",
        decision: approveDecision,
        approvalProvenanceTrusted: true,
    });
    node_assert_1.strict.equal(result.shouldApprove, false);
    node_assert_1.strict.equal(result.conclusion, "blocked");
    node_assert_1.strict.match(result.reason, /AGENT_ALLOW_SELF_APPROVE/);
});
(0, node_test_1.test)("resolveSelfApproval rejects non-PR and closed PR targets", () => {
    const nonPr = (0, self_approval_js_1.resolveSelfApproval)({
        allowSelfApprove: true,
        targetKind: "issue",
        prState: "OPEN",
        expectedHeadSha: "abc123",
        currentHeadSha: "abc123",
        decision: approveDecision,
        approvalProvenanceTrusted: true,
    });
    node_assert_1.strict.equal(nonPr.shouldApprove, false);
    node_assert_1.strict.equal(nonPr.conclusion, "blocked");
    node_assert_1.strict.match(nonPr.reason, /only supported for pull requests/);
    const closed = (0, self_approval_js_1.resolveSelfApproval)({
        allowSelfApprove: true,
        targetKind: "pull_request",
        prState: "CLOSED",
        expectedHeadSha: "abc123",
        currentHeadSha: "abc123",
        decision: approveDecision,
        approvalProvenanceTrusted: true,
    });
    node_assert_1.strict.equal(closed.shouldApprove, false);
    node_assert_1.strict.equal(closed.conclusion, "blocked");
    node_assert_1.strict.match(closed.reason, /closed/);
});
(0, node_test_1.test)("evaluateSelfApprovalActor requires a distinct approval actor", () => {
    const allowed = (0, self_approval_js_1.evaluateSelfApprovalActor)({
        approvalActorLogin: "human-reviewer",
        prAuthorLogin: "app/sepo-agent-app",
    });
    node_assert_1.strict.equal(allowed.allowed, true);
    const sameApp = (0, self_approval_js_1.evaluateSelfApprovalActor)({
        approvalActorLogin: "sepo-agent-app[bot]",
        prAuthorLogin: "app/sepo-agent-app",
    });
    node_assert_1.strict.equal(sameApp.allowed, false);
    node_assert_1.strict.match(sameApp.reason, /matches the pull request author/);
    const missing = (0, self_approval_js_1.evaluateSelfApprovalActor)({
        approvalActorLogin: "",
        prAuthorLogin: "lolipopshock",
    });
    node_assert_1.strict.equal(missing.allowed, false);
    node_assert_1.strict.match(missing.reason, /could not resolve approval actor/);
});
(0, node_test_1.test)("resolveSelfApproval approves only matching open PR heads with trusted provenance", () => {
    const result = (0, self_approval_js_1.resolveSelfApproval)({
        allowSelfApprove: true,
        targetKind: "pull_request",
        prState: "OPEN",
        expectedHeadSha: "abc123",
        currentHeadSha: "abc123",
        decision: approveDecision,
        ...distinctApprovalActor,
        approvalProvenanceTrusted: true,
    });
    node_assert_1.strict.equal(result.shouldApprove, true);
    node_assert_1.strict.equal(result.conclusion, "approved");
});
(0, node_test_1.test)("resolveSelfApproval blocks approval by the pull request author", () => {
    const result = (0, self_approval_js_1.resolveSelfApproval)({
        allowSelfApprove: true,
        targetKind: "pull_request",
        prState: "OPEN",
        expectedHeadSha: "abc123",
        currentHeadSha: "abc123",
        decision: approveDecision,
        approvalActorAllowed: false,
        approvalActorReason: "approval actor matches the pull request author",
        approvalProvenanceTrusted: true,
    });
    node_assert_1.strict.equal(result.shouldApprove, false);
    node_assert_1.strict.equal(result.conclusion, "blocked");
    node_assert_1.strict.match(result.reason, /matches the pull request author/);
});
(0, node_test_1.test)("resolveSelfApproval rejects stale or mismatched head SHAs", () => {
    const stale = (0, self_approval_js_1.resolveSelfApproval)({
        allowSelfApprove: true,
        targetKind: "pull_request",
        prState: "OPEN",
        expectedHeadSha: "abc123",
        currentHeadSha: "def456",
        decision: approveDecision,
        approvalProvenanceTrusted: true,
    });
    node_assert_1.strict.equal(stale.shouldApprove, false);
    node_assert_1.strict.equal(stale.conclusion, "blocked");
    node_assert_1.strict.match(stale.reason, /head changed/);
    const mismatch = (0, self_approval_js_1.resolveSelfApproval)({
        allowSelfApprove: true,
        targetKind: "pull_request",
        prState: "OPEN",
        expectedHeadSha: "abc123",
        currentHeadSha: "abc123",
        decision: { ...approveDecision, inspectedHeadSha: "def456" },
        approvalProvenanceTrusted: true,
    });
    node_assert_1.strict.equal(mismatch.shouldApprove, false);
    node_assert_1.strict.equal(mismatch.conclusion, "blocked");
    node_assert_1.strict.match(mismatch.reason, /different inspected head/);
});
(0, node_test_1.test)("resolveSelfApproval rejects approval verdicts without inspected head SHA", () => {
    for (const inspectedHeadSha of ["", "   "]) {
        const result = (0, self_approval_js_1.resolveSelfApproval)({
            allowSelfApprove: true,
            targetKind: "pull_request",
            prState: "OPEN",
            expectedHeadSha: "abc123",
            currentHeadSha: "abc123",
            decision: { ...approveDecision, inspectedHeadSha },
            approvalProvenanceTrusted: true,
        });
        node_assert_1.strict.equal(result.shouldApprove, false);
        node_assert_1.strict.equal(result.conclusion, "blocked");
        node_assert_1.strict.match(result.reason, /missing inspected head SHA/);
    }
});
(0, node_test_1.test)("resolveSelfApproval blocks approval without trusted review provenance", () => {
    const result = (0, self_approval_js_1.resolveSelfApproval)({
        allowSelfApprove: true,
        targetKind: "pull_request",
        prState: "OPEN",
        expectedHeadSha: "abc123",
        currentHeadSha: "abc123",
        ...distinctApprovalActor,
        approvalProvenanceTrusted: false,
        approvalProvenanceReason: "latest trusted review synthesis verdict is needs_rework, not SHIP",
        decision: approveDecision,
    });
    node_assert_1.strict.equal(result.shouldApprove, false);
    node_assert_1.strict.equal(result.conclusion, "blocked");
    node_assert_1.strict.match(result.reason, /needs_rework/);
});
(0, node_test_1.test)("resolveSelfApproval records request changes without approving", () => {
    const result = (0, self_approval_js_1.resolveSelfApproval)({
        allowSelfApprove: true,
        targetKind: "pull_request",
        prState: "OPEN",
        expectedHeadSha: "abc123",
        currentHeadSha: "abc123",
        approvalProvenanceTrusted: true,
        decision: {
            verdict: "request_changes",
            reason: "Needs a narrower design.",
            handoffContext: "Remove the public slash route.",
            inspectedHeadSha: "abc123",
        },
    });
    node_assert_1.strict.equal(result.shouldApprove, false);
    node_assert_1.strict.equal(result.conclusion, "request_changes");
    node_assert_1.strict.equal(result.handoffContext, "Remove the public slash route.");
});
(0, node_test_1.test)("evaluateSelfApprovalProvenance requires the latest trusted ship signal", () => {
    const trusted = (0, self_approval_js_1.evaluateSelfApprovalProvenance)({
        trustedActorLogin: "sepo-agent-app[bot]",
        expectedHeadSha: "abc123",
        comments: [
            {
                authorLogin: "app/sepo-agent-app",
                createdAt: "2026-05-07T10:00:00Z",
                body: "## AI Review Synthesis\n\n<!-- sepo-agent-review-synthesis -->\n<!-- sepo-agent-review-synthesis-head: abc123 -->\n\n## Final Verdict\n\nSHIP",
            },
        ],
    });
    node_assert_1.strict.equal(trusted.trusted, true);
    node_assert_1.strict.match(trusted.reason, /SHIP/);
    const superseded = (0, self_approval_js_1.evaluateSelfApprovalProvenance)({
        trustedActorLogin: "sepo-agent-app[bot]",
        expectedHeadSha: "abc123",
        comments: [
            {
                authorLogin: "sepo-agent-app",
                createdAt: "2026-05-07T10:00:00Z",
                body: "## AI Review Synthesis\n\n<!-- sepo-agent-review-synthesis -->\n<!-- sepo-agent-review-synthesis-head: abc123 -->\n\n## Final Verdict\n\nSHIP",
            },
            {
                authorLogin: "sepo-agent-app",
                createdAt: "2026-05-07T10:05:00Z",
                body: "## AI Review Synthesis\n\n<!-- sepo-agent-review-synthesis -->\n<!-- sepo-agent-review-synthesis-head: abc123 -->\n\n## Final Verdict\n\nNEEDS_REWORK",
            },
        ],
    });
    node_assert_1.strict.equal(superseded.trusted, false);
    node_assert_1.strict.match(superseded.reason, /needs_rework/);
});
(0, node_test_1.test)("evaluateSelfApprovalProvenance can allow trusted HUMAN_DECISION gate", () => {
    const humanDecision = (0, self_approval_js_1.evaluateSelfApprovalProvenance)({
        trustedActorLogin: "sepo-agent-app[bot]",
        expectedHeadSha: "abc123",
        allowHumanDecisionGate: true,
        comments: [
            {
                authorLogin: "sepo-agent-app",
                createdAt: "2026-05-07T10:00:00Z",
                body: [
                    "## AI Review Synthesis",
                    "<!-- sepo-agent-review-synthesis -->",
                    "<!-- sepo-agent-review-synthesis-head: abc123 -->",
                    "",
                    "## Recommended Next Step",
                    "HUMAN_DECISION: self-approval should decide.",
                    "",
                    "## Final Verdict",
                    "NEEDS_REWORK",
                ].join("\n"),
            },
        ],
    });
    node_assert_1.strict.equal(humanDecision.trusted, true);
    node_assert_1.strict.match(humanDecision.reason, /HUMAN_DECISION/);
    const fixPr = (0, self_approval_js_1.evaluateSelfApprovalProvenance)({
        trustedActorLogin: "sepo-agent-app[bot]",
        expectedHeadSha: "abc123",
        allowHumanDecisionGate: true,
        comments: [
            {
                authorLogin: "sepo-agent-app",
                createdAt: "2026-05-07T10:00:00Z",
                body: "## AI Review Synthesis\n<!-- sepo-agent-review-synthesis -->\n<!-- sepo-agent-review-synthesis-head: abc123 -->\n\n## Recommended Next Step\nFIX_PR\n\n## Final Verdict\nNEEDS_REWORK",
            },
        ],
    });
    node_assert_1.strict.equal(fixPr.trusted, false);
    node_assert_1.strict.match(fixPr.reason, /not SHIP/);
});
(0, node_test_1.test)("evaluateSelfApprovalProvenance requires review synthesis for the current head", () => {
    const stale = (0, self_approval_js_1.evaluateSelfApprovalProvenance)({
        trustedActorLogin: "sepo-agent-app[bot]",
        expectedHeadSha: "def456",
        comments: [
            {
                authorLogin: "sepo-agent-app",
                createdAt: "2026-05-07T10:00:00Z",
                body: "## AI Review Synthesis\n\n<!-- sepo-agent-review-synthesis -->\n<!-- sepo-agent-review-synthesis-head: abc123 -->\n\n## Final Verdict\n\nSHIP",
            },
        ],
    });
    node_assert_1.strict.equal(stale.trusted, false);
    node_assert_1.strict.match(stale.reason, /different head SHA/);
    const untrusted = (0, self_approval_js_1.evaluateSelfApprovalProvenance)({
        trustedActorLogin: "sepo-agent-app[bot]",
        expectedHeadSha: "abc123",
        comments: [
            {
                authorLogin: "someone-else",
                createdAt: "2026-05-07T10:00:00Z",
                body: "## AI Review Synthesis\n\n<!-- sepo-agent-review-synthesis -->\n<!-- sepo-agent-review-synthesis-head: abc123 -->\n\n## Final Verdict\n\nSHIP",
            },
        ],
    });
    node_assert_1.strict.equal(untrusted.trusted, false);
    node_assert_1.strict.match(untrusted.reason, /missing trusted/);
});
//# sourceMappingURL=self-approval.test.js.map