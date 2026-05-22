#!/usr/bin/env node
"use strict";
// CLI: publish the project-manager agent's final summary.
// Env: BODY or BODY_FILE, GITHUB_STEP_SUMMARY, GITHUB_REPOSITORY,
//      AGENT_PROJECT_MANAGEMENT_POST_SUMMARY,
//      AGENT_PROJECT_MANAGEMENT_DISCUSSION_CATEGORY,
//      AGENT_PROJECT_MANAGEMENT_SUMMARY_DATE (optional)
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const discussion_js_1 = require("../discussion.js");
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
function parseRepoSlug(slug) {
    const [owner, repo, extra] = slug.split("/");
    if (!owner || !repo || extra) {
        throw new Error(`GITHUB_REPOSITORY must be owner/repo (got: ${slug || "missing"})`);
    }
    return { owner, repo };
}
function dailySummaryTitle(date = new Date()) {
    const override = process.env.AGENT_PROJECT_MANAGEMENT_SUMMARY_DATE?.trim();
    if (override)
        return `Daily Summary — ${override}`;
    return `Daily Summary — ${date.toISOString().slice(0, 10)}`;
}
function writeStepSummary(markdown) {
    const summaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (!summaryFile)
        return;
    (0, node_fs_1.appendFileSync)(summaryFile, `${markdown}\n`);
}
function readSummary() {
    const body = process.env.BODY?.trim();
    if (body)
        return body;
    const bodyFile = requiredEnv("BODY_FILE");
    if (!(0, node_fs_1.existsSync)(bodyFile)) {
        throw new Error(`Project management summary file was not produced: ${bodyFile}`);
    }
    return (0, node_fs_1.readFileSync)(bodyFile, "utf8").trim();
}
function publishDiscussionComment(summary) {
    const { owner, repo } = parseRepoSlug(requiredEnv("GITHUB_REPOSITORY"));
    const category = process.env.AGENT_PROJECT_MANAGEMENT_DISCUSSION_CATEGORY?.trim() || "General";
    const title = dailySummaryTitle();
    const discussion = (0, discussion_js_1.findRepositoryDiscussionByTitle)(owner, repo, title, category);
    if (!discussion) {
        console.warn(`Daily summary discussion '${title}' was not found in category '${category}'; skipping comment.`);
        return null;
    }
    const url = (0, discussion_js_1.addDiscussionComment)(discussion.id, summary);
    console.log(`Posted project management summary to ${discussion.url || `discussion #${discussion.number}`}: ${url}`);
    return url;
}
function main() {
    try {
        const summary = readSummary();
        if (!summary) {
            throw new Error("Project management summary is empty");
        }
        writeStepSummary(summary);
        (0, output_js_1.setOutput)("summary", summary);
        if (!boolEnv("AGENT_PROJECT_MANAGEMENT_POST_SUMMARY")) {
            (0, output_js_1.setOutput)("summary_posted", "false");
            (0, output_js_1.setOutput)("summary_url", "");
            console.log("Project management summary posting is disabled; wrote Actions step summary only.");
            return 0;
        }
        const url = publishDiscussionComment(summary);
        (0, output_js_1.setOutput)("summary_posted", url ? "true" : "false");
        (0, output_js_1.setOutput)("summary_url", url || "");
        return 0;
    }
    catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        return 1;
    }
}
process.exitCode = main();
//# sourceMappingURL=post-project-management-summary.js.map