import { type GraphQLClient } from "./github-graphql.js";
type CollapsePreviousReviewSummariesOptions = {
    repo: string;
    prNumber: number;
    client?: GraphQLClient;
};
type CollapsePreviousHandoffCommentsOptions = {
    repo: string;
    targetNumber: number;
    targetKind: "issue" | "pull_request";
    excludeCommentId?: string;
    currentCreatedAtMs?: number;
    client?: GraphQLClient;
};
export declare function isRubricsReviewBody(body: string): boolean;
/**
 * Collapses older agent-generated PR review summaries before posting a fresh one.
 */
export declare function collapsePreviousReviewSummaries(options: CollapsePreviousReviewSummariesOptions): number;
/**
 * Collapses older agent-generated rubrics reviews before posting a fresh one.
 */
export declare function collapsePreviousRubricsReviews(options: CollapsePreviousReviewSummariesOptions): number;
/**
 * Collapses older agent-generated fix-pr status comments before posting a fresh one.
 */
export declare function collapsePreviousFixPrComments(options: CollapsePreviousReviewSummariesOptions): number;
/**
 * Collapses older orchestrator handoff marker comments after a fresh dispatch.
 */
export declare function collapsePreviousHandoffComments(options: CollapsePreviousHandoffCommentsOptions): number;
export {};
//# sourceMappingURL=review-summary-minimize.d.ts.map