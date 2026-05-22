"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const handoff_js_1 = require("../handoff.js");
(0, node_test_1.test)("handoff skips when automation mode is disabled", () => {
    const decision = (0, handoff_js_1.decideHandoff)({
        automationMode: "disabled",
        sourceAction: "implement",
        sourceConclusion: "success",
        targetNumber: "42",
        nextTargetNumber: "99",
        currentRound: 1,
        maxRounds: 5,
    });
    node_assert_1.strict.equal(decision.decision, "skip");
    node_assert_1.strict.equal(decision.nextAction, undefined);
});
(0, node_test_1.test)("agent mode validates planner handoff against policy", () => {
    const decision = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "implement",
        sourceConclusion: "success",
        targetNumber: "42",
        nextTargetNumber: "99",
        currentRound: 1,
        maxRounds: 5,
        plannerDecision: {
            decision: "handoff",
            nextAction: "review",
            reason: "Implementation produced a PR.",
            handoffContext: "Review the new PR with special attention to generated workflow permissions.",
        },
    });
    node_assert_1.strict.equal(decision.decision, "dispatch");
    node_assert_1.strict.equal(decision.nextAction, "review");
    node_assert_1.strict.equal(decision.targetNumber, "99");
    node_assert_1.strict.match(decision.reason, /agent planner selected review/);
    node_assert_1.strict.equal(decision.handoffContext, "Review the new PR with special attention to generated workflow permissions.");
});
(0, node_test_1.test)("agent mode allows planner-selected self-approval for SHIP reviews when enabled", () => {
    const decision = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "review",
        sourceConclusion: "SHIP",
        targetNumber: "99",
        currentRound: 2,
        maxRounds: 5,
        allowSelfApprove: true,
        plannerDecision: {
            decision: "handoff",
            nextAction: "agent-self-approve",
            reason: "Review shipped and self-approval is enabled.",
        },
    });
    node_assert_1.strict.equal(decision.decision, "dispatch");
    node_assert_1.strict.equal(decision.nextAction, "agent-self-approve");
    node_assert_1.strict.equal(decision.targetNumber, "99");
    node_assert_1.strict.match(decision.reason, /agent planner selected agent-self-approve/);
});
(0, node_test_1.test)("agent mode allows planner-selected self-merge after self-approval when enabled", () => {
    const decision = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "agent-self-approve",
        sourceConclusion: "approved",
        targetNumber: "99",
        currentRound: 3,
        maxRounds: 5,
        allowSelfMerge: true,
        plannerDecision: {
            decision: "handoff",
            nextAction: "agent-self-merge",
            reason: "Self-approval completed and self-merge is enabled.",
        },
    });
    node_assert_1.strict.equal(decision.decision, "dispatch");
    node_assert_1.strict.equal(decision.nextAction, "agent-self-merge");
    node_assert_1.strict.equal(decision.targetNumber, "99");
    node_assert_1.strict.match(decision.reason, /agent planner selected agent-self-merge/);
});
(0, node_test_1.test)("agent mode supports issue-level child issue delegation", () => {
    const decision = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "orchestrate",
        sourceConclusion: "requested",
        targetKind: "issue",
        targetNumber: "76",
        currentRound: 1,
        maxRounds: 5,
        plannerDecision: {
            decision: "delegate_issue",
            reason: "Split the work into a child task.",
            childStage: "stage 1",
            childInstructions: "Implement the first stage.",
            basePr: "66",
        },
    });
    node_assert_1.strict.equal(decision.decision, "delegate_issue");
    node_assert_1.strict.equal(decision.nextAction, undefined);
    node_assert_1.strict.equal(decision.targetNumber, "76");
    node_assert_1.strict.equal(decision.childStage, "stage 1");
    node_assert_1.strict.equal(decision.childInstructions, "Implement the first stage.");
    node_assert_1.strict.equal(decision.basePr, "66");
});
(0, node_test_1.test)("agent mode supports issue-level orchestrate handoff to implement", () => {
    const decision = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "orchestrate",
        sourceConclusion: "requested",
        targetKind: "issue",
        targetNumber: "76",
        currentRound: 1,
        maxRounds: 5,
        plannerDecision: {
            decision: "handoff",
            nextAction: "implement",
            reason: "The current issue is small and self-contained.",
            baseBranch: "feature-base",
        },
    });
    node_assert_1.strict.equal(decision.decision, "dispatch");
    node_assert_1.strict.equal(decision.nextAction, "implement");
    node_assert_1.strict.equal(decision.targetNumber, "76");
    node_assert_1.strict.equal(decision.nextRound, 2);
    node_assert_1.strict.match(decision.reason, /agent planner selected implement/);
    node_assert_1.strict.equal(decision.baseBranch, "feature-base");
});
(0, node_test_1.test)("agent mode supports PR-level orchestrate handoff to review or fix-pr", () => {
    const review = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "orchestrate",
        sourceConclusion: "requested",
        targetKind: "pull_request",
        targetNumber: "66",
        currentRound: 1,
        maxRounds: 5,
        plannerDecision: {
            decision: "handoff",
            nextAction: "review",
            reason: "The request asks for review before any edits.",
        },
    });
    node_assert_1.strict.equal(review.decision, "dispatch");
    node_assert_1.strict.equal(review.nextAction, "review");
    node_assert_1.strict.equal(review.targetNumber, "66");
    node_assert_1.strict.match(review.reason, /agent planner selected review/);
    const fix = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "orchestrate",
        sourceConclusion: "requested",
        targetKind: "pull_request",
        targetNumber: "66",
        currentRound: 1,
        maxRounds: 5,
        plannerDecision: {
            decision: "handoff",
            nextAction: "fix-pr",
            reason: "The request explicitly asks to fix the PR.",
            handoffContext: "Fix the merge conflict only.",
        },
    });
    node_assert_1.strict.equal(fix.decision, "dispatch");
    node_assert_1.strict.equal(fix.nextAction, "fix-pr");
    node_assert_1.strict.equal(fix.targetNumber, "66");
    node_assert_1.strict.equal(fix.handoffContext, "Fix the merge conflict only.");
    node_assert_1.strict.match(fix.reason, /agent planner selected fix-pr/);
});
(0, node_test_1.test)("agent mode rejects invalid PR-level orchestrate handoffs", () => {
    const implement = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "orchestrate",
        sourceConclusion: "requested",
        targetKind: "pull_request",
        targetNumber: "66",
        currentRound: 1,
        maxRounds: 5,
        plannerDecision: {
            decision: "handoff",
            nextAction: "implement",
            reason: "Try to implement from a PR.",
        },
    });
    node_assert_1.strict.equal(implement.decision, "stop");
    node_assert_1.strict.match(implement.reason, /only for issue targets/);
    const mixedAnswer = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "orchestrate",
        sourceConclusion: "requested",
        targetKind: "pull_request",
        targetNumber: "66",
        currentRound: 1,
        maxRounds: 5,
        plannerDecision: {
            decision: "answer",
            nextAction: "review",
            reason: "Answer and review.",
        },
    });
    node_assert_1.strict.equal(mixedAnswer.decision, "stop");
    node_assert_1.strict.match(mixedAnswer.reason, /answer must not set next_action/);
    const fixWithoutContext = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "orchestrate",
        sourceConclusion: "requested",
        targetKind: "pull_request",
        targetNumber: "66",
        currentRound: 1,
        maxRounds: 5,
        plannerDecision: {
            decision: "handoff",
            nextAction: "fix-pr",
            reason: "Fix the PR.",
        },
    });
    node_assert_1.strict.equal(fixWithoutContext.decision, "stop");
    node_assert_1.strict.match(fixWithoutContext.reason, /without handoff_context/);
});
(0, node_test_1.test)("agent mode rejects invalid child issue delegation", () => {
    const wrongTarget = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "orchestrate",
        sourceConclusion: "requested",
        targetKind: "pull_request",
        targetNumber: "66",
        currentRound: 1,
        maxRounds: 5,
        plannerDecision: {
            decision: "delegate_issue",
            reason: "Try from a PR.",
            childInstructions: "Do it.",
        },
    });
    node_assert_1.strict.equal(wrongTarget.decision, "stop");
    node_assert_1.strict.match(wrongTarget.reason, /only from issues/);
    const missingInstructions = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "orchestrate",
        sourceConclusion: "requested",
        targetKind: "issue",
        targetNumber: "76",
        currentRound: 1,
        maxRounds: 5,
        plannerDecision: { decision: "delegate_issue", reason: "No task." },
    });
    node_assert_1.strict.equal(missingInstructions.decision, "stop");
    node_assert_1.strict.match(missingInstructions.reason, /without child instructions/);
    const mixedCommand = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "orchestrate",
        sourceConclusion: "requested",
        targetKind: "issue",
        targetNumber: "76",
        currentRound: 1,
        maxRounds: 5,
        plannerDecision: {
            decision: "delegate_issue",
            nextAction: "review",
            reason: "Mixed command.",
            childInstructions: "Do it.",
        },
    });
    node_assert_1.strict.equal(mixedCommand.decision, "stop");
    node_assert_1.strict.match(mixedCommand.reason, /must not set next_action/);
});
(0, node_test_1.test)("agent mode rejects issue-level implement handoffs for non-issue targets", () => {
    const decision = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "orchestrate",
        sourceConclusion: "requested",
        targetKind: "pull_request",
        targetNumber: "76",
        currentRound: 1,
        maxRounds: 5,
        plannerDecision: {
            decision: "handoff",
            nextAction: "implement",
            reason: "Try to implement from a PR.",
        },
    });
    node_assert_1.strict.equal(decision.decision, "stop");
    node_assert_1.strict.match(decision.reason, /only for issue targets/);
});
(0, node_test_1.test)("agent mode falls back to default fix-pr context when planner omits it", () => {
    const decision = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "review",
        sourceConclusion: "minor_issues",
        targetNumber: "99",
        currentRound: 2,
        maxRounds: 5,
        plannerDecision: {
            decision: "handoff",
            nextAction: "fix-pr",
            reason: "Review found minor issues.",
        },
    });
    node_assert_1.strict.equal(decision.decision, "dispatch");
    node_assert_1.strict.equal(decision.nextAction, "fix-pr");
    node_assert_1.strict.equal(decision.handoffContext, (0, handoff_js_1.defaultFixPrHandoffContext)());
});
(0, node_test_1.test)("agent mode stops invalid or disallowed planner handoffs", () => {
    const disallowed = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "implement",
        sourceConclusion: "verify_failed",
        targetNumber: "42",
        nextTargetNumber: "99",
        currentRound: 1,
        maxRounds: 5,
        plannerDecision: { decision: "handoff", nextAction: "review", reason: "Try anyway." },
    });
    node_assert_1.strict.equal(disallowed.decision, "stop");
    node_assert_1.strict.match(disallowed.reason, /policy disallows/);
    const wrongEdge = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "review",
        sourceConclusion: "minor_issues",
        targetNumber: "99",
        currentRound: 2,
        maxRounds: 5,
        plannerDecision: { decision: "handoff", nextAction: "review", reason: "Review again." },
    });
    node_assert_1.strict.equal(wrongEdge.decision, "stop");
    node_assert_1.strict.match(wrongEdge.reason, /policy only allows fix-pr/);
});
(0, node_test_1.test)("agent mode respects planner stop, invalid planner output, and round budget", () => {
    const stopped = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "review",
        sourceConclusion: "minor_issues",
        targetNumber: "99",
        currentRound: 2,
        maxRounds: 5,
        plannerDecision: { decision: "stop", reason: "Leave the remaining work to a maintainer." },
    });
    node_assert_1.strict.equal(stopped.decision, "stop");
    node_assert_1.strict.match(stopped.reason, /agent planner stop/);
    const blocked = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "orchestrate",
        sourceConclusion: "done",
        targetKind: "issue",
        targetNumber: "76",
        currentRound: 2,
        maxRounds: 5,
        plannerDecision: {
            decision: "blocked",
            reason: "Need the next child scope.",
            userMessage: "I need a maintainer decision before continuing.",
            clarificationRequest: "Should the next child stack on #112?",
        },
    });
    node_assert_1.strict.equal(blocked.decision, "stop");
    node_assert_1.strict.equal(blocked.plannerDecisionKind, "blocked");
    node_assert_1.strict.equal(blocked.userMessage, "I need a maintainer decision before continuing.");
    node_assert_1.strict.equal(blocked.clarificationRequest, "Should the next child stack on #112?");
    node_assert_1.strict.match(blocked.reason, /agent planner blocked/);
    const invalid = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "review",
        sourceConclusion: "minor_issues",
        targetNumber: "99",
        currentRound: 2,
        maxRounds: 5,
    });
    node_assert_1.strict.equal(invalid.decision, "stop");
    node_assert_1.strict.match(invalid.reason, /planner decision missing/);
    const exhausted = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "review",
        sourceConclusion: "minor_issues",
        targetNumber: "99",
        currentRound: 5,
        maxRounds: 5,
        plannerDecision: { decision: "handoff", nextAction: "fix-pr", reason: "Try another fix pass." },
    });
    node_assert_1.strict.equal(exhausted.decision, "stop");
    node_assert_1.strict.match(exhausted.reason, /budget/);
});
(0, node_test_1.test)("implement success dispatches review for the created PR", () => {
    const decision = (0, handoff_js_1.decideHandoff)({
        automationMode: "heuristics",
        sourceAction: "implement",
        sourceConclusion: "success",
        targetNumber: "42",
        nextTargetNumber: "99",
        currentRound: 1,
        maxRounds: 5,
    });
    node_assert_1.strict.equal(decision.decision, "dispatch");
    node_assert_1.strict.equal(decision.nextAction, "review");
    node_assert_1.strict.equal(decision.targetNumber, "99");
    node_assert_1.strict.equal(decision.nextRound, 2);
});
(0, node_test_1.test)("implement stops on failures and missing PR targets", () => {
    const failed = (0, handoff_js_1.decideHandoff)({
        automationMode: "heuristics",
        sourceAction: "implement",
        sourceConclusion: "verify_failed",
        targetNumber: "42",
        nextTargetNumber: "99",
        currentRound: 1,
        maxRounds: 5,
    });
    node_assert_1.strict.equal(failed.decision, "stop");
    node_assert_1.strict.match(failed.reason, /verify_failed/);
    const missingPr = (0, handoff_js_1.decideHandoff)({
        automationMode: "heuristics",
        sourceAction: "implement",
        sourceConclusion: "success",
        targetNumber: "42",
        currentRound: 1,
        maxRounds: 5,
    });
    node_assert_1.strict.equal(missingPr.decision, "stop");
    node_assert_1.strict.match(missingPr.reason, /pull request target/);
});
(0, node_test_1.test)("review verdicts dispatch fix-pr or stop", () => {
    for (const verdict of ["NEEDS_REWORK", "CHANGES_REQUESTED", "minor-issues"]) {
        const needsFix = (0, handoff_js_1.decideHandoff)({
            automationMode: "heuristics",
            sourceAction: "review",
            sourceConclusion: verdict,
            targetNumber: "99",
            currentRound: 2,
            maxRounds: 5,
        });
        node_assert_1.strict.equal(needsFix.decision, "dispatch");
        node_assert_1.strict.equal(needsFix.nextAction, "fix-pr");
        node_assert_1.strict.equal(needsFix.targetNumber, "99");
        node_assert_1.strict.equal(needsFix.handoffContext, (0, handoff_js_1.defaultFixPrHandoffContext)());
    }
    const ship = (0, handoff_js_1.decideHandoff)({
        automationMode: "heuristics",
        sourceAction: "review",
        sourceConclusion: "SHIP",
        targetNumber: "99",
        currentRound: 2,
        maxRounds: 5,
    });
    node_assert_1.strict.equal(ship.decision, "stop");
    node_assert_1.strict.match(ship.reason, /SHIP/);
    const selfApprove = (0, handoff_js_1.decideHandoff)({
        automationMode: "heuristics",
        sourceAction: "review",
        sourceConclusion: "SHIP",
        targetNumber: "99",
        currentRound: 2,
        maxRounds: 5,
        allowSelfApprove: true,
    });
    node_assert_1.strict.equal(selfApprove.decision, "dispatch");
    node_assert_1.strict.equal(selfApprove.nextAction, "agent-self-approve");
    node_assert_1.strict.equal(selfApprove.targetNumber, "99");
    node_assert_1.strict.match(selfApprove.reason, /dispatching agent-self-approve/);
});
(0, node_test_1.test)("review HUMAN_DECISION dispatches self-approval when enabled", () => {
    for (const verdict of ["SHIP", "MINOR_ISSUES", "NEEDS_REWORK"]) {
        const decision = (0, handoff_js_1.decideHandoff)({
            automationMode: "heuristics",
            sourceAction: "review",
            sourceConclusion: verdict,
            sourceRecommendedNextStep: "HUMAN_DECISION",
            targetNumber: "99",
            currentRound: 2,
            maxRounds: 5,
            allowSelfApprove: true,
        });
        node_assert_1.strict.equal(decision.decision, "dispatch");
        node_assert_1.strict.equal(decision.nextAction, "agent-self-approve");
        node_assert_1.strict.match(decision.reason, /HUMAN_DECISION/);
    }
});
(0, node_test_1.test)("review HUMAN_DECISION stops when self-approval is disabled", () => {
    const decision = (0, handoff_js_1.decideHandoff)({
        automationMode: "heuristics",
        sourceAction: "review",
        sourceConclusion: "MINOR_ISSUES",
        sourceRecommendedNextStep: "HUMAN_DECISION",
        targetNumber: "99",
        currentRound: 2,
        maxRounds: 5,
        allowSelfApprove: false,
    });
    node_assert_1.strict.equal(decision.decision, "stop");
    node_assert_1.strict.match(decision.reason, /HUMAN_DECISION/);
});
(0, node_test_1.test)("agent mode validates review HUMAN_DECISION self-approval handoff", () => {
    const allowed = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "review",
        sourceConclusion: "MINOR_ISSUES",
        sourceRecommendedNextStep: "HUMAN_DECISION",
        targetNumber: "99",
        currentRound: 2,
        maxRounds: 5,
        allowSelfApprove: true,
        plannerDecision: {
            decision: "handoff",
            nextAction: "agent-self-approve",
            reason: "Review asked for human decision and self-approval is enabled.",
        },
    });
    node_assert_1.strict.equal(allowed.decision, "dispatch");
    node_assert_1.strict.equal(allowed.nextAction, "agent-self-approve");
    const wrong = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "review",
        sourceConclusion: "MINOR_ISSUES",
        sourceRecommendedNextStep: "HUMAN_DECISION",
        targetNumber: "99",
        currentRound: 2,
        maxRounds: 5,
        allowSelfApprove: true,
        plannerDecision: { decision: "handoff", nextAction: "fix-pr", reason: "Fix it instead." },
    });
    node_assert_1.strict.equal(wrong.decision, "stop");
    node_assert_1.strict.match(wrong.reason, /policy only allows agent-self-approve/);
});
(0, node_test_1.test)("review fix-pr handoffs preserve derived source context", () => {
    const decision = (0, handoff_js_1.decideHandoff)({
        automationMode: "heuristics",
        sourceAction: "review",
        sourceConclusion: "minor_issues",
        sourceHandoffContext: "Fix only the failing fallback test.",
        targetNumber: "99",
        currentRound: 2,
        maxRounds: 5,
    });
    node_assert_1.strict.equal(decision.decision, "dispatch");
    node_assert_1.strict.equal(decision.nextAction, "fix-pr");
    node_assert_1.strict.equal(decision.handoffContext, "Fix only the failing fallback test.");
});
(0, node_test_1.test)("self-approval request changes dispatches fix-pr with handoff context", () => {
    const decision = (0, handoff_js_1.decideHandoff)({
        automationMode: "heuristics",
        sourceAction: "agent-self-approve",
        sourceConclusion: "REQUEST_CHANGES",
        sourceHandoffContext: "Tighten the resolver preflight and add tests.",
        targetNumber: "99",
        currentRound: 3,
        maxRounds: 5,
    });
    node_assert_1.strict.equal(decision.decision, "dispatch");
    node_assert_1.strict.equal(decision.nextAction, "fix-pr");
    node_assert_1.strict.equal(decision.targetNumber, "99");
    node_assert_1.strict.equal(decision.handoffContext, "Tighten the resolver preflight and add tests.");
});
(0, node_test_1.test)("self-approval terminal conclusions stop", () => {
    for (const conclusion of ["approved", "blocked", "failed"]) {
        const decision = (0, handoff_js_1.decideHandoff)({
            automationMode: "heuristics",
            sourceAction: "agent-self-approve",
            sourceConclusion: conclusion,
            targetNumber: "99",
            currentRound: 3,
            maxRounds: 5,
        });
        node_assert_1.strict.equal(decision.decision, "stop");
        node_assert_1.strict.equal(decision.nextAction, undefined);
        node_assert_1.strict.match(decision.reason, new RegExp(`agent-self-approve concluded ${conclusion}`));
    }
});
(0, node_test_1.test)("self-approval approved dispatches self-merge only when enabled", () => {
    const disabled = (0, handoff_js_1.decideHandoff)({
        automationMode: "heuristics",
        sourceAction: "agent-self-approve",
        sourceConclusion: "approved",
        targetNumber: "99",
        currentRound: 3,
        maxRounds: 5,
    });
    node_assert_1.strict.equal(disabled.decision, "stop");
    const enabled = (0, handoff_js_1.decideHandoff)({
        automationMode: "heuristics",
        sourceAction: "agent-self-approve",
        sourceConclusion: "approved",
        targetNumber: "99",
        currentRound: 3,
        maxRounds: 5,
        allowSelfMerge: true,
    });
    node_assert_1.strict.equal(enabled.decision, "dispatch");
    node_assert_1.strict.equal(enabled.nextAction, "agent-self-merge");
    node_assert_1.strict.equal(enabled.targetNumber, "99");
    node_assert_1.strict.match(enabled.reason, /dispatching agent-self-merge/);
});
(0, node_test_1.test)("self-merge terminal conclusions stop", () => {
    for (const conclusion of ["merged", "auto_merge_enabled", "blocked", "failed"]) {
        const decision = (0, handoff_js_1.decideHandoff)({
            automationMode: "heuristics",
            sourceAction: "agent-self-merge",
            sourceConclusion: conclusion,
            targetNumber: "99",
            currentRound: 4,
            maxRounds: 5,
        });
        node_assert_1.strict.equal(decision.decision, "stop");
        node_assert_1.strict.equal(decision.nextAction, undefined);
        node_assert_1.strict.match(decision.reason, new RegExp(`agent-self-merge concluded ${conclusion}`));
    }
});
(0, node_test_1.test)("fix-pr success dispatches review until the round budget is exhausted", () => {
    const decision = (0, handoff_js_1.decideHandoff)({
        automationMode: "heuristics",
        sourceAction: "fix-pr",
        sourceConclusion: "success",
        targetNumber: "99",
        currentRound: 4,
        maxRounds: 5,
    });
    node_assert_1.strict.equal(decision.decision, "dispatch");
    node_assert_1.strict.equal(decision.nextAction, "review");
    const exhausted = (0, handoff_js_1.decideHandoff)({
        automationMode: "heuristics",
        sourceAction: "fix-pr",
        sourceConclusion: "success",
        targetNumber: "99",
        currentRound: 5,
        maxRounds: 5,
    });
    node_assert_1.strict.equal(exhausted.decision, "stop");
    node_assert_1.strict.match(exhausted.reason, /budget/);
});
(0, node_test_1.test)("fix-pr unsatisfactory conclusions stop without re-review", () => {
    for (const conclusion of ["no_changes", "failed", "verify_failed"]) {
        const decision = (0, handoff_js_1.decideHandoff)({
            automationMode: "heuristics",
            sourceAction: "fix-pr",
            sourceConclusion: conclusion,
            targetNumber: "99",
            currentRound: 3,
            maxRounds: 5,
        });
        node_assert_1.strict.equal(decision.decision, "stop");
        node_assert_1.strict.equal(decision.nextAction, undefined);
        node_assert_1.strict.match(decision.reason, new RegExp(`fix-pr concluded ${conclusion}`));
        node_assert_1.strict.match(decision.reason, /must succeed before re-review/);
    }
});
(0, node_test_1.test)("unsupported actions stop", () => {
    const decision = (0, handoff_js_1.decideHandoff)({
        automationMode: "heuristics",
        sourceAction: "deploy",
        sourceConclusion: "success",
        targetNumber: "99",
        currentRound: 1,
        maxRounds: 5,
    });
    node_assert_1.strict.equal(decision.decision, "stop");
    node_assert_1.strict.match(decision.reason, /unsupported/);
});
(0, node_test_1.test)("extractReviewConclusion reads final verdict markdown", () => {
    node_assert_1.strict.equal((0, handoff_js_1.extractReviewConclusion)("## Final Verdict\n- `MINOR_ISSUES`"), "minor_issues");
    node_assert_1.strict.equal((0, handoff_js_1.extractReviewConclusion)("Final answer\n\n## Final Verdict\nSHIP"), "ship");
    node_assert_1.strict.equal((0, handoff_js_1.extractReviewConclusion)("This needs-rework before another pass"), "needs_rework");
    node_assert_1.strict.equal((0, handoff_js_1.extractReviewConclusion)("No verdict here"), "unknown");
});
(0, node_test_1.test)("extractReviewRecommendedNextStep reads review synthesis recommendation", () => {
    node_assert_1.strict.equal((0, handoff_js_1.extractReviewRecommendedNextStep)("## Recommended Next Step\nHUMAN_DECISION: Needs gate judgment."), "human_decision");
    node_assert_1.strict.equal((0, handoff_js_1.extractReviewRecommendedNextStep)("## Recommended Next Step\n- `FIX_PR`"), "fix_pr");
    node_assert_1.strict.equal((0, handoff_js_1.extractReviewRecommendedNextStep)("No recommendation"), "");
});
(0, node_test_1.test)("handoff dedupe markers are deterministic and detectable", () => {
    const key = (0, handoff_js_1.buildHandoffDedupeKey)({
        repo: "Self-Evolving/Repo",
        sourceRunId: "12345",
        sourceAction: "fix-pr",
        sourceTargetNumber: "99",
        nextAction: "review",
        nextTargetNumber: "99",
        nextRound: 3,
    });
    node_assert_1.strict.equal(key, "handoff:self-evolving/repo:12345:fix_pr:99:review:99:3");
    const marker = (0, handoff_js_1.buildHandoffMarker)(key, "pending", 1_000);
    node_assert_1.strict.ok((0, handoff_js_1.hasHandoffMarker)(`comment body\n${marker}`, key));
    node_assert_1.strict.equal((0, handoff_js_1.getHandoffMarkerState)(`comment body\n${marker}`, key), "pending");
    node_assert_1.strict.deepEqual((0, handoff_js_1.parseHandoffMarker)(marker, key), { state: "pending", createdAtMs: 1_000 });
    node_assert_1.strict.equal((0, handoff_js_1.getHandoffMarkerState)((0, handoff_js_1.buildHandoffMarker)(key, "failed"), key), "failed");
    node_assert_1.strict.equal((0, handoff_js_1.getHandoffMarkerState)((0, handoff_js_1.buildHandoffMarker)(key), key), "dispatched");
    node_assert_1.strict.equal((0, handoff_js_1.hasHandoffMarker)("comment body", key), false);
});
(0, node_test_1.test)("handoff marker comments use compact tables and fix-pr task context", () => {
    const key = (0, handoff_js_1.buildHandoffDedupeKey)({
        repo: "self-evolving/repo",
        sourceRunId: "12345",
        sourceAction: "review",
        sourceTargetNumber: "128",
        nextAction: "fix-pr",
        nextTargetNumber: "128",
        nextRound: 6,
    });
    const body = (0, handoff_js_1.formatHandoffMarkerComment)({
        key,
        state: "dispatched",
        sourceAction: "review",
        nextAction: "fix-pr",
        targetKind: "pull_request",
        targetNumber: "128",
        nextRound: 6,
        maxRounds: 10,
        reason: "review verdict is minor_issues; dispatching fix-pr",
        handoffContext: "Document and test the metadata path fallback.",
        createdAtMs: 1_000,
    });
    node_assert_1.strict.match(body, /Sepo is dispatching follow-up automation\./);
    node_assert_1.strict.match(body, /\| Source \| Next \| Target \| Round \| Status \|/);
    node_assert_1.strict.match(body, /\| review \| fix-pr \| PR #128 \| 6 \/ 10 \| Dispatched \|/);
    node_assert_1.strict.match(body, /Reason: review verdict is minor_issues; dispatching fix-pr/);
    node_assert_1.strict.match(body, /Task for fix-pr:\nDocument and test the metadata path fallback\./);
    node_assert_1.strict.match(body, /<!-- sepo-agent-handoff state:dispatched created:1000 base64:/);
});
(0, node_test_1.test)("pending handoff markers become stale after the ttl", () => {
    node_assert_1.strict.equal((0, handoff_js_1.isPendingHandoffMarkerStale)({ state: "pending", createdAtMs: 1_000 }, 3_000, 1_000), true);
    node_assert_1.strict.equal((0, handoff_js_1.isPendingHandoffMarkerStale)({ state: "pending", createdAtMs: 2_500 }, 3_000, 1_000), false);
    node_assert_1.strict.equal((0, handoff_js_1.isPendingHandoffMarkerStale)({ state: "pending", createdAtMs: null }, 3_000, 1_000), true);
    node_assert_1.strict.equal((0, handoff_js_1.isPendingHandoffMarkerStale)({ state: "dispatched", createdAtMs: 1_000 }, 3_000, 1_000), false);
});
(0, node_test_1.test)("automation mode parsing supports disabled, heuristics, and boolean compatibility aliases", () => {
    node_assert_1.strict.equal((0, handoff_js_1.normalizeAutomationMode)("disabled"), "disabled");
    node_assert_1.strict.equal((0, handoff_js_1.normalizeAutomationMode)("false"), "disabled");
    node_assert_1.strict.equal((0, handoff_js_1.normalizeAutomationMode)("heuristics"), "heuristics");
    node_assert_1.strict.equal((0, handoff_js_1.normalizeAutomationMode)("true"), "heuristics");
    node_assert_1.strict.equal((0, handoff_js_1.normalizeAutomationMode)("agent"), "agent");
    node_assert_1.strict.equal((0, handoff_js_1.normalizeAutomationMode)("heuristic"), "disabled");
    node_assert_1.strict.equal((0, handoff_js_1.normalizeAutomationMode)("deterministic"), "disabled");
    node_assert_1.strict.equal((0, handoff_js_1.automationModeAllowsHandoff)("heuristics"), true);
    node_assert_1.strict.equal((0, handoff_js_1.automationModeAllowsHandoff)("agent"), true);
    node_assert_1.strict.equal((0, handoff_js_1.automationModeAllowsHandoff)("heuristic"), false);
    node_assert_1.strict.equal((0, handoff_js_1.automationModeAllowsHandoff)("deterministic"), false);
});
(0, node_test_1.test)("parsePlannerDecision reads planner JSON", () => {
    node_assert_1.strict.deepEqual((0, handoff_js_1.parsePlannerDecision)([
        "```json",
        '{"decision":"handoff","next_action":"fix-pr","reason":"Needs changes.","handoff_context":"Only update tests for the failing review findings."}',
        "```",
    ].join("\n")), {
        decision: "handoff",
        nextAction: "fix-pr",
        reason: "Needs changes.",
        handoffContext: "Only update tests for the failing review findings.",
    });
    node_assert_1.strict.deepEqual((0, handoff_js_1.parsePlannerDecision)('{"decision":"blocked","reason":"Missing PR.","user_message":"I need the PR number.","clarification_request":"Which PR should I inspect?"}'), {
        decision: "blocked",
        nextAction: undefined,
        reason: "Missing PR.",
        userMessage: "I need the PR number.",
        clarificationRequest: "Which PR should I inspect?",
    });
    node_assert_1.strict.equal((0, handoff_js_1.parsePlannerDecision)('{"decision":"handoff","nextAction":"fix-pr","reason":"Alias.","handoffContext":"camel case works"}')?.handoffContext, "camel case works");
    node_assert_1.strict.equal((0, handoff_js_1.parsePlannerDecision)('{"decision":"handoff","next_action":"agent-self-approve","reason":"Ship review can proceed to self-approval."}')?.nextAction, "agent-self-approve");
    node_assert_1.strict.equal((0, handoff_js_1.parsePlannerDecision)('{"decision":"handoff","next_action":"agent-self-merge","reason":"Self-approval can proceed to merge."}')?.nextAction, "agent-self-merge");
    node_assert_1.strict.equal((0, handoff_js_1.parsePlannerDecision)('{"decision":"handoff","next_action":"self_approve","reason":"Legacy alias should not map."}')?.nextAction, undefined);
    node_assert_1.strict.deepEqual((0, handoff_js_1.parsePlannerDecision)('{"decision":"delegate_issue","reason":"Delegate.","child_stage":"Stage One","child_instructions":"Do one thing.","base_pr":"12"}'), {
        decision: "delegate_issue",
        nextAction: undefined,
        reason: "Delegate.",
        childStage: "Stage One",
        childInstructions: "Do one thing.",
        basePr: "12",
    });
    node_assert_1.strict.equal((0, handoff_js_1.parsePlannerDecision)("not json"), null);
    node_assert_1.strict.equal((0, handoff_js_1.parsePlannerDecision)('{"decision":"deploy","reason":"Ship it."}'), null);
    node_assert_1.strict.equal((0, handoff_js_1.parsePlannerDecision)('{"decision":"handoff","next_action":"deploy"}')?.nextAction, undefined);
    node_assert_1.strict.deepEqual((0, handoff_js_1.parsePlannerDecision)('{"decision":"answer","reason":"The user asked a question.","user_message":"Use /review for a full pass."}'), {
        decision: "answer",
        nextAction: undefined,
        reason: "The user asked a question.",
        userMessage: "Use /review for a full pass.",
    });
});
(0, node_test_1.test)("review fix-pr context extracts unchecked review synthesis action items", () => {
    const synthesis = [
        "## Review",
        "Summary.",
        "",
        "## Action Items",
        "- [ ] Document and test the metadata path fallback.",
        "- [x] Already fixed source_ref validation.",
        "- [ ] Ignore optional INFO polish unless needed.",
    ].join("\n");
    node_assert_1.strict.deepEqual((0, handoff_js_1.extractReviewActionItems)(synthesis), [
        "Document and test the metadata path fallback.",
        "Ignore optional INFO polish unless needed.",
    ]);
    node_assert_1.strict.equal((0, handoff_js_1.buildReviewFixPrHandoffContext)(synthesis), [
        "Address only the latest review synthesis action items:",
        "- Document and test the metadata path fallback.",
        "- Ignore optional INFO polish unless needed.",
        "",
        "Constraints: Ignore optional INFO notes, metadata-only polish, already-fixed findings, and human-judgment nits unless required by those action items.",
    ].join("\n"));
});
//# sourceMappingURL=handoff.test.js.map