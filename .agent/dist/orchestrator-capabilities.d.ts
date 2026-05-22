/**
 * Concrete routes that an initial `/orchestrate` request may launch directly or
 * through issue-level delegation.
 */
export declare const ORCHESTRATE_DELEGATED_ROUTES: readonly ["implement", "review", "fix-pr"];
/**
 * Requester and policy context needed to decide whether an initial
 * `/orchestrate` start can use the full delegated route capability set.
 */
export interface InitialOrchestrateCapabilityInput {
    sourceAction: string;
    sourceConclusion: string;
    currentRound: number;
    allowSelfApprove?: boolean;
    allowSelfMerge?: boolean;
    authorAssociation: string;
    accessPolicy: string;
    isPublicRepo: boolean;
}
/**
 * Returns a user-visible stop reason when an initial `/orchestrate` request
 * lacks delegated route capability. Returns an empty string when the check does
 * not apply or the requester is authorized.
 */
export declare function initialOrchestrateCapabilityStopReason(input: InitialOrchestrateCapabilityInput): string;
//# sourceMappingURL=orchestrator-capabilities.d.ts.map