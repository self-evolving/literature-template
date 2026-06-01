"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildContinuationPrompt = buildContinuationPrompt;
exports.shouldReplayFullPromptOnResume = shouldReplayFullPromptOnResume;
exports.selectContinuationPromptForResume = selectContinuationPromptForResume;
function buildContinuationPrompt(promptVars) {
    return [
        "Trigger metadata:",
        `- Triggering source kind: \`${promptVars.REQUEST_SOURCE_KIND || ""}\``,
        `- Triggering comment/review ID: \`${promptVars.REQUEST_COMMENT_ID || ""}\``,
        `- Triggering comment/review URL: \`${promptVars.REQUEST_COMMENT_URL || ""}\``,
        "",
        promptVars.REQUEST_TEXT || "",
    ].join("\n");
}
function shouldReplayFullPromptOnResume(route, promptVars) {
    return route === "fix-pr" && Boolean((promptVars.ORCHESTRATOR_CONTEXT || "").trim());
}
function selectContinuationPromptForResume(options) {
    if (shouldReplayFullPromptOnResume(options.route, options.promptVars)) {
        return undefined;
    }
    return options.continuationPrompt;
}
//# sourceMappingURL=prompt-continuation.js.map