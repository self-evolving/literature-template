#!/usr/bin/env node
"use strict";
// CLI: resolve the GitHub Actions step timeout for a run-agent-task invocation.
//
// Env:
//   ROUTE                      current route (e.g., answer, review)
//   AGENT_TASK_TIMEOUT_POLICY  raw JSON policy string (optional)
//
// Outputs:
//   minutes                    resolved positive integer timeout
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTaskTimeoutMinutes = resolveTaskTimeoutMinutes;
exports.runResolveTaskTimeoutCli = runResolveTaskTimeoutCli;
const output_js_1 = require("../output.js");
const task_timeout_policy_js_1 = require("../task-timeout-policy.js");
function resolveTaskTimeoutMinutes(env = process.env) {
    const route = String(env.ROUTE || "").trim().toLowerCase();
    const policy = (0, task_timeout_policy_js_1.parseTaskTimeoutPolicy)(env.AGENT_TASK_TIMEOUT_POLICY || "");
    return (0, task_timeout_policy_js_1.getTaskTimeoutMinutesForRoute)(policy, route);
}
function runResolveTaskTimeoutCli(env = process.env) {
    try {
        const minutes = resolveTaskTimeoutMinutes(env);
        (0, output_js_1.setOutput)("minutes", String(minutes));
        console.log(`task timeout: ${minutes} minutes`);
        return 0;
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Invalid AGENT_TASK_TIMEOUT_POLICY: ${msg}`);
        return 2;
    }
}
if (require.main === module) {
    process.exitCode = runResolveTaskTimeoutCli();
}
//# sourceMappingURL=resolve-task-timeout.js.map