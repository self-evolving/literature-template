"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const repoRoot = (0, node_path_1.resolve)(__dirname, "../../..");
function writeFakeGh(tempDir, body) {
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(tempDir, "gh"), body, { encoding: "utf8", mode: 0o755 });
}
(0, node_test_1.test)("post-comment CLI still posts review comments when summary minimization fails", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-post-comment-"));
    try {
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        const outputPath = (0, node_path_1.join)(tempDir, "github-output.txt");
        const responsePath = (0, node_path_1.join)(tempDir, "response.txt");
        (0, node_fs_1.writeFileSync)(responsePath, "Review body\n", "utf8");
        (0, node_fs_1.writeFileSync)(outputPath, "", "utf8");
        writeFakeGh(tempDir, `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
if [ "$1" = "api" ] && [ "$2" = "graphql" ]; then
  printf '{"errors":[{"message":"graphql unavailable"}]}\\n'
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "comment" ]; then
  exit 0
fi
printf 'unexpected gh args: %s\\n' "$*" >&2
exit 1
`);
        const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/post-comment.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                COMMENT_TARGET: "pr",
                TARGET_NUMBER: "321",
                ROUTE: "review",
                RESPONSE_FILE: responsePath,
                REQUESTED_BY: "lolipopshock",
                GITHUB_REPOSITORY: "self-evolving/repo",
                GITHUB_OUTPUT: outputPath,
                FAKE_GH_LOG: logPath,
            },
            encoding: "utf8",
        });
        node_assert_1.strict.equal(result.status, 0);
        node_assert_1.strict.match(result.stderr, /Failed to collapse previous AI review synthesis comments for self-evolving\/repo#321: gh api graphql returned errors: graphql unavailable/);
        const log = (0, node_fs_1.readFileSync)(logPath, "utf8");
        node_assert_1.strict.match(log, /^api graphql /m);
        node_assert_1.strict.match(log, /^pr comment 321 --body ## AI Review Synthesis/m);
        const output = (0, node_fs_1.readFileSync)(outputPath, "utf8");
        node_assert_1.strict.match(output, /^comment_posted<</m);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("post-comment CLI skips review summary minimization when disabled", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-post-comment-"));
    try {
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        const outputPath = (0, node_path_1.join)(tempDir, "github-output.txt");
        const responsePath = (0, node_path_1.join)(tempDir, "response.txt");
        (0, node_fs_1.writeFileSync)(responsePath, "Review body\n", "utf8");
        (0, node_fs_1.writeFileSync)(outputPath, "", "utf8");
        writeFakeGh(tempDir, `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
if [ "$1" = "api" ] && [ "$2" = "graphql" ]; then
  printf 'unexpected minimization call\\n' >&2
  exit 1
fi
if [ "$1" = "pr" ] && [ "$2" = "comment" ]; then
  exit 0
fi
printf 'unexpected gh args: %s\\n' "$*" >&2
exit 1
`);
        const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/post-comment.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                AGENT_COLLAPSE_OLD_REVIEWS: "false",
                COMMENT_TARGET: "pr",
                TARGET_NUMBER: "321",
                ROUTE: "review",
                RESPONSE_FILE: responsePath,
                REQUESTED_BY: "lolipopshock",
                GITHUB_REPOSITORY: "self-evolving/repo",
                GITHUB_OUTPUT: outputPath,
                FAKE_GH_LOG: logPath,
            },
            encoding: "utf8",
        });
        node_assert_1.strict.equal(result.status, 0);
        node_assert_1.strict.equal(result.stderr, "");
        const log = (0, node_fs_1.readFileSync)(logPath, "utf8");
        node_assert_1.strict.doesNotMatch(log, /^api graphql /m);
        node_assert_1.strict.match(log, /^pr comment 321 --body ## AI Review Synthesis/m);
        const output = (0, node_fs_1.readFileSync)(outputPath, "utf8");
        node_assert_1.strict.match(output, /^comment_posted<</m);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("post-comment CLI uses captured reviewed head marker only when current head matches", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-post-comment-"));
    try {
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        const outputPath = (0, node_path_1.join)(tempDir, "github-output.txt");
        const responsePath = (0, node_path_1.join)(tempDir, "response.txt");
        (0, node_fs_1.writeFileSync)(responsePath, "Review body\n", "utf8");
        (0, node_fs_1.writeFileSync)(outputPath, "", "utf8");
        writeFakeGh(tempDir, `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
if [ "$1" = "pr" ] && [ "$2" = "view" ]; then
  printf '{"headRefOid":"abc123"}\\n'
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "comment" ]; then
  exit 0
fi
printf 'unexpected gh args: %s\\n' "$*" >&2
exit 1
`);
        const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/post-comment.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                AGENT_COLLAPSE_OLD_REVIEWS: "false",
                COMMENT_TARGET: "pr",
                TARGET_NUMBER: "321",
                ROUTE: "review",
                RESPONSE_FILE: responsePath,
                REQUESTED_BY: "lolipopshock",
                REVIEWED_HEAD_SHA: "abc123",
                GITHUB_REPOSITORY: "self-evolving/repo",
                GITHUB_OUTPUT: outputPath,
                FAKE_GH_LOG: logPath,
            },
            encoding: "utf8",
        });
        node_assert_1.strict.equal(result.status, 0);
        const log = (0, node_fs_1.readFileSync)(logPath, "utf8");
        node_assert_1.strict.match(log, /^pr view 321 --json headRefName,headRefOid,isCrossRepository,state --repo self-evolving\/repo/m);
        node_assert_1.strict.match(log, /<!-- sepo-agent-review-synthesis-head: abc123 -->/);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("post-comment CLI omits reviewed head marker when PR head changed", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-post-comment-"));
    try {
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        const outputPath = (0, node_path_1.join)(tempDir, "github-output.txt");
        const responsePath = (0, node_path_1.join)(tempDir, "response.txt");
        (0, node_fs_1.writeFileSync)(responsePath, "Review body\n", "utf8");
        (0, node_fs_1.writeFileSync)(outputPath, "", "utf8");
        writeFakeGh(tempDir, `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
if [ "$1" = "pr" ] && [ "$2" = "view" ]; then
  printf '{"headRefOid":"def456"}\\n'
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "comment" ]; then
  exit 0
fi
printf 'unexpected gh args: %s\\n' "$*" >&2
exit 1
`);
        const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/post-comment.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                AGENT_COLLAPSE_OLD_REVIEWS: "false",
                COMMENT_TARGET: "pr",
                TARGET_NUMBER: "321",
                ROUTE: "review",
                RESPONSE_FILE: responsePath,
                REQUESTED_BY: "lolipopshock",
                REVIEWED_HEAD_SHA: "abc123",
                GITHUB_REPOSITORY: "self-evolving/repo",
                GITHUB_OUTPUT: outputPath,
                FAKE_GH_LOG: logPath,
            },
            encoding: "utf8",
        });
        node_assert_1.strict.equal(result.status, 0);
        node_assert_1.strict.match(result.stderr, /head marker omitted because the PR head changed/);
        const log = (0, node_fs_1.readFileSync)(logPath, "utf8");
        node_assert_1.strict.doesNotMatch(log, /sepo-agent-review-synthesis-head/);
        node_assert_1.strict.match(log, /^pr comment 321 --body ## AI Review Synthesis/m);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("post-comment CLI collapses previous fix-pr status comments", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-post-comment-"));
    try {
        const countPath = (0, node_path_1.join)(tempDir, "graphql-count.txt");
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        const outputPath = (0, node_path_1.join)(tempDir, "github-output.txt");
        const responsePath = (0, node_path_1.join)(tempDir, "response.json");
        (0, node_fs_1.writeFileSync)(responsePath, '{"summary":"Updated tests."}\n', "utf8");
        (0, node_fs_1.writeFileSync)(outputPath, "", "utf8");
        writeFakeGh(tempDir, `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
if [ "$1" = "api" ] && [ "$2" = "graphql" ]; then
  count="$(cat "$FAKE_GH_COUNT" 2>/dev/null || printf '0')"
  count="$((count + 1))"
  printf '%s' "$count" > "$FAKE_GH_COUNT"
  case "$count" in
    1)
      printf '{"data":{"viewer":{"login":"sepo-agent"}}}\\n'
      exit 0
      ;;
    2)
      printf '{"data":{"repository":{"pullRequest":{"comments":{"nodes":[{"id":"old-fix","body":"**Sepo pushed fixes for this PR.** Branch: \`agent/fix\`.\\\\n\\\\n<!-- sepo-agent-fix-pr-status -->","isMinimized":false,"author":{"login":"sepo-agent"}}],"pageInfo":{"hasNextPage":false,"endCursor":null}}}}}}\\n'
      exit 0
      ;;
    3)
      printf '{"data":{"minimizeComment":{"minimizedComment":{"isMinimized":true}}}}\\n'
      exit 0
      ;;
  esac
fi
if [ "$1" = "pr" ] && [ "$2" = "comment" ]; then
  exit 0
fi
printf 'unexpected gh args: %s\\n' "$*" >&2
exit 1
`);
        const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/post-comment.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                BRANCH: "agent/fix",
                COMMENT_TARGET: "pr",
                TARGET_NUMBER: "321",
                ROUTE: "fix-pr",
                STATUS: "success",
                RESPONSE_FILE: responsePath,
                REQUESTED_BY: "lolipopshock",
                GITHUB_REPOSITORY: "self-evolving/repo",
                GITHUB_OUTPUT: outputPath,
                FAKE_GH_COUNT: countPath,
                FAKE_GH_LOG: logPath,
            },
            encoding: "utf8",
        });
        node_assert_1.strict.equal(result.status, 0);
        node_assert_1.strict.match(result.stdout, /Collapsed 1 previous fix-pr status comment/);
        const log = (0, node_fs_1.readFileSync)(logPath, "utf8");
        node_assert_1.strict.match(log, /^api graphql /m);
        node_assert_1.strict.match(log, /id=old-fix/);
        node_assert_1.strict.match(log, /^pr comment 321 --body \*\*Sepo pushed fixes for this PR\.\*\*/m);
        node_assert_1.strict.match(log, /<!-- sepo-agent-fix-pr-status -->/);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("post-comment CLI routes unsupported fix-pr status through cleanup", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-post-comment-"));
    try {
        const countPath = (0, node_path_1.join)(tempDir, "graphql-count.txt");
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        const outputPath = (0, node_path_1.join)(tempDir, "github-output.txt");
        (0, node_fs_1.writeFileSync)(outputPath, "", "utf8");
        writeFakeGh(tempDir, `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
if [ "$1" = "api" ] && [ "$2" = "graphql" ]; then
  count="$(cat "$FAKE_GH_COUNT" 2>/dev/null || printf '0')"
  count="$((count + 1))"
  printf '%s' "$count" > "$FAKE_GH_COUNT"
  case "$count" in
    1)
      printf '{"data":{"viewer":{"login":"sepo-agent"}}}\\n'
      exit 0
      ;;
    2)
      printf '{"data":{"repository":{"pullRequest":{"comments":{"nodes":[{"id":"old-unsupported","body":"**Sepo could not update this PR automatically.**\\\\n\\\\nPR fix runs currently support open same-repository pull requests only.","isMinimized":false,"author":{"login":"sepo-agent"}}],"pageInfo":{"hasNextPage":false,"endCursor":null}}}}}}\\n'
      exit 0
      ;;
    3)
      printf '{"data":{"minimizeComment":{"minimizedComment":{"isMinimized":true}}}}\\n'
      exit 0
      ;;
  esac
fi
if [ "$1" = "pr" ] && [ "$2" = "comment" ]; then
  exit 0
fi
printf 'unexpected gh args: %s\\n' "$*" >&2
exit 1
`);
        const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/post-comment.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                COMMENT_TARGET: "pr",
                TARGET_NUMBER: "321",
                ROUTE: "fix-pr",
                STATUS: "unsupported",
                GITHUB_REPOSITORY: "self-evolving/repo",
                GITHUB_OUTPUT: outputPath,
                FAKE_GH_COUNT: countPath,
                FAKE_GH_LOG: logPath,
            },
            encoding: "utf8",
        });
        node_assert_1.strict.equal(result.status, 0);
        node_assert_1.strict.match(result.stdout, /Collapsed 1 previous fix-pr status comment/);
        const log = (0, node_fs_1.readFileSync)(logPath, "utf8");
        node_assert_1.strict.match(log, /id=old-unsupported/);
        node_assert_1.strict.match(log, /^pr comment 321 --body \*\*Sepo could not update this PR automatically\.\*\*/m);
        node_assert_1.strict.match(log, /<!-- sepo-agent-fix-pr-status -->/);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
//# sourceMappingURL=post-comment-cli.test.js.map