"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAutomationMode = normalizeAutomationMode;
exports.automationModeAllowsHandoff = automationModeAllowsHandoff;
exports.normalizeConclusion = normalizeConclusion;
exports.normalizeRecommendedNextStep = normalizeRecommendedNextStep;
exports.formatMarkdownTableCell = formatMarkdownTableCell;
exports.formatTransposedMarkdownTable = formatTransposedMarkdownTable;
exports.defaultFixPrHandoffContext = defaultFixPrHandoffContext;
exports.extractReviewActionItems = extractReviewActionItems;
exports.buildReviewFixPrHandoffContext = buildReviewFixPrHandoffContext;
exports.parsePlannerDecision = parsePlannerDecision;
exports.extractReviewConclusion = extractReviewConclusion;
exports.extractReviewRecommendedNextStep = extractReviewRecommendedNextStep;
exports.buildHandoffDedupeKey = buildHandoffDedupeKey;
exports.buildHandoffMarker = buildHandoffMarker;
exports.parseHandoffMarker = parseHandoffMarker;
exports.getHandoffMarkerState = getHandoffMarkerState;
exports.hasHandoffMarker = hasHandoffMarker;
exports.parseAnyHandoffMarker = parseAnyHandoffMarker;
exports.hasAnyHandoffMarker = hasAnyHandoffMarker;
exports.isPendingHandoffMarkerStale = isPendingHandoffMarkerStale;
exports.formatHandoffMarkerComment = formatHandoffMarkerComment;
exports.decideHandoff = decideHandoff;
const response_js_1 = require("./response.js");
const REVIEW_TO_FIX_PR = new Set(["minor_issues", "needs_rework", "changes_requested"]);
const SELF_APPROVAL_TO_FIX_PR = new Set(["request_changes", "changes_requested"]);
const PLANNER_DECISION_KINDS = {
    handoff: "handoff",
    delegate_issue: "delegate_issue",
    answer: "answer",
    stop: "stop",
    blocked: "blocked",
};
const HANDOFF_MARKER_PREFIX = "sepo-agent-handoff";
const DEFAULT_FIX_PR_HANDOFF_CONTEXT = [
    "Address only the latest unresolved review synthesis action items.",
    "Ignore optional INFO notes, metadata-only polish, already-fixed findings, and human-judgment nits unless required by the selected fix.",
].join(" ");
const DEFAULT_SELF_APPROVAL_FIX_PR_HANDOFF_CONTEXT = [
    "Address only the self-approval REQUEST_CHANGES findings.",
    "Preserve the reviewed-head and deterministic approval safeguards; avoid unrelated changes.",
].join(" ");
const ANY_HANDOFF_MARKER_RE = new RegExp(`<!--\\s*${HANDOFF_MARKER_PREFIX}(?:\\s+state:(pending|dispatched|failed))?(?:\\s+created:(\\d+))?\\s+base64:[A-Za-z0-9_-]+\\s*-->`, "i");
function normalizeToken(value) {
    return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}
