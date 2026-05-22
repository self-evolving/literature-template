import { type PrReviewRecord, type PrStatusCheckRecord } from "./github.js";
export type SelfMergeConclusion = "merged" | "auto_merge_enabled" | "blocked" | "failed";
export type SelfMergeNextStep = "merge" | "enable_auto_merge" | "none";
export declare const SELF_MERGE_STATUS_MARKER = "<!-- sepo-agent-self-merge -->";
export interface SelfMergeApprovalResult {
    approved: boolean;
    approvedHeadSha: string;
    reason: string;
}
export interface SelfMergeStatusSummary {
    total: number;
    pending: number;
    failed: number;
    pendingNames: string[];
    failedNames: string[];
}
export interface SelfMergeResolveInput {
    allowSelfMerge: boolean;
    targetKind: string;
    prState: string;
    isDraft: boolean;
    currentHeadSha: string;
    reviewDecision: string;
    mergeStateStatus: string;
    mergeable: string;
    autoMergeRequestExists?: boolean;
    statusChecks: PrStatusCheckRecord[];
    approval: SelfMergeApprovalResult;
}
export interface SelfMergeResolveResult {
    conclusion: SelfMergeConclusion;
    nextStep: SelfMergeNextStep;
    markReady: boolean;
    reason: string;
}
export declare function summarizeStatusChecks(checks: PrStatusCheckRecord[]): SelfMergeStatusSummary;
export declare function evaluateSelfMergeApproval(input: {
    reviews: PrReviewRecord[];
    trustedActorLogin: string;
    currentHeadSha: string;
}): SelfMergeApprovalResult;
export declare function resolveSelfMerge(input: SelfMergeResolveInput): SelfMergeResolveResult;
export declare function formatSelfMergeBody(input: {
    conclusion: SelfMergeConclusion | string;
    reason: string;
    runUrl?: string;
}): string;
//# sourceMappingURL=self-merge.d.ts.map