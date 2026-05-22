export type ProjectItemKind = "issue" | "pull_request";
export interface ManagedLabelChange {
    kind: ProjectItemKind;
    number: number;
    add: string[];
    remove: string[];
}
export interface ManagedLabelPlan {
    label_changes: ManagedLabelChange[];
    valid: boolean;
}
export declare function parseManagedLabelPlan(markdown: string): ManagedLabelPlan;
export declare function ensureManagedLabels(repo: string): void;
export declare function applyManagedLabelChange(change: ManagedLabelChange, repo: string): void;
export declare function countManagedLabelOperations(changes: ManagedLabelChange[]): number;
//# sourceMappingURL=project-management-labels.d.ts.map