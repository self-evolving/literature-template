export interface OnboardingOptions {
    repo: string;
    authMode: string;
    provider: string;
    providerReason: string;
    openaiConfigured: boolean;
    claudeConfigured: boolean;
    memoryRef: string;
    rubricsRef: string;
    runUrl: string;
    runnerTemp: string;
}
export declare function runOnboardingCheck(opts: OnboardingOptions): number;
//# sourceMappingURL=onboarding.d.ts.map