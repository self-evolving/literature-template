export declare const MAX_BUFFER: number;
export declare function gh(args: string[], cwd?: string): string;
/**
 * Runs `gh api <args>` and returns trimmed stdout. Returns "" on any
 * non-zero exit. Use for best-effort lookups where a 404 is an expected
 * answer (e.g. "is this user a collaborator?").
 */
export declare function ghApi(args: string[]): string;
/**
 * Returns true if `gh api <args>` exits 0. Use for endpoints that return
 * 204 on success (no body) and 404 on absence, where `ghApi` can't
 * distinguish the two.
 */
export declare function ghApiOk(args: string[]): boolean;
export declare function postIssueComment(issueNumber: number, body: string, repo?: string): void;
export declare function postPrComment(prNumber: number, body: string, repo?: string): void;
export declare function updateIssueComment(repo: string, commentId: string | number, body: string): void;
export interface EnsureLabelOptions {
    name: string;
    color: string;
    description: string;
    repo?: string;
}
export declare function ensureLabel(opts: EnsureLabelOptions): void;
export declare function addIssueLabel(issueNumber: number, label: string, repo?: string): void;
export declare function addPrLabel(prNumber: number, label: string, repo?: string): void;
export declare function removeIssueLabel(issueNumber: number, label: string, repo?: string): void;
export declare function removePrLabel(prNumber: number, label: string, repo?: string): void;
export interface PrMeta {
    headRef: string;
    headOid: string;
    isCrossRepository: boolean;
    state: string;
}
export interface IssueCommentRecord {
    id: string;
    body: string;
    authorLogin: string;
    createdAt: string;
}
export interface PrStatusCheckRecord {
    name: string;
    status: string;
    conclusion: string;
    state: string;
}
export interface PrMergeMeta {
    headOid: string;
    isDraft: boolean;
    state: string;
    mergeStateStatus: string;
    mergeable: string;
    reviewDecision: string;
    autoMergeRequestExists: boolean;
    statusChecks: PrStatusCheckRecord[];
}
export interface PrReviewRecord {
    id: string;
    body: string;
    state: string;
    authorLogin: string;
    commitId: string;
    submittedAt: string;
}
export declare function fetchPrMeta(prNumber: number, repo?: string): PrMeta;
export declare function fetchPrMergeMeta(prNumber: number, repo?: string): PrMergeMeta;
export declare function fetchAuthenticatedActorLogin(): string;
export declare function fetchPrAuthorLogin(prNumber: number, repo?: string): string;
export declare function fetchPrReviewRecords(prNumber: number, repo: string): PrReviewRecord[];
export declare function markPullRequestReady(prNumber: number, repo: string): void;
export declare function mergePullRequest(prNumber: number, repo: string, matchHeadCommit: string): void;
export declare function enablePullRequestAutoMerge(prNumber: number, repo: string, matchHeadCommit: string): void;
export declare function fetchIssueCommentRecords(issueNumber: number, repo: string): IssueCommentRecord[];
export declare function upsertPrCommentByMarker(prNumber: number, repo: string, marker: string, body: string): "created" | "updated";
export declare function findExistingPr(headBranch: string, repo?: string): string | null;
export interface CreatePrOptions {
    base: string;
    head: string;
    title: string;
    bodyFile: string;
    draft?: boolean;
    repo?: string;
}
export declare function createPr(opts: CreatePrOptions): string;
export interface CreateIssueOptions {
    title: string;
    bodyFile: string;
    repo?: string;
}
export declare function createIssue(opts: CreateIssueOptions): string;
export declare function dispatchWorkflow(repo: string, workflow: string, ref: string, inputs: Record<string, string>): void;
//# sourceMappingURL=github.d.ts.map