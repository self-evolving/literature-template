"use strict";
// CLI: compute cheap preflight outputs for agent-orchestrator.yml.
// Env: AUTOMATION_MODE, AUTOMATION_CURRENT_ROUND, AUTOMATION_MAX_ROUNDS,
//      SOURCE_ACTION, SOURCE_CONCLUSION, TARGET_KIND, AUTHOR_ASSOCIATION,
//      ACCESS_POLICY, REPOSITORY_PRIVATE, AGENT_ALLOW_SELF_APPROVE,
//      AGENT_ALLOW_SELF_MERGE
// Outputs: automation_mode, current_round, max_rounds, planner_enabled,
//          authorization_stop, authorization_stop_reason
// The authorization_stop outputs are diagnostic; planner_enabled is the workflow gate,
// and orchestrate-handoff posts the parent-visible stop comment.
Object.defineProperty(exports, "__esModule", { value: true });
const handoff_js_1 = require("../handoff.js");
const orchestrator_capabilities_js_1 = require("../orchestrator-capabilities.js");
const output_js_1 = require("../output.js");
function positiveInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function envFlagEnabled(value) {
    return ["true", "1", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}
const automationMode = (0, handoff_js_1.normalizeAutomationMode)(process.env.AUTOMATION_MODE || "disabled");
const currentRound = positiveInt(process.env.AUTOMATION_CURRENT_ROUND || "", 1);
const maxRounds = positiveInt(process.env.AUTOMATION_MAX_ROUNDS || "", 12);
const sourceAction = String(process.env.SOURCE_ACTION || "").trim().toLowerCase();
const sourceConclusion = String(process.env.SOURCE_CONCLUSION || "unknown").trim().toLowerCase();
const targetKind = String(process.env.TARGET_KIND || "").trim().toLowerCase();
const authorizationStopReason = (0, orchestrator_capabilities_js_1.initialOrchestrateCapabilityStopReason)({
    sourceAction,
    sourceConclusion,
    currentRound,
    allowSelfApprove: envFlagEnabled(process.env.AGENT_ALLOW_SELF_APPROVE || ""),
    allowSelfMerge: envFlagEnabled(process.env.AGENT_ALLOW_SELF_MERGE || ""),
    authorAssociation: process.env.AUTHOR_ASSOCIATION || "",
    accessPolicy: process.env.ACCESS_POLICY || "",
    isPublicRepo: String(process.env.REPOSITORY_PRIVATE || "").trim().toLowerCase() === "false",
});
const initialOrchestrate = sourceAction === "orchestrate";
const plannerEnabled = !authorizationStopReason &&
    automationMode === "agent" &&
    currentRound < maxRounds &&
    (!initialOrchestrate || targetKind === "issue" || targetKind === "pull_request");
(0, output_js_1.setOutput)("automation_mode", automationMode);
(0, output_js_1.setOutput)("current_round", String(currentRound));
(0, output_js_1.setOutput)("max_rounds", String(maxRounds));
(0, output_js_1.setOutput)("planner_enabled", String(plannerEnabled));
(0, output_js_1.setOutput)("authorization_stop", String(Boolean(authorizationStopReason)));
(0, output_js_1.setOutput)("authorization_stop_reason", authorizationStopReason);
console.log(`Orchestrator preflight: mode=${automationMode}, source_action=${sourceAction || "missing"}, target_kind=${targetKind || "missing"}, round=${currentRound}/${maxRounds}, planner_enabled=${plannerEnabled}, authorization_stop=${Boolean(authorizationStopReason)}`);
//# sourceMappingURL=orchestrator-preflight.js.map