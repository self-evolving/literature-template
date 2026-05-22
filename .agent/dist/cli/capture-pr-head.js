"use strict";
// CLI: capture the current PR head SHA for workflows that need a stable reviewed head.
// Env: GITHUB_REPOSITORY, TARGET_NUMBER
// Outputs: head_sha
Object.defineProperty(exports, "__esModule", { value: true });
const github_js_1 = require("../github.js");
const output_js_1 = require("../output.js");
const repo = process.env.GITHUB_REPOSITORY || "";
const targetNumber = Number(process.env.TARGET_NUMBER || process.env.PR_NUMBER || "");
function warningMessage(err) {
    return err instanceof Error ? err.message : String(err);
}
function captureReviewedHeadSha() {
    try {
        if (!repo || !Number.isFinite(targetNumber) || targetNumber <= 0) {
            throw new Error("missing pull request target");
        }
        const meta = (0, github_js_1.fetchPrMeta)(targetNumber, repo);
        if (!meta.headOid) {
            throw new Error("could not resolve pull request head SHA");
        }
        return meta.headOid;
    }
    catch (err) {
        console.warn(`Reviewed head capture skipped: ${warningMessage(err)}`);
        return "";
    }
}
(0, output_js_1.setOutput)("head_sha", captureReviewedHeadSha());
//# sourceMappingURL=capture-pr-head.js.map