"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSubOrchestratorStage = normalizeSubOrchestratorStage;
exports.formatSubOrchestratorMarker = formatSubOrchestratorMarker;
exports.parseSubOrchestratorMarker = parseSubOrchestratorMarker;
exports.formatSubOrchestratorChildLinkMarker = formatSubOrchestratorChildLinkMarker;
exports.parseSubOrchestratorChildLinkMarker = parseSubOrchestratorChildLinkMarker;
exports.updateSubOrchestratorMarkerState = updateSubOrchestratorMarkerState;
exports.updateSubOrchestratorMarkerParentRound = updateSubOrchestratorMarkerParentRound;
exports.formatSubOrchestrationIssueBody = formatSubOrchestrationIssueBody;
exports.extractClosingIssueNumber = extractClosingIssueNumber;
exports.resultStateFromTerminal = resultStateFromTerminal;
const MARKER_PREFIX = "sepo-sub-orchestrator";
const MARKER_RE = /<!--\s*sepo-sub-orchestrator\s+([\s\S]*?)-->/i;
const CHILD_LINK_MARKER_PREFIX = "sepo-sub-orchestrator-child";
const CHILD_LINK_MARKER_RE = /<!--\s*sepo-sub-orchestrator-child\s+([\s\S]*?)-->/i;
const VALID_STATES = new Set(["running", "done", "blocked", "failed"]);
function normalizeSubOrchestratorStage(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "stage";
}
function parseMarkerTokens(text) {
    const tokens = new Map();
    for (const match of String(text || "").matchAll(/\b([a-z_]+):([^\s]+)/gi)) {
        tokens.set(match[1].toLowerCase(), match[2]);
    }
    return tokens;
}
function parsePositiveInteger(value) {
    const text = String(value || "").trim();
    if (!/^\d+$/.test(text))
        return 0;
    const parsed = Number.parseInt(text, 10);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
}
function formatSubOrchestratorMarker(input) {
    const parts = [
        MARKER_PREFIX,
        `parent:${input.parent}`,
        `stage:${normalizeSubOrchestratorStage(input.stage)}`,
        `state:${input.state || "running"}`,
    ];
    const parentRound = parsePositiveInteger(String(input.parentRound || ""));
    if (parentRound)
        parts.push(`parent_round:${parentRound}`);
    return `<!-- ${parts.join(" ")} -->`;
}
function parseSubOrchestratorMarker(body) {
    const match = String(body || "").match(MARKER_RE);
    if (!match)
        return null;
    const tokens = parseMarkerTokens(match[1] || "");
    const parent = parsePositiveInteger(tokens.get("parent"));
    const stageToken = tokens.get("stage");
    const stage = stageToken ? normalizeSubOrchestratorStage(stageToken) : "";
    const rawState = String(tokens.get("state") || "").toLowerCase();
    if (!parent || !stage || !VALID_STATES.has(rawState))
        return null;
    const parentRound = parsePositiveInteger(tokens.get("parent_round"));
    return {
        parent,
        stage,
        state: rawState,
        ...(parentRound ? { parentRound } : {}),
    };
}
function formatSubOrchestratorChildLinkMarker(input) {
    return `<!-- ${CHILD_LINK_MARKER_PREFIX} parent:${input.parent} stage:${normalizeSubOrchestratorStage(input.stage)} child:${input.child} -->`;
}
function parseSubOrchestratorChildLinkMarker(body) {
    const match = String(body || "").match(CHILD_LINK_MARKER_RE);
    if (!match)
        return null;
    const tokens = parseMarkerTokens(match[1] || "");
    const parent = parsePositiveInteger(tokens.get("parent"));
    const stageToken = tokens.get("stage");
    const stage = stageToken ? normalizeSubOrchestratorStage(stageToken) : "";
    const child = parsePositiveInteger(tokens.get("child"));
    if (!parent || !stage || !child)
        return null;
    return { parent, stage, child };
}
function updateSubOrchestratorMarkerState(body, state) {
    const marker = parseSubOrchestratorMarker(body);
    if (!marker)
        return body;
    return String(body || "").replace(MARKER_RE, formatSubOrchestratorMarker({ ...marker, state }));
}
function updateSubOrchestratorMarkerParentRound(body, parentRound) {
    const marker = parseSubOrchestratorMarker(body);
    if (!marker)
        return body;
    return String(body || "").replace(MARKER_RE, formatSubOrchestratorMarker({ ...marker, parentRound }));
}
function formatSubOrchestrationIssueBody(input) {
    const lines = [
        `Parent issue: #${input.parentIssue}`,
        "",
        `Stage: ${input.stage.trim() || "Sub-orchestration"}`,
        "",
        "## Task",
        "",
        input.taskInstructions.trim() || "Continue the parent orchestration subtask.",
    ];
    if (input.baseBranch || input.basePr) {
        lines.push("", "## Base", "");
        if (input.baseBranch)
            lines.push(`- base_branch: ${input.baseBranch}`);
        if (input.basePr)
            lines.push(`- base_pr: #${input.basePr}`);
    }
    lines.push("", formatSubOrchestratorMarker({
        parent: input.parentIssue,
        stage: input.stage,
        parentRound: input.parentRound,
    }));
    return lines.join("\n");
}
function normalizeRepoSlug(value) {
    return String(value || "").trim().toLowerCase();
}
function extractClosingIssueNumber(text, currentRepo = "") {
    const currentRepoSlug = normalizeRepoSlug(currentRepo);
    const closingRefRe = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?|implement(?:s|ed)?)\s+(?:(?<repo>[\w.-]+\/[\w.-]+)#|#)(?<number>\d+)\b/gi;
    for (const match of String(text || "").matchAll(closingRefRe)) {
        const referencedRepo = normalizeRepoSlug(match.groups?.repo || "");
        if (referencedRepo && referencedRepo !== currentRepoSlug) {
            continue;
        }
        if (referencedRepo && !currentRepoSlug) {
            continue;
        }
        const parsed = Number.parseInt(match.groups?.number || "", 10);
        if (Number.isFinite(parsed) && parsed > 0)
            return parsed;
    }
    return null;
}
function isAuthorizationStopReason(reason) {
    return reason.startsWith("orchestrate requests require ") ||
        /\brequests currently require\b/.test(reason);
}
function isRoundLimitStopReason(reason) {
    return reason === "automation round budget exhausted" ||
        reason.includes("round budget exhausted") ||
        reason.includes("round limit") ||
        reason.includes("max rounds") ||
        reason.includes("maximum rounds");
}
const SELF_APPROVAL_TERMINAL_STATES = {
    approved: "done",
    blocked: "blocked",
    failed: "failed",
};
const SELF_MERGE_TERMINAL_STATES = {
    auto_merge_enabled: "done",
    blocked: "blocked",
    failed: "failed",
    merged: "done",
};
function resultStateFromTerminal(input) {
    const action = input.sourceAction.trim().toLowerCase().replace(/[\s-]+/g, "_");
    const conclusion = input.sourceConclusion.trim().toLowerCase().replace(/[\s-]+/g, "_");
    const reason = input.reason.trim().toLowerCase();
    if (action === "review" && conclusion === "ship")
        return "done";
    if (action === "agent_self_approve" && SELF_APPROVAL_TERMINAL_STATES[conclusion]) {
        return SELF_APPROVAL_TERMINAL_STATES[conclusion];
    }
    if (action === "agent_self_merge" && SELF_MERGE_TERMINAL_STATES[conclusion]) {
        return SELF_MERGE_TERMINAL_STATES[conclusion];
    }
    if (reason.startsWith("agent planner blocked:") ||
        isAuthorizationStopReason(reason) ||
        isRoundLimitStopReason(reason)) {
        return "blocked";
    }
    return "failed";
}
//# sourceMappingURL=sub-orchestration.js.map