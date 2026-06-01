export type SelfApprovalVerdict = "approve" | "request_changes" | "blocked";
export declare const SELF_APPROVAL_STATUS_MARKER = "<!-- sepo-agent-self-approval -->";
export interface SelfApprovalDecision {
    verdict: SelfApprovalVerdict;
    reason: string;
    handoffContext: string;
    inspectedHeadSha: string;
}
export interface SelfApprovalResolveInput {
    allowSelfApprove: boolean;
    targetKind: string;
    prState: string;
    expectedHeadSha: string;
    currentHeadSha: string;
    decision: SelfApprovalDecision | null;
    approvalActorAllowed?: boolean;
    approvalActorReason?: string;
    approvalProvenanceTrusted?: boolean;
    approvalProvenanceReason?: string;
}
export interface SelfApprovalResolveResult {
    conclusion: "approved" | "request_changes" | "blocked" | "failed";
    shouldApprove: boolean;
    reason: string;
    handoffContext: string;
}
export interface SelfApprovalSignalComment {
    body: string;
    authorLogin: string;
    createdAt?: string | number | null;
}
export interface SelfApprovalProvenanceResult {
    trusted: boolean;
    reason: string;
}
export interface SelfApprovalActorResult {
    allowed: boolean;
    reason: string;
}
export declare function envFlagEnabled(value: string | undefined): boolean;
export declare function evaluateSelfApprovalActor(input: {
    approvalActorLogin: string;
    prAuthorLogin: string;
}): SelfApprovalActorResult;
export declare function evaluateSelfApprovalProvenance(input: {
    comments: SelfApprovalSignalComment[];
    trustedActorLogin: string;
    expectedHeadSha: string;
    allowHumanDecisionGate?: boolean;
}): SelfApprovalProvenanceResult;
export declare function parseSelfApprovalDecision(raw: string): SelfApprovalDecision | null;
export declare function resolveSelfApproval(input: SelfApprovalResolveInput): SelfApprovalResolveResult;
export declare function formatSelfApprovalBody(input: {
    conclusion: string;
    reason: string;
    handoffContext?: string;
    approved?: boolean;
    runUrl?: string;
}): string;
//# sourceMappingURL=self-approval.d.ts.map