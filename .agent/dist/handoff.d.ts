export type AgentAction = "implement" | "review" | "fix-pr" | "agent-self-approve" | "agent-self-merge";
export type HandoffDecisionKind = "dispatch" | "delegate_issue" | "stop" | "skip";
export type AutomationMode = "disabled" | "heuristics" | "agent";
export type HandoffMarkerState = "pending" | "dispatched" | "failed";
export type PlannerDecisionKind = "handoff" | "delegate_issue" | "answer" | "stop" | "blocked";
export interface HandoffInput {
    automationMode: string;
    sourceAction: string;
    sourceConclusion: string;
    sourceRecommendedNextStep?: string;
    sourceHandoffContext?: string;
    targetKind?: string;
    targetNumber: string;
    nextTargetNumber?: string;
    currentRound: number;
    maxRounds: number;
    allowSelfApprove?: boolean;
    allowSelfMerge?: boolean;
    plannerDecision?: PlannerDecision | null;
}
export interface HandoffDecision {
    decision: HandoffDecisionKind;
    nextAction?: AgentAction;
    targetNumber?: string;
    reason: string;
    nextRound: number;
    handoffContext?: string;
    plannerDecisionKind?: PlannerDecisionKind;
    userMessage?: string;
    clarificationRequest?: string;
    childStage?: string;
    childInstructions?: string;
    childIssueNumber?: string;
    baseBranch?: string;
    basePr?: string;
}
export interface HandoffDedupeInput {
    repo: string;
    sourceRunId: string;
    sourceAction: string;
    sourceTargetNumber: string;
    nextAction: string;
    nextTargetNumber: string;
    nextRound: number;
}
export interface HandoffMarkerInfo {
    state: HandoffMarkerState;
    createdAtMs: number | null;
}
export interface PlannerDecision {
    decision: PlannerDecisionKind;
    nextAction?: AgentAction;
    reason: string;
    handoffContext?: string;
    userMessage?: string;
    clarificationRequest?: string;
    childStage?: string;
    childInstructions?: string;
    childIssueNumber?: string;
    baseBranch?: string;
    basePr?: string;
}
export declare function normalizeAutomationMode(value: string): AutomationMode;
export declare function automationModeAllowsHandoff(value: string): boolean;
export declare function normalizeConclusion(value: string): string;
export declare function normalizeRecommendedNextStep(value: string): string;
export declare function formatMarkdownTableCell(value: string | number): string;
export declare function formatTransposedMarkdownTable(headers: string[], values: Array<string | number>): string[];
export declare function defaultFixPrHandoffContext(): string;
export declare function extractReviewActionItems(markdown: string): string[];
export declare function buildReviewFixPrHandoffContext(markdown: string): string;
export declare function parsePlannerDecision(raw: string): PlannerDecision | null;
export declare function extractReviewConclusion(markdown: string): string;
export declare function extractReviewRecommendedNextStep(markdown: string): string;
export declare function buildHandoffDedupeKey(input: HandoffDedupeInput): string;
export declare function buildHandoffMarker(key: string, state?: HandoffMarkerState, createdAtMs?: number): string;
export declare function parseHandoffMarker(body: string, key: string): HandoffMarkerInfo | null;
export declare function getHandoffMarkerState(body: string, key: string): HandoffMarkerState | null;
export declare function hasHandoffMarker(body: string, key: string): boolean;
export declare function parseAnyHandoffMarker(body: string): HandoffMarkerInfo | null;
export declare function hasAnyHandoffMarker(body: string): boolean;
export declare function isPendingHandoffMarkerStale(marker: HandoffMarkerInfo, nowMs: number, ttlMs: number): boolean;
export declare function formatHandoffMarkerComment(args: {
    key: string;
    state?: HandoffMarkerState;
    sourceAction: string;
    nextAction: string;
    targetKind?: string;
    targetNumber?: string | number;
    nextRound: number;
    maxRounds: number;
    reason: string;
    handoffContext?: string;
    error?: string;
    createdAtMs?: number;
}): string;
export declare function decideHandoff(input: HandoffInput): HandoffDecision;
//# sourceMappingURL=handoff.d.ts.map