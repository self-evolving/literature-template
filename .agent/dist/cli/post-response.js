"use strict";
// CLI: post a response to the correct GitHub surface.
// Usage: node .agent/dist/cli/post-response.js
// Env: BODY_FILE, RESPONSE_KIND, TARGET_NUMBER, REVIEW_COMMENT_ID,
//      DISCUSSION_ID, REPLY_TO_ID, GITHUB_REPOSITORY,
//      AGENT_COLLAPSE_OLD_REVIEWS
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const github_js_1 = require("../github.js");
const respond_js_1 = require("../respond.js");
const review_summary_minimize_js_1 = require("../review-summary-minimize.js");
const self_approval_js_1 = require("../self-approval.js");
const self_merge_js_1 = require("../self-merge.js");
const session_bundle_js_1 = require("../session-bundle.js");
const bodyFile = process.env.BODY_FILE || "";
const responseKind = process.env.RESPONSE_KIND || "issue_comment";
const targetNumber = Number(process.env.TARGET_NUMBER || "0");
const reviewCommentId = Number(process.env.REVIEW_COMMENT_ID || "0") || undefined;
const discussionNodeId = process.env.DISCUSSION_ID || undefined;
const replyToId = process.env.REPLY_TO_ID || undefined;
const repo = process.env.GITHUB_REPOSITORY || undefined;
const resumeStatus = process.env.RESUME_STATUS || "";
const runStatus = process.env.STATUS || "success";
const collapseOldReviews = !["false", "0", "no", "off"].includes((process.env.AGENT_COLLAPSE_OLD_REVIEWS || "").trim().toLowerCase());
let body = "";
if (bodyFile) {
    try {
        body = (0, node_fs_1.readFileSync)(bodyFile, "utf8");
    }
    catch {
        console.error(`Could not read body file: ${bodyFile}`);
    }
}
if (!body.trim()) {
    body = "I was unable to produce a response. Please check the workflow logs.";
}
const continuityNote = (0, session_bundle_js_1.formatSessionRestoreNotice)({ resumeStatus, runStatus });
if (continuityNote) {
    body = `> ${continuityNote}\n\n${body}`;
}
let posted = false;
let markerUpsertFailed = false;
const markerUpsert = body.includes(self_approval_js_1.SELF_APPROVAL_STATUS_MARKER)
    ? { marker: self_approval_js_1.SELF_APPROVAL_STATUS_MARKER, label: "self-approval" }
    : body.includes(self_merge_js_1.SELF_MERGE_STATUS_MARKER)
        ? { marker: self_merge_js_1.SELF_MERGE_STATUS_MARKER, label: "self-merge" }
        : null;
if (responseKind === "pr_comment" &&
    repo &&
    targetNumber > 0 &&
    markerUpsert) {
    try {
        const action = (0, github_js_1.upsertPrCommentByMarker)(targetNumber, repo, markerUpsert.marker, body);
        console.log(`${action === "updated" ? "Updated" : "Created"} ${markerUpsert.label} status comment.`);
        posted = true;
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Failed to upsert ${markerUpsert.label} status comment for ${repo}#${targetNumber}: ${message}`);
        markerUpsertFailed = true;
        process.exitCode = 1;
    }
}
if (!posted &&
    !markerUpsertFailed &&
    responseKind === "pr_comment" &&
    repo &&
    targetNumber > 0 &&
    collapseOldReviews &&
    (0, review_summary_minimize_js_1.isRubricsReviewBody)(body)) {
    try {
        const collapsed = (0, review_summary_minimize_js_1.collapsePreviousRubricsReviews)({ repo, prNumber: targetNumber });
        if (collapsed > 0) {
            console.log(`Collapsed ${collapsed} previous rubrics review comment(s).`);
        }
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`Failed to collapse previous rubrics review comments for ${repo}#${targetNumber}: ${message}`);
    }
}
if (!posted && !markerUpsertFailed) {
    (0, respond_js_1.postResponse)({ responseKind, targetNumber, reviewCommentId, discussionNodeId, replyToId, repo }, body);
}
//# sourceMappingURL=post-response.js.map