"use strict";
// CLI: ensure first-run Sepo labels and create/update the setup issue.
// Usage: node .agent/dist/cli/onboarding-check.js
// Env: GITHUB_REPOSITORY, AUTH_MODE, AGENT_PROVIDER, AGENT_PROVIDER_REASON,
//      OPENAI_API_KEY_CONFIGURED, CLAUDE_CODE_OAUTH_TOKEN_CONFIGURED,
//      MEMORY_REF, RUBRICS_REF, RUN_URL
Object.defineProperty(exports, "__esModule", { value: true });
const onboarding_js_1 = require("../onboarding.js");
const output_js_1 = require("../output.js");
function requiredEnv(name) {
    const value = process.env[name]?.trim() ?? "";
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return value;
}
function isTrue(name) {
    return (process.env[name] || "").trim().toLowerCase() === "true";
}
const repo = requiredEnv("GITHUB_REPOSITORY");
const issueNumber = (0, onboarding_js_1.runOnboardingCheck)({
    repo,
    authMode: process.env.AUTH_MODE || "",
    provider: process.env.AGENT_PROVIDER || "",
    providerReason: process.env.AGENT_PROVIDER_REASON || "",
    openaiConfigured: isTrue("OPENAI_API_KEY_CONFIGURED"),
    claudeConfigured: isTrue("CLAUDE_CODE_OAUTH_TOKEN_CONFIGURED"),
    memoryRef: process.env.MEMORY_REF || "agent/memory",
    rubricsRef: process.env.RUBRICS_REF || "agent/rubrics",
    runUrl: process.env.RUN_URL || "",
    runnerTemp: process.env.RUNNER_TEMP || "/tmp",
});
(0, output_js_1.setOutput)("issue_number", String(issueNumber));
console.log(`Sepo onboarding issue is #${issueNumber}.`);
//# sourceMappingURL=onboarding-check.js.map