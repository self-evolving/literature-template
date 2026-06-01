"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRubricsReviewBody = isRubricsReviewBody;
exports.collapsePreviousReviewSummaries = collapsePreviousReviewSummaries;
exports.collapsePreviousRubricsReviews = collapsePreviousRubricsReviews;
exports.collapsePreviousFixPrComments = collapsePreviousFixPrComments;
exports.collapsePreviousHandoffComments = collapsePreviousHandoffComments;
const github_graphql_js_1 = require("./github-graphql.js");
const handoff_js_1 = require("./handoff.js");
const fix_pr_status_js_1 = require("./fix-pr-status.js");
const review_synthesis_js_1 = require("./review-synthesis.js");
const VIEWER_QUERY = `
  query ViewerLogin {
    viewer {
      login
    }
  }
`;
const COMMENTS_QUERY = `
  query PullRequestReviewSummaryComments(
    $owner: String!
    $name: String!
    $number: Int!
    $after: String
  ) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        comments(first: 100, after: $after) {
          nodes {
            id
            body
            isMinimized
            author {
              login
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`;
const REVIEWS_QUERY = `
  query PullRequestReviewSummaries(
    $owner: String!
    $name: String!
    $number: Int!
    $after: String
  ) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        reviews(first: 100, after: $after) {
          nodes {
            id
            body
            isMinimized
            author {
              login
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`;
const ISSUE_COMMENTS_QUERY = `
  query IssueGeneratedComments(
    $owner: String!
    $name: String!
    $number: Int!
    $after: String
  ) {
    repository(owner: $owner, name: $name) {
      issue(number: $number) {
        comments(first: 100, after: $after) {
          nodes {
            id
            body
            isMinimized
            author {
              login
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`;
const MINIMIZE_COMMENT_MUTATION = `
  mutation MinimizeReviewSummary($id: ID!, $classifier: ReportedContentClassifiers!) {
    minimizeComment(input: { subjectId: $id, classifier: $classifier }) {
      minimizedComment {
        isMinimized
      }
    }
  }
`;
function parseRepo(repo) {
    const [owner, name] = repo.split("/", 2);
    if (!owner || !name) {
        throw new Error(`Expected GITHUB_REPOSITORY-style repo slug, got ${JSON.stringify(repo)}`);
    }
    return { owner, name };
}
function normalizeActorLogin(login) {
    return String(login || "")
        .trim()
        .toLowerCase()
        .replace(/^app\//i, "")
        .replace(/\[bot\]$/i, "");
}
function isSameActorLogin(left, right) {
    return normalizeActorLogin(left) === normalizeActorLogin(right);
}
function isRubricsReviewBody(body) {
    return /(?:^|\r?\n)## Rubrics Review(?:\s|$)/.test(body);
}
function isGeneratedReviewComment(node, viewerLogin, bodyMatcher) {
    if (!node.id || node.isMinimized)
        return false;
    if (!isSameActorLogin(node.author?.login || "", viewerLogin))
        return false;
    return bodyMatcher(node.body || "");
}
function fetchViewerLogin(client) {
    const data = client.graphql(VIEWER_QUERY, {});
    const login = data.viewer?.login || "";
    if (!login) {
        throw new Error("Could not resolve authenticated GitHub viewer login");
    }
    return login;
}
function fetchMatchingNodes(client, query, connectionName, repo, prNumber, viewerLogin, bodyMatcher) {
    const matches = [];
    let after;
    do {
        const data = client.graphql(query, {
            owner: repo.owner,
            name: repo.name,
            number: prNumber,
            after,
        });
        const pullRequest = data.repository?.pullRequest;
        const connection = connectionName === "comments"
            ? pullRequest?.comments
            : pullRequest?.reviews;
        if (!connection)
            return matches;
        for (const node of connection.nodes || []) {
            if (isGeneratedReviewComment(node, viewerLogin, bodyMatcher)) {
                matches.push(node);
            }
        }
        after = connection.pageInfo.hasNextPage
            ? connection.pageInfo.endCursor || undefined
            : undefined;
    } while (after);
    return matches;
}
function collapsePreviousMatchingReviewComments(options, bodyMatcher) {
    const client = options.client || (0, github_graphql_js_1.createGhGraphqlClient)();
    const repo = parseRepo(options.repo);
    const viewerLogin = fetchViewerLogin(client);
    const nodes = [
        ...fetchMatchingNodes(client, COMMENTS_QUERY, "comments", repo, options.prNumber, viewerLogin, bodyMatcher),
        ...fetchMatchingNodes(client, REVIEWS_QUERY, "reviews", repo, options.prNumber, viewerLogin, bodyMatcher),
    ];
    const uniqueNodeIds = Array.from(new Set(nodes.map((node) => node.id).filter(Boolean)));
    for (const id of uniqueNodeIds) {
        client.graphql(MINIMIZE_COMMENT_MUTATION, {
            id,
            classifier: "OUTDATED",
        });
    }
    return uniqueNodeIds.length;
}
function collapsePreviousMatchingPrComments(options, bodyMatcher) {
    const client = options.client || (0, github_graphql_js_1.createGhGraphqlClient)();
    const repo = parseRepo(options.repo);
    const viewerLogin = fetchViewerLogin(client);
    const nodes = fetchMatchingNodes(client, COMMENTS_QUERY, "comments", repo, options.prNumber, viewerLogin, bodyMatcher);
    const uniqueNodeIds = Array.from(new Set(nodes.map((node) => node.id).filter(Boolean)));
    for (const id of uniqueNodeIds) {
        client.graphql(MINIMIZE_COMMENT_MUTATION, {
            id,
            classifier: "OUTDATED",
        });
    }
    return uniqueNodeIds.length;
}
function collapsePreviousMatchingHandoffComments(options) {
    const client = options.client || (0, github_graphql_js_1.createGhGraphqlClient)();
    const repo = parseRepo(options.repo);
    const viewerLogin = fetchViewerLogin(client);
    const nodes = options.targetKind === "issue"
        ? fetchMatchingIssueCommentNodes(client, repo, options.targetNumber, viewerLogin, handoff_js_1.hasAnyHandoffMarker)
        : fetchMatchingNodes(client, COMMENTS_QUERY, "comments", repo, options.targetNumber, viewerLogin, handoff_js_1.hasAnyHandoffMarker);
    const excludeCommentId = String(options.excludeCommentId || "");
    const currentFromComment = nodes.find((node) => node.id === excludeCommentId);
    const currentMarker = currentFromComment
        ? (0, handoff_js_1.parseAnyHandoffMarker)(currentFromComment.body || "")
        : null;
    const explicitCreatedAtMs = Number(options.currentCreatedAtMs);
    const currentCreatedAtMs = Number.isFinite(explicitCreatedAtMs) && explicitCreatedAtMs > 0
        ? explicitCreatedAtMs
        : currentMarker?.createdAtMs ?? null;
    const uniqueNodeIds = Array.from(new Set(nodes
        .filter((node) => {
        if (!node.id || node.id === excludeCommentId)
            return false;
        const marker = (0, handoff_js_1.parseAnyHandoffMarker)(node.body || "");
        if (!marker || marker.state === "pending")
            return false;
        if (currentCreatedAtMs) {
            return Boolean(marker.createdAtMs && marker.createdAtMs < currentCreatedAtMs);
        }
        return true;
    })
        .map((node) => node.id)
        .filter((id) => Boolean(id))));
    for (const id of uniqueNodeIds) {
        client.graphql(MINIMIZE_COMMENT_MUTATION, {
            id,
            classifier: "OUTDATED",
        });
    }
    return uniqueNodeIds.length;
}
function fetchMatchingIssueCommentNodes(client, repo, issueNumber, viewerLogin, bodyMatcher) {
    const matches = [];
    let after;
    do {
        const data = client.graphql(ISSUE_COMMENTS_QUERY, {
            owner: repo.owner,
            name: repo.name,
            number: issueNumber,
            after,
        });
        const connection = data.repository?.issue?.comments;
        if (!connection)
            return matches;
        for (const node of connection.nodes || []) {
            if (isGeneratedReviewComment(node, viewerLogin, bodyMatcher)) {
                matches.push(node);
            }
        }
        after = connection.pageInfo.hasNextPage
            ? connection.pageInfo.endCursor || undefined
            : undefined;
    } while (after);
    return matches;
}
/**
 * Collapses older agent-generated PR review summaries before posting a fresh one.
 */
function collapsePreviousReviewSummaries(options) {
    return collapsePreviousMatchingReviewComments(options, review_synthesis_js_1.isReviewSynthesisBody);
}
/**
 * Collapses older agent-generated rubrics reviews before posting a fresh one.
 */
function collapsePreviousRubricsReviews(options) {
    return collapsePreviousMatchingReviewComments(options, isRubricsReviewBody);
}
/**
 * Collapses older agent-generated fix-pr status comments before posting a fresh one.
 */
function collapsePreviousFixPrComments(options) {
    return collapsePreviousMatchingPrComments(options, fix_pr_status_js_1.isFixPrStatusBody);
}
/**
 * Collapses older orchestrator handoff marker comments after a fresh dispatch.
 */
function collapsePreviousHandoffComments(options) {
    return collapsePreviousMatchingHandoffComments(options);
}
//# sourceMappingURL=review-summary-minimize.js.map