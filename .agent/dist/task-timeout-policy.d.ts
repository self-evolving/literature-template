export declare const DEFAULT_TASK_TIMEOUT_MINUTES = 30;
export declare const MAX_TASK_TIMEOUT_MINUTES = 360;
export interface TaskTimeoutPolicy {
    defaultMinutes: number;
    routeOverrides: Record<string, number>;
}
export declare function parseTaskTimeoutPolicy(raw: string): TaskTimeoutPolicy;
export declare function getTaskTimeoutMinutesForRoute(policy: TaskTimeoutPolicy, route: string): number;
//# sourceMappingURL=task-timeout-policy.d.ts.map