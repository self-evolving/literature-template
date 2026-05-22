export type SubOrchestratorState = "running" | "done" | "blocked" | "failed";
export interface SubOrchestratorMarker {
    parent: number;
    stage: string;
    state: SubOrchestratorState;
    parentRound?: number;
}
export interface SubOrchestratorChildLink {
    parent: number;
    stage: string;
    child: number;
}
export declare function normalizeSubOrchestratorStage(value: string): string;
export declare function formatSubOrchestratorMarker(input: {
    parent: number;
    stage: string;
    state?: SubOrchestratorState;
    parentRound?: number;
}): string;
export declare function parseSubOrchestratorMarker(body: string): SubOrchestratorMarker | null;
export declare function formatSubOrchestratorChildLinkMarker(input: {
    parent: number;
    stage: string;
    child: number;
}): string;
export declare function parseSubOrchestratorChildLinkMarker(body: string): SubOrchestratorChildLink | null;
export declare function updateSubOrchestratorMarkerState(body: string, state: SubOrchestratorState): string;
export declare function updateSubOrchestratorMarkerParentRound(body: string, parentRound: number): string;
export declare function formatSubOrchestrationIssueBody(input: {
    parentIssue: number;
    stage: string;
    taskInstructions: string;
    baseBranch?: string;
    basePr?: string;
    parentRound?: number;
}): string;
export declare function extractClosingIssueNumber(text: string, currentRepo?: string): number | null;
export declare function resultStateFromTerminal(input: {
    sourceAction: string;
    sourceConclusion: string;
    reason: string;
}): SubOrchestratorState;
//# sourceMappingURL=sub-orchestration.d.ts.map