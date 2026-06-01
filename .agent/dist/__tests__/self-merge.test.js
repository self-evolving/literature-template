"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const self_merge_js_1 = require("../self-merge.js");
const approval = {
    approved: true,
    approvedHeadSha: "abc123",
    reason: "found current-head self-approval from the authenticated Sepo actor",
};
const baseInput = {
    allowSelfMerge: true,
    targetKind: "pull_request",
    prState: "OPEN",
    isDraft: false,
    currentHeadSha: "abc123",
    reviewDecision: "APPROVED",
    mergeStateStatus: "CLEAN",
    mergeable: "MERGEABLE",
    statusChecks: [],
    approval,
};
(0, node_test_1.test)("evaluateSelfMergeApproval requires a current-head self-approval review", () => {
    const current = (0, self_merge_js_1.evaluateSelfMergeApproval)({
        trustedActorLogin: "sepo-agent-app[bot]",
        currentHeadSha: "abc123",
        reviews: [
            {
                id: "1",
                authorLogin: "app/sepo-agent-app",
                state: "APPROVED",
                commitId: "abc123",
                submittedAt: "2026-05-10T10:00:00Z",
                body: "Sepo self-approval completed.\n\n<!-- sepo-agent-self-approval -->",
            },
        ],
    });
    node_assert_1.strict.equal(current.approved, true);
    const stale = (0, self_merge_js_1.evaluateSelfMergeApproval)({
        trustedActorLogin: "sepo-agent-app",
        currentHeadSha: "def456",
        reviews: [
            {
                id: "1",
                authorLogin: "sepo-agent-app[bot]",
                state: "APPROVED",
                commitId: "abc123",
                submittedAt: "2026-05-10T10:00:00Z",
                body: "Sepo self-approval completed.\n\n<!-- sepo-agent-self-approval -->",
            },
        ],
    });
    node_assert_1.strict.equal(stale.approved, false);
    node_assert_1.strict.match(stale.reason, /different head SHA/);
    const untrusted = (0, self_merge_js_1.evaluateSelfMergeApproval)({
        trustedActorLogin: "sepo-agent-app",
        currentHeadSha: "abc123",
        reviews: [
            {
                id: "1",
                authorLogin: "someone-else",
                state: "APPROVED",
                commitId: "abc123",
                submittedAt: "2026-05-10T10:00:00Z",
                body: "Sepo self-approval completed.\n\n<!-- sepo-agent-self-approval -->",
            },
        ],
    });
    node_assert_1.strict.equal(untrusted.approved, false);
    node_assert_1.strict.match(untrusted.reason, /missing current-head self-approval/);
});
(0, node_test_1.test)("summarizeStatusChecks separates pending and failing checks", () => {
    const summary = (0, self_merge_js_1.summarizeStatusChecks)([
        { name: "build", status: "COMPLETED", conclusion: "SUCCESS", state: "" },
        { name: "test", status: "IN_PROGRESS", conclusion: "", state: "" },
        { name: "lint", status: "COMPLETED", conclusion: "FAILURE", state: "" },
    ]);
    node_assert_1.strict.equal(summary.total, 3);
    node_assert_1.strict.deepEqual(summary.pendingNames, ["test"]);
    node_assert_1.strict.deepEqual(summary.failedNames, ["lint"]);
});
(0, node_test_1.test)("resolveSelfMerge blocks disabled, stale, requested-changes, and failed-check states", () => {
    node_assert_1.strict.match((0, self_merge_js_1.resolveSelfMerge)({ ...baseInput, allowSelfMerge: false }).reason, /AGENT_ALLOW_SELF_MERGE/);
    node_assert_1.strict.match((0, self_merge_js_1.resolveSelfMerge)({
        ...baseInput,
        approval: { approved: false, approvedHeadSha: "old", reason: "latest self-approval reviewed a different head SHA" },
    }).reason, /different head SHA/);
    node_assert_1.strict.match((0, self_merge_js_1.resolveSelfMerge)({ ...baseInput, reviewDecision: "CHANGES_REQUESTED" }).reason, /requested changes/);
    node_assert_1.strict.match((0, self_merge_js_1.resolveSelfMerge)({
        ...baseInput,
        statusChecks: [{ name: "test", status: "COMPLETED", conclusion: "FAILURE", state: "" }],
    }).reason, /status checks are failing: test/);
});
(0, node_test_1.test)("resolveSelfMerge marks draft PRs ready before mergeability recheck", () => {
    const readyToMerge = (0, self_merge_js_1.resolveSelfMerge)({
        ...baseInput,
        isDraft: true,
    });
    node_assert_1.strict.equal(readyToMerge.conclusion, "merged");
    node_assert_1.strict.equal(readyToMerge.nextStep, "merge");
    node_assert_1.strict.equal(readyToMerge.markReady, true);
    const needsRecheck = (0, self_merge_js_1.resolveSelfMerge)({
        ...baseInput,
        isDraft: true,
        mergeStateStatus: "DRAFT",
        mergeable: "UNKNOWN",
    });
    node_assert_1.strict.equal(needsRecheck.conclusion, "blocked");
    node_assert_1.strict.equal(needsRecheck.nextStep, "none");
    node_assert_1.strict.equal(needsRecheck.markReady, true);
    node_assert_1.strict.match(needsRecheck.reason, /not currently mergeable/);
});
(0, node_test_1.test)("resolveSelfMerge merges into the configured PR base when mergeable", () => {
    const result = (0, self_merge_js_1.resolveSelfMerge)(baseInput);
    node_assert_1.strict.equal(result.conclusion, "merged");
    node_assert_1.strict.equal(result.nextStep, "merge");
    const blocked = (0, self_merge_js_1.resolveSelfMerge)({
        ...baseInput,
        mergeStateStatus: "BLOCKED",
        mergeable: "UNKNOWN",
    });
    node_assert_1.strict.equal(blocked.conclusion, "blocked");
    node_assert_1.strict.match(blocked.reason, /not currently mergeable/);
});
(0, node_test_1.test)("resolveSelfMerge enables auto-merge while checks are pending", () => {
    const result = (0, self_merge_js_1.resolveSelfMerge)({
        ...baseInput,
        mergeStateStatus: "BLOCKED",
        mergeable: "UNKNOWN",
        statusChecks: [{ name: "check", status: "IN_PROGRESS", conclusion: "", state: "" }],
    });
    node_assert_1.strict.equal(result.conclusion, "auto_merge_enabled");
    node_assert_1.strict.equal(result.nextStep, "enable_auto_merge");
    node_assert_1.strict.match(result.reason, /enabling GitHub auto-merge/);
    const alreadyEnabled = (0, self_merge_js_1.resolveSelfMerge)({
        ...baseInput,
        autoMergeRequestExists: true,
        mergeStateStatus: "BLOCKED",
        mergeable: "UNKNOWN",
        statusChecks: [{ name: "check", status: "IN_PROGRESS", conclusion: "", state: "" }],
    });
    node_assert_1.strict.equal(alreadyEnabled.conclusion, "auto_merge_enabled");
    node_assert_1.strict.equal(alreadyEnabled.nextStep, "none");
    const ineligibleAlreadyEnabled = (0, self_merge_js_1.resolveSelfMerge)({
        ...baseInput,
        autoMergeRequestExists: true,
        mergeStateStatus: "DIRTY",
        mergeable: "MERGEABLE",
        statusChecks: [{ name: "check", status: "IN_PROGRESS", conclusion: "", state: "" }],
    });
    node_assert_1.strict.equal(ineligibleAlreadyEnabled.conclusion, "blocked");
    node_assert_1.strict.equal(ineligibleAlreadyEnabled.nextStep, "none");
    node_assert_1.strict.match(ineligibleAlreadyEnabled.reason, /not eligible for auto-merge/);
    const missingMergeState = (0, self_merge_js_1.resolveSelfMerge)({
        ...baseInput,
        mergeStateStatus: "",
        mergeable: "UNKNOWN",
        statusChecks: [{ name: "check", status: "IN_PROGRESS", conclusion: "", state: "" }],
    });
    node_assert_1.strict.equal(missingMergeState.conclusion, "blocked");
    node_assert_1.strict.equal(missingMergeState.nextStep, "none");
    node_assert_1.strict.match(missingMergeState.reason, /merge state: unknown/);
});
(0, node_test_1.test)("formatSelfMergeBody includes visible status and marker", () => {
    const body = (0, self_merge_js_1.formatSelfMergeBody)({
        conclusion: "blocked",
        reason: "pull request is not currently mergeable",
        runUrl: "https://github.com/self-evolving/repo/actions/runs/123",
    });
    node_assert_1.strict.match(body, /\| Blocked \| `blocked` \|/);
    node_assert_1.strict.match(body, /not currently mergeable/);
    node_assert_1.strict.match(body, /<!-- sepo-agent-self-merge -->/);
});
//# sourceMappingURL=self-merge.test.js.map