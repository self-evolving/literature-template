export declare const REVIEW_SYNTHESIS_HEADING = "## AI Review Synthesis";
export declare const REVIEW_SYNTHESIS_MARKER = "<!-- sepo-agent-review-synthesis -->";
export declare const REVIEW_SYNTHESIS_HEAD_MARKER_PREFIX = "sepo-agent-review-synthesis-head";
export declare function buildReviewSynthesisMarker(): string;
export declare function buildReviewSynthesisHeadMarker(headSha: string): string;
export declare function extractReviewSynthesisHeadSha(body: string): string;
export declare function isReviewSynthesisBody(body: string): boolean;
//# sourceMappingURL=review-synthesis.d.ts.map