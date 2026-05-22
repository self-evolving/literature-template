export interface ResolveImplementationBaseOptions {
    baseBranch?: string;
    basePr?: string;
    defaultBranch: string;
    repo?: string;
}
export interface ResolvedImplementationBase {
    baseBranch: string;
    source: "default_branch" | "base_branch" | "base_pr";
    basePr?: number;
}
export declare function validateBaseBranch(value: string): string;
export declare function resolveImplementationBase(opts: ResolveImplementationBaseOptions): ResolvedImplementationBase;
export declare function exportImplementationBase(result: ResolvedImplementationBase): void;
//# sourceMappingURL=implementation-base.d.ts.map