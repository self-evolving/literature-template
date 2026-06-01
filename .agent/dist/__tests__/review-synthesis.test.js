"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const review_synthesis_js_1 = require("../review-synthesis.js");
(0, node_test_1.test)("buildReviewSynthesisHeadMarker formats non-empty head SHAs", () => {
    node_assert_1.strict.equal((0, review_synthesis_js_1.buildReviewSynthesisHeadMarker)(" abc123 "), "<!-- sepo-agent-review-synthesis-head: abc123 -->");
});
(0, node_test_1.test)("buildReviewSynthesisHeadMarker omits blank head SHAs", () => {
    node_assert_1.strict.equal((0, review_synthesis_js_1.buildReviewSynthesisHeadMarker)("   "), "");
});
(0, node_test_1.test)("extractReviewSynthesisHeadSha parses synthesis head markers", () => {
    const body = [
        "## AI Review Synthesis",
        "",
        "<!-- sepo-agent-review-synthesis -->",
        "<!-- sepo-agent-review-synthesis-head: AbC123def456 -->",
    ].join("\n");
    node_assert_1.strict.equal((0, review_synthesis_js_1.extractReviewSynthesisHeadSha)(body), "AbC123def456");
});
(0, node_test_1.test)("extractReviewSynthesisHeadSha ignores missing or malformed markers", () => {
    node_assert_1.strict.equal((0, review_synthesis_js_1.extractReviewSynthesisHeadSha)("## AI Review Synthesis"), "");
    node_assert_1.strict.equal((0, review_synthesis_js_1.extractReviewSynthesisHeadSha)("<!-- sepo-agent-review-synthesis-head: not-a-sha -->"), "");
});
(0, node_test_1.test)("isReviewSynthesisBody keeps legacy heading fallback", () => {
    node_assert_1.strict.equal((0, review_synthesis_js_1.isReviewSynthesisBody)("## AI Review Synthesis\n\nlegacy body"), true);
});
//# sourceMappingURL=review-synthesis.test.js.map