function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function normalizeAutomationMode(value) {
    const normalized = normalizeToken(String(value || ""));
    if (!normalized || normalized === "false") {
        return "disabled";
    }
    // Backward-compatible alias for early boolean-style automation config.
    if (normalized === "true") {
        return "heuristics";
    }
    // The built-in heuristic state machine. Use the canonical plural spelling only.
    if (normalized === "heuristics") {
        return "heuristics";
    }
    if (normalized === "agent") {
        return "agent";
    }
    return "disabled";
}
function automationModeAllowsHandoff(value) {
    return normalizeAutomationMode(value) !== "disabled";
}
function normalizeConclusion(value) {
    const normalized = normalizeToken(value);
    if (normalized === "success")
        return "success";
    if (normalized === "ship")
        return "ship";
    if (normalized === "minor_issues")
        return "minor_issues";
    if (normalized === "needs_rework")
        return "needs_rework";
    if (normalized === "changes_requested")
        return "changes_requested";
    return normalized || "unknown";
}
function normalizeRecommendedNextStep(value) {
    const normalized = normalizeToken(value);
    if (normalized === "fix_pr")
        return "fix_pr";
    if (normalized === "human_decision")
        return "human_decision";
    if (normalized === "no_automated_action")
        return "no_automated_action";
    return normalized;
}
function formatMarkdownTableCell(value) {
    return String(value)
        .replace(/\r?\n/g, " ")
        .replace(/\|/g, "\\|")
        .trim() || " ";
}
function formatTransposedMarkdownTable(headers, values) {
    return [
        `| ${headers.map(formatMarkdownTableCell).join(" | ")} |`,
        `| ${headers.map(() => "---").join(" | ")} |`,
        `| ${values.map(formatMarkdownTableCell).join(" | ")} |`,
    ];
}
function defaultFixPrHandoffContext() {
    return DEFAULT_FIX_PR_HANDOFF_CONTEXT;
}
function extractMarkdownSection(markdown, heading) {
    const lines = String(markdown || "").split(/\r?\n/);
    const wanted = normalizeToken(heading);
    const section = [];
    let inSection = false;
    for (const line of lines) {
        const headingMatch = line.match(/^##\s+(.+?)\s*$/);
        if (headingMatch) {
            if (inSection)
                break;
            inSection = normalizeToken(headingMatch[1]) === wanted;
            continue;
        }
        if (inSection)
            section.push(line);
    }
    return section.join("\n").trim();
}
function normalizeReviewActionItem(line) {
    return line
        .replace(/\s+/g, " ")
        .trim();
}
function extractReviewActionItems(markdown) {
    const section = extractMarkdownSection(markdown, "Action Items");
    if (!section)
        return [];
    const items = [];
    for (const line of section.split(/\r?\n/)) {
        const checkbox = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.+?)\s*$/);
        if (checkbox) {
            if (checkbox[1].trim())
                continue;
            const item = normalizeReviewActionItem(checkbox[2]);
            if (item)
                items.push(item);
            continue;
        }
        const bullet = line.match(/^\s*[-*]\s+(.+?)\s*$/);
        if (bullet) {
            const item = normalizeReviewActionItem(bullet[1]);
            if (item)
                items.push(item);
        }
    }
    return items;
}
function buildReviewFixPrHandoffContext(markdown) {
    const items = extractReviewActionItems(markdown).slice(0, 5);
    if (!items.length)
        return defaultFixPrHandoffContext();
    return [
        "Address only the latest review synthesis action items:",
        ...items.map((item) => `- ${item}`),
        "",
        "Constraints: Ignore optional INFO notes, metadata-only polish, already-fixed findings, and human-judgment nits unless required by those action items.",
    ].join("\n");
}
function resolveFixPrHandoffContext(input) {
    return String(input.sourceHandoffContext || "").trim() || defaultFixPrHandoffContext();
}
function resolveSelfApprovalFixPrHandoffContext(input) {
    return String(input.sourceHandoffContext || "").trim() || DEFAULT_SELF_APPROVAL_FIX_PR_HANDOFF_CONTEXT;
}
function normalizeAgentAction(value) {
    const normalized = normalizeToken(value);
    if (normalized === "implement")
        return "implement";
    if (normalized === "review")
        return "review";
    if (normalized === "fix_pr")
        return "fix-pr";
    if (normalized === "agent_self_approve")
        return "agent-self-approve";
    if (normalized === "agent_self_merge")
        return "agent-self-merge";
    return null;
}
function parsePlannerDecision(raw) {
    const json = (0, response_js_1.extractJsonObject)(raw);
    if (!json)
        return null;
    let parsed;
    try {
        parsed = JSON.parse(json);
    }
    catch {
        return null;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        return null;
    const record = parsed;
    const decisionToken = normalizeToken(String(record.decision || ""));
    const decision = PLANNER_DECISION_KINDS[decisionToken];
    if (!decision)
        return null;
    const nextAction = normalizeAgentAction(String(record.next_action ?? record.nextAction ?? ""));
    const reason = String(record.reason || "").trim();
    const handoffContext = String(record.handoff_context ?? record.handoffContext ?? "").trim();
    const userMessage = String(record.user_message ?? record.userMessage ?? "").trim();
    const clarificationRequest = String(record.clarification_request ?? record.clarificationRequest ?? "").trim();
    const childStage = String(record.child_stage ?? record.childStage ?? record.stage ?? "").trim();
    const childInstructions = String(record.child_instructions ?? record.childInstructions ?? record.task_instructions ?? record.taskInstructions ?? "").trim();
    const childIssueNumber = String(record.child_issue_number ?? record.childIssueNumber ?? record.target_issue_number ?? record.targetIssueNumber ?? "").trim();
    const baseBranch = String(record.base_branch ?? record.baseBranch ?? "").trim();
    const basePr = String(record.base_pr ?? record.basePr ?? "").trim();
    const plannerDecision = {
        decision,
        nextAction: nextAction || undefined,
        reason: reason || "agent planner returned no reason",
    };
    if (handoffContext) {
        plannerDecision.handoffContext = handoffContext;
    }
    if (userMessage)
        plannerDecision.userMessage = userMessage;
    if (clarificationRequest)
        plannerDecision.clarificationRequest = clarificationRequest;
    if (childStage)
        plannerDecision.childStage = childStage;
    if (childInstructions)
        plannerDecision.childInstructions = childInstructions;
    if (childIssueNumber)
        plannerDecision.childIssueNumber = childIssueNumber;
    if (baseBranch)
        plannerDecision.baseBranch = baseBranch;
    if (basePr)
        plannerDecision.basePr = basePr;
    return plannerDecision;
}
function extractReviewConclusion(markdown) {
    const text = markdown || "";
    const verdictMatch = text.match(/##\s*Final Verdict\s*\n+\s*[-*]?\s*`?([A-Z_ -]+)`?/i);
    if (verdictMatch)
        return normalizeConclusion(verdictMatch[1]);
    const inlineMatch = text.match(/\b(SHIP|MINOR[_ -]ISSUES|NEEDS[_ -]REWORK|CHANGES[_ -]REQUESTED)\b/i);
    return inlineMatch ? normalizeConclusion(inlineMatch[1]) : "unknown";
}
function extractReviewRecommendedNextStep(markdown) {
    const section = extractMarkdownSection(markdown, "Recommended Next Step");
    const text = section || markdown || "";
    const match = text.match(/\b(FIX_PR|HUMAN_DECISION|NO_AUTOMATED_ACTION)\b/i);
    return match ? normalizeRecommendedNextStep(match[1]) : "";
}
function buildHandoffDedupeKey(input) {
    return [
        "handoff",
        input.repo.trim().toLowerCase(),
        input.sourceRunId.trim() || "unknown-run",
        normalizeToken(input.sourceAction),
        input.sourceTargetNumber.trim(),
        normalizeToken(input.nextAction),
        input.nextTargetNumber.trim(),
        String(input.nextRound),
    ].join(":");
}
function encodeMarkerKey(key) {
    return Buffer.from(key, "utf8").toString("base64url");
}
function buildHandoffMarker(key, state = "dispatched", createdAtMs = Date.now()) {
    return `<!-- ${HANDOFF_MARKER_PREFIX} state:${state} created:${Math.trunc(createdAtMs)} base64:${encodeMarkerKey(key)} -->`;
}
function parseHandoffMarker(body, key) {
    const encoded = escapeRegex(encodeMarkerKey(key));
    const markerRe = new RegExp(`<!--\\s*${HANDOFF_MARKER_PREFIX}(?:\\s+state:(pending|dispatched|failed))?(?:\\s+created:(\\d+))?\\s+base64:${encoded}\\s*-->`, "i");
    const match = String(body || "").match(markerRe);
    if (!match)
        return null;
    const rawState = String(match[1] || "dispatched").toLowerCase();
    const state = rawState === "pending" || rawState === "failed"
        ? rawState
        : "dispatched";
    const createdAtMs = match[2] ? Number.parseInt(match[2], 10) : NaN;
    return {
        state,
        createdAtMs: Number.isFinite(createdAtMs) && createdAtMs > 0 ? createdAtMs : null,
    };
}
function getHandoffMarkerState(body, key) {
    return parseHandoffMarker(body, key)?.state ?? null;
}
function hasHandoffMarker(body, key) {
    return parseHandoffMarker(body, key) !== null;
}
function parseAnyHandoffMarker(body) {
    const match = String(body || "").match(ANY_HANDOFF_MARKER_RE);
    if (!match)
        return null;
    const rawState = String(match[1] || "dispatched").toLowerCase();
    const state = rawState === "pending" || rawState === "failed"
        ? rawState
        : "dispatched";
    const createdAtMs = match[2] ? Number.parseInt(match[2], 10) : NaN;
    return {
        state,
        createdAtMs: Number.isFinite(createdAtMs) && createdAtMs > 0 ? createdAtMs : null,
    };
}
function hasAnyHandoffMarker(body) {
    return parseAnyHandoffMarker(body) !== null;
}
function isPendingHandoffMarkerStale(marker, nowMs, ttlMs) {
    if (marker.state !== "pending")
        return false;
    if (!marker.createdAtMs)
        return true;
    return marker.createdAtMs + ttlMs <= nowMs;
}
function formatHandoffMarkerComment(args) {
    const state = args.state || "dispatched";
    const status = state === "pending"
        ? "pending"
        : state === "failed"
            ? "failed"
            : "dispatched";
    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
    const normalizedTargetKind = normalizeToken(args.targetKind || "");
    const targetLabel = args.targetNumber
        ? `${normalizedTargetKind === "issue" ? "Issue" : "PR"} #${args.targetNumber}`
        : "Unknown";
    const lines = [
        status === "failed"
            ? "Sepo could not dispatch follow-up automation."
            : status === "pending"
                ? "Sepo is preparing follow-up automation."
                : "Sepo is dispatching follow-up automation.",
        "",
        ...formatTransposedMarkdownTable(["Source", "Next", "Target", "Round", "Status"], [args.sourceAction, args.nextAction, targetLabel, `${args.nextRound} / ${args.maxRounds}`, statusLabel]),
        "",
        `Reason: ${args.reason}`,
    ];
    if (normalizeToken(args.nextAction) === "fix_pr") {
        lines.push("", "Task for fix-pr:", String(args.handoffContext || "").trim() || defaultFixPrHandoffContext());
    }
    if (args.error) {
        lines.push("", `Dispatch error: ${args.error}`);
    }
    lines.push("", buildHandoffMarker(args.key, state, args.createdAtMs));
    return lines.join("\n");
}
function decideHeuristicHandoff(input) {
    const nextRound = input.currentRound + 1;
    const sourceAction = normalizeToken(input.sourceAction);
    const conclusion = normalizeConclusion(input.sourceConclusion);
    const nextTarget = (input.nextTargetNumber || input.targetNumber).trim();
    if (sourceAction === "implement") {
        if (conclusion !== "success") {
            return { decision: "stop", reason: `implement concluded ${conclusion}`, nextRound };
        }
        if (!input.nextTargetNumber?.trim()) {
            return { decision: "stop", reason: "implement did not produce a pull request target", nextRound };
        }
        return {
            decision: "dispatch",
            nextAction: "review",
            targetNumber: nextTarget,
            reason: "implementation succeeded; dispatching review",
            nextRound,
        };
    }
    if (sourceAction === "fix_pr") {
        if (conclusion !== "success") {
            return {
                decision: "stop",
                reason: `fix-pr concluded ${conclusion}; no automatic handoff was dispatched because fix-pr must succeed before re-review`,
                nextRound,
            };
        }
        return {
            decision: "dispatch",
            nextAction: "review",
            targetNumber: nextTarget,
            reason: "PR fixes succeeded; dispatching review",
            nextRound,
        };
    }
    if (sourceAction === "review") {
        const recommendedNextStep = normalizeRecommendedNextStep(input.sourceRecommendedNextStep || "");
        if (recommendedNextStep === "human_decision") {
            if (input.allowSelfApprove) {
                return {
                    decision: "dispatch",
                    nextAction: "agent-self-approve",
                    targetNumber: nextTarget,
                    reason: `review recommended HUMAN_DECISION after ${conclusion}; dispatching agent-self-approve`,
                    nextRound,
                };
            }
            return { decision: "stop", reason: `review recommended HUMAN_DECISION after ${conclusion}`, nextRound };
        }
        if (conclusion === "ship") {
            if (input.allowSelfApprove) {
                return {
                    decision: "dispatch",
                    nextAction: "agent-self-approve",
                    targetNumber: nextTarget,
                    reason: "review verdict is SHIP; dispatching agent-self-approve",
                    nextRound,
                };
            }
            return { decision: "stop", reason: "review verdict is SHIP", nextRound };
        }
        if (REVIEW_TO_FIX_PR.has(conclusion)) {
            return {
                decision: "dispatch",
                nextAction: "fix-pr",
                targetNumber: nextTarget,
                reason: `review verdict is ${conclusion}; dispatching fix-pr`,
                nextRound,
                handoffContext: resolveFixPrHandoffContext(input),
            };
        }
        return { decision: "stop", reason: `review verdict ${conclusion} has no handoff`, nextRound };
    }
    if (sourceAction === "agent_self_approve") {
        if (SELF_APPROVAL_TO_FIX_PR.has(conclusion)) {
            return {
                decision: "dispatch",
                nextAction: "fix-pr",
                targetNumber: nextTarget,
                reason: `agent-self-approve concluded ${conclusion}; dispatching fix-pr`,
                nextRound,
                handoffContext: resolveSelfApprovalFixPrHandoffContext(input),
            };
        }
        if (conclusion === "approved" && input.allowSelfMerge) {
            return {
                decision: "dispatch",
                nextAction: "agent-self-merge",
                targetNumber: nextTarget,
                reason: "agent-self-approve concluded approved; dispatching agent-self-merge",
                nextRound,
            };
        }
        return { decision: "stop", reason: `agent-self-approve concluded ${conclusion}`, nextRound };
    }
    if (sourceAction === "agent_self_merge") {
        return { decision: "stop", reason: `agent-self-merge concluded ${conclusion}`, nextRound };
    }
    return { decision: "stop", reason: `unsupported source action ${input.sourceAction}`, nextRound };
}
function decideAgentHandoff(input) {
    const nextRound = input.currentRound + 1;
    const plannerDecision = input.plannerDecision;
    if (!plannerDecision) {
        return { decision: "stop", reason: "agent planner decision missing or invalid", nextRound };
    }
    if (plannerDecision.decision === "stop" || plannerDecision.decision === "blocked") {
        return {
            decision: "stop",
            reason: `agent planner ${plannerDecision.decision}: ${plannerDecision.reason}`,
            nextRound,
            plannerDecisionKind: plannerDecision.decision,
            userMessage: plannerDecision.userMessage,
            clarificationRequest: plannerDecision.clarificationRequest,
        };
    }
    if (plannerDecision.decision === "answer") {
        if (plannerDecision.nextAction) {
            return { decision: "stop", reason: "answer must not set next_action", nextRound };
        }
        return {
            decision: "stop",
            reason: `agent planner answered: ${plannerDecision.reason}`,
            nextRound,
            plannerDecisionKind: "answer",
            userMessage: plannerDecision.userMessage || plannerDecision.handoffContext,
        };
    }
    if (plannerDecision.decision === "delegate_issue") {
        const sourceAction = normalizeToken(input.sourceAction);
        const targetKind = normalizeToken(input.targetKind || "");
        if (plannerDecision.nextAction) {
            return { decision: "stop", reason: "delegate_issue must not set next_action", nextRound };
        }
        if (sourceAction !== "orchestrate") {
            return { decision: "stop", reason: "delegate_issue is only allowed from meta orchestration", nextRound };
        }
        if (targetKind && targetKind !== "issue") {
            return { decision: "stop", reason: "meta orchestration can delegate child issues only from issues", nextRound };
        }
        if (plannerDecision.baseBranch && plannerDecision.basePr) {
            return { decision: "stop", reason: "agent planner set both base_branch and base_pr", nextRound };
        }
        if (!plannerDecision.childIssueNumber && !plannerDecision.childInstructions && !plannerDecision.handoffContext) {
            return {
                decision: "stop",
                reason: "agent planner requested child issue delegation without child instructions or existing issue",
                nextRound,
            };
        }
        return {
            decision: "delegate_issue",
            reason: `agent planner selected child issue delegation: ${plannerDecision.reason}`,
            nextRound,
            targetNumber: plannerDecision.childIssueNumber || input.targetNumber,
            handoffContext: plannerDecision.handoffContext,
            childStage: plannerDecision.childStage || `stage-${nextRound - 1}`,
            childInstructions: plannerDecision.childInstructions || plannerDecision.handoffContext,
            childIssueNumber: plannerDecision.childIssueNumber,
            baseBranch: plannerDecision.baseBranch,
            basePr: plannerDecision.basePr,
        };
    }
    if (!plannerDecision.nextAction) {
        return { decision: "stop", reason: "agent planner requested handoff without next_action", nextRound };
    }
    const sourceAction = normalizeToken(input.sourceAction);
    const targetKind = normalizeToken(input.targetKind || "");
    if (sourceAction === "orchestrate" && plannerDecision.nextAction === "implement") {
        if (targetKind && targetKind !== "issue") {
            return { decision: "stop", reason: "issue orchestration can dispatch implement only for issue targets", nextRound };
        }
        if (plannerDecision.baseBranch && plannerDecision.basePr) {
            return { decision: "stop", reason: "agent planner set both base_branch and base_pr", nextRound };
        }
        return {
            decision: "dispatch",
            nextAction: "implement",
            targetNumber: input.targetNumber,
            reason: `agent planner selected implement: ${plannerDecision.reason}`,
            nextRound,
            handoffContext: plannerDecision.handoffContext,
            baseBranch: plannerDecision.baseBranch,
            basePr: plannerDecision.basePr,
        };
    }
    if (sourceAction === "orchestrate" && targetKind === "pull_request") {
        if (plannerDecision.nextAction === "review" || plannerDecision.nextAction === "fix-pr") {
            if (plannerDecision.nextAction === "fix-pr" && !plannerDecision.handoffContext) {
                return {
                    decision: "stop",
                    reason: "agent planner selected fix-pr for PR orchestration without handoff_context",
                    nextRound,
                };
            }
            return {
                decision: "dispatch",
                nextAction: plannerDecision.nextAction,
                targetNumber: input.targetNumber,
                reason: `agent planner selected ${plannerDecision.nextAction}: ${plannerDecision.reason}`,
                nextRound,
                handoffContext: plannerDecision.handoffContext,
            };
        }
        return {
            decision: "stop",
            reason: `agent planner requested ${plannerDecision.nextAction}, but PR orchestration can dispatch only review or fix-pr`,
            nextRound,
        };
    }
    const allowed = decideHeuristicHandoff(input);
    if (allowed.decision !== "dispatch" || !allowed.nextAction) {
        return {
            decision: "stop",
            reason: `agent planner requested ${plannerDecision.nextAction}, but policy disallows handoff: ${allowed.reason}`,
            nextRound,
        };
    }
    if (plannerDecision.nextAction !== allowed.nextAction) {
        return {
            decision: "stop",
            reason: `agent planner requested ${plannerDecision.nextAction}, but policy only allows ${allowed.nextAction}`,
            nextRound,
        };
    }
    return {
        ...allowed,
        reason: `agent planner selected ${allowed.nextAction}: ${plannerDecision.reason}`,
        handoffContext: plannerDecision.handoffContext || allowed.handoffContext,
    };
}
function decideHandoff(input) {
    const nextRound = input.currentRound + 1;
    const automationMode = normalizeAutomationMode(input.automationMode);
    if (automationMode === "disabled") {
        return { decision: "skip", reason: "automation mode is disabled", nextRound };
    }
    if (input.currentRound >= input.maxRounds) {
        return { decision: "stop", reason: "automation round budget exhausted", nextRound };
    }
    if (automationMode === "agent") {
        return decideAgentHandoff(input);
    }
    return decideHeuristicHandoff(input);
}
//# sourceMappingURL=handoff.js.map