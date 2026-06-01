#!/usr/bin/env node
"use strict";
// CLI: deterministically apply managed project-manager label changes.
// Env: BODY_FILE, GITHUB_REPOSITORY, AGENT_PROJECT_MANAGEMENT_DRY_RUN,
//      AGENT_PROJECT_MANAGEMENT_APPLY_LABELS
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const project_management_labels_js_1 = require("../project-management-labels.js");
const output_js_1 = require("../output.js");
function boolEnv(name, fallback = false) {
    const value = (process.env[name] || "").trim().toLowerCase();
    if (!value)
        return fallback;
    return ["1", "true", "yes", "on"].includes(value);
}
function requiredEnv(name) {
    const value = process.env[name]?.trim() || "";
    if (!value)
        throw new Error(`${name} is required`);
    return value;
}
function appendStatus(summary, status) {
    return `${summary.trim()}\n\n### Managed Label Application\n\n${status}\n`;
}
function main() {
    try {
        const bodyFile = requiredEnv("BODY_FILE");
        const repo = requiredEnv("GITHUB_REPOSITORY");
        const dryRun = boolEnv("AGENT_PROJECT_MANAGEMENT_DRY_RUN", true);
        const applyLabels = boolEnv("AGENT_PROJECT_MANAGEMENT_APPLY_LABELS", true);
        const summary = (0, node_fs_1.readFileSync)(bodyFile, "utf8");
        const plan = (0, project_management_labels_js_1.parseManagedLabelPlan)(summary);
        if (!plan.valid) {
            throw new Error("Project management summary did not include a valid fenced JSON label_changes plan.");
        }
        const operationCount = (0, project_management_labels_js_1.countManagedLabelOperations)(plan.label_changes);
        if (dryRun || !applyLabels) {
            const status = dryRun
                ? `- Dry run is enabled; ${operationCount} managed label operation(s) were planned but not applied.`
                : `- Label application is disabled; ${operationCount} managed label operation(s) were planned but not applied.`;
            (0, output_js_1.setOutput)("labels_applied", "false");
            (0, output_js_1.setOutput)("operation_count", String(operationCount));
            (0, output_js_1.setOutput)("summary", appendStatus(summary, status));
            console.log(status);
            return 0;
        }
        if (operationCount > 0) {
            (0, project_management_labels_js_1.ensureManagedLabels)(repo);
            for (const change of plan.label_changes) {
                (0, project_management_labels_js_1.applyManagedLabelChange)(change, repo);
            }
        }
        const status = `- Applied ${operationCount} managed priority/effort label operation(s).`;
        (0, output_js_1.setOutput)("labels_applied", "true");
        (0, output_js_1.setOutput)("operation_count", String(operationCount));
        (0, output_js_1.setOutput)("summary", appendStatus(summary, status));
        console.log(status);
        return 0;
    }
    catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        return 1;
    }
}
process.exitCode = main();
//# sourceMappingURL=apply-project-management-labels.js.map