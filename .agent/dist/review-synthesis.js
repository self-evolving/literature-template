"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REVIEW_SYNTHESIS_HEAD_MARKER_PREFIX = exports.REVIEW_SYNTHESIS_MARKER = exports.REVIEW_SYNTHESIS_HEADING = void 0;
exports.buildReviewSynthesisMarker = buildReviewSynthesisMarker;
exports.buildReviewSynthesisHeadMarker = buildReviewSynthesisHeadMarker;
exports.extractReviewSynthesisHeadSha = extractReviewSynthesisHeadSha;
exports.isReviewSynthesisBody = isReviewSynthesisBody;
exports.REVIEW_SYNTHESIS_HEADING = "## AI Review Synthesis";
exports.REVIEW_SYNTHESIS_MARKER = "<!-- sepo-agent-review-synthesis -->";
exports.REVIEW_SYNTHESIS_HEAD_MARKER_PREFIX = "sepo-agent-review-synthesis-head";
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const REVIEW_SYNTHESIS_HEAD_MARKER_REGEX = new RegExp(`<!--\\s*${escapeRegExp(exports.REVIEW_SYNTHESIS_HEAD_MARKER_PREFIX)}:\\s*([0-9a-f]{6,64})\\s*-->`, "i");
function buildReviewSynthesisMarker() {
    return exports.REVIEW_SYNTHESIS_MARKER;
}
function buildReviewSynthesisHeadMarker(headSha) {
    const normalized = String(headSha || "").trim();
    return normalized ? `<!-- ${exports.REVIEW_SYNTHESIS_HEAD_MARKER_PREFIX}: ${normalized} -->` : "";
}
function extractReviewSynthesisHeadSha(body) {
    const match = String(body || "").match(REVIEW_SYNTHESIS_HEAD_MARKER_REGEX);
    return match ? match[1].trim() : "";
}
function isReviewSynthesisBody(body) {
    return body.includes(exports.REVIEW_SYNTHESIS_MARKER)
        || body.trimStart().startsWith(exports.REVIEW_SYNTHESIS_HEADING);
}
//# sourceMappingURL=review-synthesis.js.map