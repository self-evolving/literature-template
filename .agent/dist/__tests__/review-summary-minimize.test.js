"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const review_summary_minimize_js_1 = require("../review-summary-minimize.js");
const fix_pr_status_js_1 = require("../fix-pr-status.js");
function createQueuedClient(responses) {
    const calls = [];
    const client = {
        graphql(query, variables) {
            calls.push({ query, variables: { ...variables } });
            if (responses.length === 0) {
                throw new Error("Unexpected GraphQL call");
            }
            return responses.shift();
        },
    };
    return { client, calls };
}
(0, node_test_1.test)("collapsePreviousReviewSummaries minimizes visible generated summaries", () => {
    const { client, calls } = createQueuedClient([
        { viewer: { login: "sepo-agent" } },
        {
            repository: {
                pullRequest: {
                    comments: {
                        nodes: [
                            {
                                id: "comment-1",
                                body: "## AI Review Synthesis\n\n<!-- sepo-agent-review-synthesis -->\nold",
                                isMinimized: false,
                                author: { login: "sepo-agent" },
                            },
                            {
                                id: "comment-2",
                                body: "## AI Review Synthesis\nalready collapsed",
                                isMinimized: true,
                                author: { login: "sepo-agent" },
                            },
                            {
                                id: "comment-3",
                                body: "## AI Review Synthesis\nother author",
                                isMinimized: false,
                                author: { login: "alice" },
                            },
                            {
                                id: "comment-4",
                                body: "Regular discussion",
                                isMinimized: false,
                                author: { login: "sepo-agent" },
                            },
                        ],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            },
        },
        {
            repository: {
                pullRequest: {
                    reviews: {
                        nodes: [
                            {
                                id: "review-1",
                                body: "\n## AI Review Synthesis\nold review",
                                isMinimized: false,
                                author: { login: "sepo-agent" },
                            },
                        ],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            },
        },
        { minimizeComment: { minimizedComment: { isMinimized: true } } },
        { minimizeComment: { minimizedComment: { isMinimized: true } } },
    ]);
    const collapsed = (0, review_summary_minimize_js_1.collapsePreviousReviewSummaries)({
        repo: "self-evolving/repo",
        prNumber: 320,
        client,
    });
    node_assert_1.strict.equal(collapsed, 2);
    node_assert_1.strict.equal(calls.length, 5);
    node_assert_1.strict.match(calls[1]?.query || "", /comments/);
    node_assert_1.strict.deepEqual(calls[1]?.variables, {
        owner: "self-evolving",
        name: "repo",
        number: 320,
        after: undefined,
    });
    node_assert_1.strict.match(calls[2]?.query || "", /reviews/);
    node_assert_1.strict.deepEqual(calls.slice(3).map((call) => call.variables), [
        { id: "comment-1", classifier: "OUTDATED" },
        { id: "review-1", classifier: "OUTDATED" },
    ]);
});
(0, node_test_1.test)("collapsePreviousReviewSummaries matches GitHub App bot login variants", () => {
    const { client, calls } = createQueuedClient([
        { viewer: { login: "sepo-agent-app[bot]" } },
        {
            repository: {
                pullRequest: {
                    comments: {
                        nodes: [
                            {
                                id: "comment-1",
                                body: "## AI Review Synthesis\n\n<!-- sepo-agent-review-synthesis -->\nold",
                                isMinimized: false,
                                author: { login: "app/sepo-agent-app" },
                            },
                        ],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            },
        },
        {
            repository: {
                pullRequest: {
                    reviews: {
                        nodes: [],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            },
        },
        { minimizeComment: { minimizedComment: { isMinimized: true } } },
    ]);
    node_assert_1.strict.equal((0, review_summary_minimize_js_1.collapsePreviousReviewSummaries)({
        repo: "self-evolving/repo",
        prNumber: 320,
        client,
    }), 1);
    node_assert_1.strict.deepEqual(calls[3]?.variables, { id: "comment-1", classifier: "OUTDATED" });
});
(0, node_test_1.test)("collapsePreviousRubricsReviews minimizes rubrics reviews only", () => {
    const { client, calls } = createQueuedClient([
        { viewer: { login: "sepo-agent" } },
        {
            repository: {
                pullRequest: {
                    comments: {
                        nodes: [
                            {
                                id: "comment-1",
                                body: "preface\n\n## Rubrics Review\nold rubric scorecard",
                                isMinimized: false,
                                author: { login: "sepo-agent" },
                            },
                            {
                                id: "comment-2",
                                body: "## AI Review Synthesis\n\n<!-- sepo-agent-review-synthesis -->\nold synthesis",
                                isMinimized: false,
                                author: { login: "sepo-agent" },
                            },
                            {
                                id: "comment-3",
                                body: "## Rubrics Review\nother author",
                                isMinimized: false,
                                author: { login: "alice" },
                            },
                        ],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            },
        },
        {
            repository: {
                pullRequest: {
                    reviews: {
                        nodes: [
                            {
                                id: "review-1",
                                body: "## Rubrics Review\nold review body",
                                isMinimized: false,
                                author: { login: "sepo-agent" },
                            },
                        ],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            },
        },
        { minimizeComment: { minimizedComment: { isMinimized: true } } },
        { minimizeComment: { minimizedComment: { isMinimized: true } } },
    ]);
    const collapsed = (0, review_summary_minimize_js_1.collapsePreviousRubricsReviews)({
        repo: "self-evolving/repo",
        prNumber: 320,
        client,
    });
    node_assert_1.strict.equal(collapsed, 2);
    node_assert_1.strict.deepEqual(calls.slice(3).map((call) => call.variables), [
        { id: "comment-1", classifier: "OUTDATED" },
        { id: "review-1", classifier: "OUTDATED" },
    ]);
});
(0, node_test_1.test)("collapsePreviousFixPrComments minimizes fix-pr status comments only", () => {
    const { client, calls } = createQueuedClient([
        { viewer: { login: "sepo-agent" } },
        {
            repository: {
                pullRequest: {
                    comments: {
                        nodes: [
                            {
                                id: "comment-1",
                                body: "**Sepo pushed fixes for this PR.** Branch: `agent/fix`.\n\n<!-- sepo-agent-fix-pr-status -->",
                                isMinimized: false,
                                author: { login: "sepo-agent" },
                            },
                            {
                                id: "comment-2",
                                body: "**Sepo did not produce code changes for this PR.**\n\nlegacy body",
                                isMinimized: false,
                                author: { login: "sepo-agent" },
                            },
                            {
                                id: "comment-3",
                                body: "## AI Review Synthesis\nnot a fix-pr status",
                                isMinimized: false,
                                author: { login: "sepo-agent" },
                            },
                            {
                                id: "comment-4",
                                body: "**Sepo pushed fixes for this PR.** other author",
                                isMinimized: false,
                                author: { login: "alice" },
                            },
                        ],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            },
        },
        { minimizeComment: { minimizedComment: { isMinimized: true } } },
        { minimizeComment: { minimizedComment: { isMinimized: true } } },
    ]);
    const collapsed = (0, review_summary_minimize_js_1.collapsePreviousFixPrComments)({
        repo: "self-evolving/repo",
        prNumber: 320,
        client,
    });
    node_assert_1.strict.equal(collapsed, 2);
    node_assert_1.strict.match(calls[1]?.query || "", /comments/);
    node_assert_1.strict.doesNotMatch(calls[1]?.query || "", /reviews/);
    node_assert_1.strict.deepEqual(calls.slice(2).map((call) => call.variables), [
        { id: "comment-1", classifier: "OUTDATED" },
        { id: "comment-2", classifier: "OUTDATED" },
    ]);
});
(0, node_test_1.test)("isFixPrStatusBody matches marker and legacy fix-pr status text", () => {
    node_assert_1.strict.equal((0, fix_pr_status_js_1.isFixPrStatusBody)("> Restored session\n\n<!-- sepo-agent-fix-pr-status -->"), true);
    node_assert_1.strict.equal((0, fix_pr_status_js_1.isFixPrStatusBody)("**Sepo could not update this PR automatically.**"), true);
    node_assert_1.strict.equal((0, fix_pr_status_js_1.isFixPrStatusBody)("**Sepo could not complete the PR fix run.**"), true);
    node_assert_1.strict.equal((0, fix_pr_status_js_1.isFixPrStatusBody)("**Sepo made changes, but lightweight verification failed.**\n\n" +
        "Inspect the workflow logs before retrying the PR fix run."), true);
    node_assert_1.strict.equal((0, fix_pr_status_js_1.isFixPrStatusBody)("**Sepo made changes, but lightweight verification failed.**"), false);
    node_assert_1.strict.equal((0, fix_pr_status_js_1.isFixPrStatusBody)("## AI Review Synthesis\nbody"), false);
});
(0, node_test_1.test)("collapsePreviousHandoffComments minimizes old issue handoff comments only", () => {
    const { client, calls } = createQueuedClient([
        { viewer: { login: "sepo-agent-app[bot]" } },
        {
            repository: {
                issue: {
                    comments: {
                        nodes: [
                            {
                                id: "old-handoff",
                                body: "Sepo automation handoff dispatched\n\n<!-- sepo-agent-handoff state:dispatched created:123 base64:aGFuZG9m -->",
                                isMinimized: false,
                                author: { login: "sepo-agent-app" },
                            },
                            {
                                id: "current-handoff",
                                body: "Sepo automation handoff dispatched\n\n<!-- sepo-agent-handoff state:dispatched created:456 base64:Y3VycmVudA -->",
                                isMinimized: false,
                                author: { login: "sepo-agent-app" },
                            },
                            {
                                id: "pending-handoff",
                                body: "Sepo automation handoff pending\n\n<!-- sepo-agent-handoff state:pending created:100 base64:cGVuZGluZw -->",
                                isMinimized: false,
                                author: { login: "sepo-agent-app" },
                            },
                            {
                                id: "newer-handoff",
                                body: "Sepo automation handoff dispatched\n\n<!-- sepo-agent-handoff state:dispatched created:789 base64:bmV3ZXI -->",
                                isMinimized: false,
                                author: { login: "sepo-agent-app" },
                            },
                            {
                                id: "other-body",
                                body: "Regular discussion",
                                isMinimized: false,
                                author: { login: "sepo-agent-app" },
                            },
                        ],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            },
        },
        { minimizeComment: { minimizedComment: { isMinimized: true } } },
    ]);
    const collapsed = (0, review_summary_minimize_js_1.collapsePreviousHandoffComments)({
        repo: "self-evolving/repo",
        targetNumber: 59,
        targetKind: "issue",
        excludeCommentId: "current-handoff",
        currentCreatedAtMs: 456,
        client,
    });
    node_assert_1.strict.equal(collapsed, 1);
    node_assert_1.strict.match(calls[1]?.query || "", /issue\(number: \$number\)/);
    node_assert_1.strict.deepEqual(calls[2]?.variables, { id: "old-handoff", classifier: "OUTDATED" });
});
(0, node_test_1.test)("collapsePreviousHandoffComments uses pull request comments for PR targets", () => {
    const { client, calls } = createQueuedClient([
        { viewer: { login: "sepo-agent" } },
        {
            repository: {
                pullRequest: {
                    comments: {
                        nodes: [
                            {
                                id: "old-handoff",
                                body: "<!-- sepo-agent-handoff state:dispatched created:123 base64:aGFuZG9m -->",
                                isMinimized: false,
                                author: { login: "sepo-agent" },
                            },
                            {
                                id: "current-handoff",
                                body: "<!-- sepo-agent-handoff state:dispatched created:456 base64:Y3VycmVudA -->",
                                isMinimized: false,
                                author: { login: "sepo-agent" },
                            },
                        ],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            },
        },
        { minimizeComment: { minimizedComment: { isMinimized: true } } },
    ]);
    node_assert_1.strict.equal((0, review_summary_minimize_js_1.collapsePreviousHandoffComments)({
        repo: "self-evolving/repo",
        targetNumber: 57,
        targetKind: "pull_request",
        excludeCommentId: "current-handoff",
        currentCreatedAtMs: 456,
        client,
    }), 1);
    node_assert_1.strict.match(calls[1]?.query || "", /pullRequest\(number: \$number\)/);
    node_assert_1.strict.deepEqual(calls[2]?.variables, { id: "old-handoff", classifier: "OUTDATED" });
});
(0, node_test_1.test)("rubrics body detection matches heading after a continuity note", () => {
    node_assert_1.strict.equal((0, review_summary_minimize_js_1.isRubricsReviewBody)("> Restored session\n\n## Rubrics Review\nbody"), true);
    node_assert_1.strict.equal((0, review_summary_minimize_js_1.isRubricsReviewBody)("## AI Review Synthesis\nbody"), false);
});
(0, node_test_1.test)("collapsePreviousReviewSummaries keeps heading fallback for markerless summaries", () => {
    const { client, calls } = createQueuedClient([
        { viewer: { login: "sepo-agent" } },
        {
            repository: {
                pullRequest: {
                    comments: {
                        nodes: [
                            {
                                id: "comment-1",
                                body: "## AI Review Synthesis\nold markerless comment",
                                isMinimized: false,
                                author: { login: "sepo-agent" },
                            },
                        ],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            },
        },
        {
            repository: {
                pullRequest: {
                    reviews: {
                        nodes: [],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            },
        },
        { minimizeComment: { minimizedComment: { isMinimized: true } } },
    ]);
    node_assert_1.strict.equal((0, review_summary_minimize_js_1.collapsePreviousReviewSummaries)({
        repo: "self-evolving/repo",
        prNumber: 320,
        client,
    }), 1);
    node_assert_1.strict.deepEqual(calls[3]?.variables, { id: "comment-1", classifier: "OUTDATED" });
});
(0, node_test_1.test)("collapsePreviousReviewSummaries paginates comments", () => {
    const { client, calls } = createQueuedClient([
        { viewer: { login: "sepo-agent" } },
        {
            repository: {
                pullRequest: {
                    comments: {
                        nodes: [],
                        pageInfo: { hasNextPage: true, endCursor: "cursor-1" },
                    },
                },
            },
        },
        {
            repository: {
                pullRequest: {
                    comments: {
                        nodes: [
                            {
                                id: "comment-1",
                                body: "## AI Review Synthesis\nold",
                                isMinimized: false,
                                author: { login: "sepo-agent" },
                            },
                        ],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            },
        },
        {
            repository: {
                pullRequest: {
                    reviews: {
                        nodes: [],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            },
        },
        { minimizeComment: { minimizedComment: { isMinimized: true } } },
    ]);
    node_assert_1.strict.equal((0, review_summary_minimize_js_1.collapsePreviousReviewSummaries)({
        repo: "self-evolving/repo",
        prNumber: 320,
        client,
    }), 1);
    node_assert_1.strict.equal(calls[1]?.variables.after, undefined);
    node_assert_1.strict.equal(calls[2]?.variables.after, "cursor-1");
});
//# sourceMappingURL=review-summary-minimize.test.js.map