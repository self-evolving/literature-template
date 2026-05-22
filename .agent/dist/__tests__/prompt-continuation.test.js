"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const acpx_adapter_js_1 = require("../acpx-adapter.js");
const prompt_continuation_js_1 = require("../prompt-continuation.js");
(0, node_test_1.test)("continuation prompt preserves latest trigger metadata and request text", () => {
    const prompt = (0, prompt_continuation_js_1.buildContinuationPrompt)({
        REQUEST_SOURCE_KIND: "pull_request_review",
        REQUEST_COMMENT_ID: "12345",
        REQUEST_COMMENT_URL: "https://github.com/self-evolving/repo/pull/77#pullrequestreview-12345",
        REQUEST_TEXT: "@sepo-agent /fix-pr",
    });
    node_assert_1.strict.match(prompt, /Triggering source kind: `pull_request_review`/);
    node_assert_1.strict.match(prompt, /Triggering comment\/review ID: `12345`/);
    node_assert_1.strict.match(prompt, /@sepo-agent \/fix-pr/);
});
(0, node_test_1.test)("resumed orchestrated fix-pr replays the full route prompt", () => {
    const promptVars = {
        REQUEST_SOURCE_KIND: "workflow_dispatch",
        REQUEST_TEXT: "@sepo-agent /orchestrate",
        ORCHESTRATOR_CONTEXT: "Address review synthesis: validate marker source, correct docs, classify terminal states.",
    };
    const continuationPrompt = (0, prompt_continuation_js_1.buildContinuationPrompt)(promptVars);
    const selectedContinuationPrompt = (0, prompt_continuation_js_1.selectContinuationPromptForResume)({
        route: "fix-pr",
        promptVars,
        continuationPrompt,
    });
    node_assert_1.strict.equal((0, prompt_continuation_js_1.shouldReplayFullPromptOnResume)("fix-pr", promptVars), true);
    node_assert_1.strict.equal(selectedContinuationPrompt, undefined);
    const agentFacingPrompt = (0, acpx_adapter_js_1.selectPromptForSessionOutcome)({
        fullPrompt: "Full fix-pr prompt\nOrchestrator handoff context:\n" +
            promptVars.ORCHESTRATOR_CONTEXT,
        continuationPrompt: selectedContinuationPrompt,
        outcome: { kind: "resumed", resumedFromSessionId: "ses-pr-77" },
    });
    node_assert_1.strict.match(agentFacingPrompt, /validate marker source/);
    node_assert_1.strict.match(agentFacingPrompt, /classify terminal states/);
    node_assert_1.strict.notEqual(agentFacingPrompt, continuationPrompt);
});
(0, node_test_1.test)("direct fix-pr resumes still use the lightweight continuation prompt", () => {
    const promptVars = {
        REQUEST_SOURCE_KIND: "issue_comment",
        REQUEST_TEXT: "@sepo-agent /fix-pr please address the latest comment",
        ORCHESTRATOR_CONTEXT: "",
    };
    const continuationPrompt = (0, prompt_continuation_js_1.buildContinuationPrompt)(promptVars);
    node_assert_1.strict.equal((0, prompt_continuation_js_1.shouldReplayFullPromptOnResume)("fix-pr", promptVars), false);
    node_assert_1.strict.equal((0, prompt_continuation_js_1.selectContinuationPromptForResume)({ route: "fix-pr", promptVars, continuationPrompt }), continuationPrompt);
});
(0, node_test_1.test)("non-fix-pr routes keep continuation prompts even with supplemental context", () => {
    const promptVars = {
        REQUEST_TEXT: "@sepo-agent /review",
        ORCHESTRATOR_CONTEXT: "Review the fix after the automated branch update.",
    };
    const continuationPrompt = (0, prompt_continuation_js_1.buildContinuationPrompt)(promptVars);
    node_assert_1.strict.equal((0, prompt_continuation_js_1.shouldReplayFullPromptOnResume)("review", promptVars), false);
    node_assert_1.strict.equal((0, prompt_continuation_js_1.selectContinuationPromptForResume)({ route: "review", promptVars, continuationPrompt }), continuationPrompt);
});
//# sourceMappingURL=prompt-continuation.test.js.map