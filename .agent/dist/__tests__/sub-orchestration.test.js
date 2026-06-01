"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const sub_orchestration_js_1 = require("../sub-orchestration.js");
(0, node_test_1.test)("sub-orchestrator markers format, parse, and update", () => {
    const marker = (0, sub_orchestration_js_1.formatSubOrchestratorMarker)({
        parent: 76,
        stage: "Stage One!",
        parentRound: 2,
    });
    node_assert_1.strict.equal(marker, "<!-- sepo-sub-orchestrator parent:76 stage:stage-one state:running parent_round:2 -->");
    node_assert_1.strict.deepEqual((0, sub_orchestration_js_1.parseSubOrchestratorMarker)(marker), {
        parent: 76,
        stage: "stage-one",
        state: "running",
        parentRound: 2,
    });
    node_assert_1.strict.equal((0, sub_orchestration_js_1.normalizeSubOrchestratorStage)("  A / B  "), "a-b");
    node_assert_1.strict.match((0, sub_orchestration_js_1.updateSubOrchestratorMarkerState)(marker, "done"), /state:done/);
    node_assert_1.strict.match((0, sub_orchestration_js_1.updateSubOrchestratorMarkerParentRound)(marker, 4), /parent_round:4/);
});
(0, node_test_1.test)("sub-orchestrator child link markers format and parse", () => {
    const marker = (0, sub_orchestration_js_1.formatSubOrchestratorChildLinkMarker)({
        parent: 76,
        stage: "Stage One",
        child: 77,
    });
    node_assert_1.strict.equal(marker, "<!-- sepo-sub-orchestrator-child parent:76 stage:stage-one child:77 -->");
    node_assert_1.strict.deepEqual((0, sub_orchestration_js_1.parseSubOrchestratorChildLinkMarker)(marker), {
        parent: 76,
        stage: "stage-one",
        child: 77,
    });
    node_assert_1.strict.equal((0, sub_orchestration_js_1.parseSubOrchestratorChildLinkMarker)("no marker"), null);
});
(0, node_test_1.test)("sub-orchestration issue body records visible task and hidden marker", () => {
    const body = (0, sub_orchestration_js_1.formatSubOrchestrationIssueBody)({
        parentIssue: 76,
        stage: "Stage One",
        taskInstructions: "Implement the first stage.",
        basePr: "66",
        parentRound: 2,
    });
    node_assert_1.strict.match(body, /Parent issue: #76/);
    node_assert_1.strict.match(body, /Stage: Stage One/);
    node_assert_1.strict.match(body, /Implement the first stage/);
    node_assert_1.strict.match(body, /base_pr: #66/);
    node_assert_1.strict.deepEqual((0, sub_orchestration_js_1.parseSubOrchestratorMarker)(body), {
        parent: 76,
        stage: "stage-one",
        state: "running",
        parentRound: 2,
    });
});
(0, node_test_1.test)("terminal helpers resolve closing issue references and result states", () => {
    node_assert_1.strict.equal((0, sub_orchestration_js_1.extractClosingIssueNumber)("Implements #76"), 76);
    node_assert_1.strict.equal((0, sub_orchestration_js_1.extractClosingIssueNumber)("Fixes self-evolving/repo#76", "self-evolving/repo"), 76);
    node_assert_1.strict.equal((0, sub_orchestration_js_1.extractClosingIssueNumber)("Fixes other-org/other-repo#76", "self-evolving/repo"), null);
    node_assert_1.strict.equal((0, sub_orchestration_js_1.extractClosingIssueNumber)("Fixes self-evolving/repo#76"), null);
    node_assert_1.strict.equal((0, sub_orchestration_js_1.extractClosingIssueNumber)("No linked issue"), null);
    node_assert_1.strict.equal((0, sub_orchestration_js_1.resultStateFromTerminal)({ sourceAction: "review", sourceConclusion: "SHIP", reason: "" }), "done");
    node_assert_1.strict.equal((0, sub_orchestration_js_1.resultStateFromTerminal)({ sourceAction: "agent-self-approve", sourceConclusion: "approved", reason: "" }), "done");
    node_assert_1.strict.equal((0, sub_orchestration_js_1.resultStateFromTerminal)({ sourceAction: "agent-self-approve", sourceConclusion: "blocked", reason: "" }), "blocked");
    node_assert_1.strict.equal((0, sub_orchestration_js_1.resultStateFromTerminal)({ sourceAction: "agent-self-approve", sourceConclusion: "failed", reason: "" }), "failed");
    node_assert_1.strict.equal((0, sub_orchestration_js_1.resultStateFromTerminal)({ sourceAction: "agent-self-merge", sourceConclusion: "merged", reason: "" }), "done");
    node_assert_1.strict.equal((0, sub_orchestration_js_1.resultStateFromTerminal)({ sourceAction: "agent-self-merge", sourceConclusion: "auto_merge_enabled", reason: "" }), "done");
    node_assert_1.strict.equal((0, sub_orchestration_js_1.resultStateFromTerminal)({ sourceAction: "agent-self-merge", sourceConclusion: "blocked", reason: "" }), "blocked");
    node_assert_1.strict.equal((0, sub_orchestration_js_1.resultStateFromTerminal)({
        sourceAction: "review",
        sourceConclusion: "failed",
        reason: "orchestrate requests require implement access; implement currently requires MEMBER access.",
    }), "blocked");
    node_assert_1.strict.equal((0, sub_orchestration_js_1.resultStateFromTerminal)({
        sourceAction: "review",
        sourceConclusion: "failed",
        reason: "invalid AGENT_ACCESS_POLICY: Access policy must be a JSON object",
    }), "failed");
    node_assert_1.strict.equal((0, sub_orchestration_js_1.resultStateFromTerminal)({
        sourceAction: "implement",
        sourceConclusion: "failed",
        reason: "automation round budget exhausted",
    }), "blocked");
    node_assert_1.strict.equal((0, sub_orchestration_js_1.resultStateFromTerminal)({
        sourceAction: "orchestrate",
        sourceConclusion: "failed",
        reason: "agent planner blocked: waiting for user input",
    }), "blocked");
    node_assert_1.strict.equal((0, sub_orchestration_js_1.resultStateFromTerminal)({
        sourceAction: "implement",
        sourceConclusion: "failed",
        reason: "provider said blocked while parsing output",
    }), "failed");
    node_assert_1.strict.equal((0, sub_orchestration_js_1.resultStateFromTerminal)({ sourceAction: "implement", sourceConclusion: "failed", reason: "" }), "failed");
});
//# sourceMappingURL=sub-orchestration.test.js.map