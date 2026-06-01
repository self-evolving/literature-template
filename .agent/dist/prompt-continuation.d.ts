export declare function buildContinuationPrompt(promptVars: Record<string, string>): string;
export declare function shouldReplayFullPromptOnResume(route: string, promptVars: Record<string, string>): boolean;
export declare function selectContinuationPromptForResume(options: {
    route: string;
    promptVars: Record<string, string>;
    continuationPrompt: string;
}): string | undefined;
//# sourceMappingURL=prompt-continuation.d.ts.map