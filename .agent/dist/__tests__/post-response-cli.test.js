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
(0, node_test_1.test)("post-response CLI still posts rubrics reviews when minimization fails", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-post-response-"));
    try {
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        const bodyPath = (0, node_path_1.join)(tempDir, "body.md");
        (0, node_fs_1.writeFileSync)(bodyPath, "## Rubrics Review\n\nbody\n", "utf8");
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
        const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/post-response.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                BODY_FILE: bodyPath,
                RESPONSE_KIND: "pr_comment",
                TARGET_NUMBER: "321",
                GITHUB_REPOSITORY: "self-evolving/repo",
                FAKE_GH_LOG: logPath,
            },
            encoding: "utf8",
        });
        node_assert_1.strict.equal(result.status, 0);
        node_assert_1.strict.match(result.stderr, /Failed to collapse previous rubrics review comments for self-evolving\/repo#321: gh api graphql returned errors: graphql unavailable/);
        const log = (0, node_fs_1.readFileSync)(logPath, "utf8");
        node_assert_1.strict.match(log, /^api graphql /m);
        node_assert_1.strict.match(log, /^pr comment 321 --body ## Rubrics Review/m);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("post-response CLI skips rubrics review minimization when disabled", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-post-response-"));
    try {
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        const bodyPath = (0, node_path_1.join)(tempDir, "body.md");
        (0, node_fs_1.writeFileSync)(bodyPath, "## Rubrics Review\n\nbody\n", "utf8");
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
        const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/post-response.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                AGENT_COLLAPSE_OLD_REVIEWS: "false",
                BODY_FILE: bodyPath,
                RESPONSE_KIND: "pr_comment",
                TARGET_NUMBER: "321",
                GITHUB_REPOSITORY: "self-evolving/repo",
                FAKE_GH_LOG: logPath,
            },
            encoding: "utf8",
        });
        node_assert_1.strict.equal(result.status, 0);
        node_assert_1.strict.equal(result.stderr, "");
        const log = (0, node_fs_1.readFileSync)(logPath, "utf8");
        node_assert_1.strict.doesNotMatch(log, /^api graphql /m);
        node_assert_1.strict.match(log, /^pr comment 321 --body ## Rubrics Review/m);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("post-response CLI updates latest Sepo self-approval marker comment", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-post-response-"));
    try {
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        const bodyPath = (0, node_path_1.join)(tempDir, "body.md");
        (0, node_fs_1.writeFileSync)(bodyPath, "Sepo self-approval completed.\n\n<!-- sepo-agent-self-approval -->\n", "utf8");
        writeFakeGh(tempDir, `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
if [ "$1" = "api" ] && [ "$2" = "graphql" ]; then
  printf '{"data":{"viewer":{"login":"sepo-agent-app[bot]"}}}\\n'
  exit 0
fi
if [ "$1" = "api" ] && [ "$2" = "--paginate" ] && [ "$3" = "--slurp" ]; then
  printf '[[{"id":111,"body":"old self marker\\\\n<!-- sepo-agent-self-approval -->","created_at":"2026-05-07T10:00:00Z","user":{"login":"sepo-agent-app"}},{"id":222,"body":"untrusted marker\\\\n<!-- sepo-agent-self-approval -->","created_at":"2026-05-07T10:05:00Z","user":{"login":"alice"}},{"id":333,"body":"latest self marker\\\\n<!-- sepo-agent-self-approval -->","created_at":"2026-05-07T10:10:00Z","user":{"login":"app/sepo-agent-app"}}]]\\n'
  exit 0
fi
if [ "$1" = "api" ] && [ "$2" = "--method" ] && [ "$3" = "PATCH" ]; then
  exit 0
fi
printf 'unexpected gh args: %s\\n' "$*" >&2
exit 1
`);
        const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/post-response.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                BODY_FILE: bodyPath,
                RESPONSE_KIND: "pr_comment",
                TARGET_NUMBER: "321",
                GITHUB_REPOSITORY: "self-evolving/repo",
                FAKE_GH_LOG: logPath,
            },
            encoding: "utf8",
        });
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.match(result.stdout, /Updated self-approval status comment/);
        const log = (0, node_fs_1.readFileSync)(logPath, "utf8");
        node_assert_1.strict.match(log, /^api graphql /m);
        node_assert_1.strict.match(log, /^api --paginate --slurp repos\/self-evolving\/repo\/issues\/321\/comments/m);
        node_assert_1.strict.match(log, /^api --method PATCH repos\/self-evolving\/repo\/issues\/comments\/333 /m);
        node_assert_1.strict.doesNotMatch(log, /issues\/comments\/111/);
        node_assert_1.strict.doesNotMatch(log, /issues\/comments\/222/);
        node_assert_1.strict.doesNotMatch(log, /^pr comment /m);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("post-response CLI updates latest Sepo self-merge marker comment", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-post-response-"));
    try {
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        const bodyPath = (0, node_path_1.join)(tempDir, "body.md");
        (0, node_fs_1.writeFileSync)(bodyPath, "Sepo self-merge completed.\n\n<!-- sepo-agent-self-merge -->\n", "utf8");
        writeFakeGh(tempDir, `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
if [ "$1" = "api" ] && [ "$2" = "graphql" ]; then
  printf '{"data":{"viewer":{"login":"sepo-agent-app[bot]"}}}\\n'
  exit 0
fi
if [ "$1" = "api" ] && [ "$2" = "--paginate" ] && [ "$3" = "--slurp" ]; then
  printf '[[{"id":111,"body":"old merge marker\\\\n<!-- sepo-agent-self-merge -->","created_at":"2026-05-07T10:00:00Z","user":{"login":"sepo-agent-app"}},{"id":222,"body":"untrusted merge marker\\\\n<!-- sepo-agent-self-merge -->","created_at":"2026-05-07T10:05:00Z","user":{"login":"alice"}},{"id":333,"body":"latest merge marker\\\\n<!-- sepo-agent-self-merge -->","created_at":"2026-05-07T10:10:00Z","user":{"login":"app/sepo-agent-app"}}]]\\n'
  exit 0
fi
if [ "$1" = "api" ] && [ "$2" = "--method" ] && [ "$3" = "PATCH" ]; then
  exit 0
fi
printf 'unexpected gh args: %s\\n' "$*" >&2
exit 1
`);
        const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/post-response.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                BODY_FILE: bodyPath,
                RESPONSE_KIND: "pr_comment",
                TARGET_NUMBER: "321",
                GITHUB_REPOSITORY: "self-evolving/repo",
                FAKE_GH_LOG: logPath,
            },
            encoding: "utf8",
        });
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.match(result.stdout, /Updated self-merge status comment/);
        const log = (0, node_fs_1.readFileSync)(logPath, "utf8");
        node_assert_1.strict.match(log, /^api graphql /m);
        node_assert_1.strict.match(log, /^api --paginate --slurp repos\/self-evolving\/repo\/issues\/321\/comments/m);
        node_assert_1.strict.match(log, /^api --method PATCH repos\/self-evolving\/repo\/issues\/comments\/333 /m);
        node_assert_1.strict.doesNotMatch(log, /issues\/comments\/111/);
        node_assert_1.strict.doesNotMatch(log, /issues\/comments\/222/);
        node_assert_1.strict.doesNotMatch(log, /^pr comment /m);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("post-response CLI ignores untrusted self-approval marker comments", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-post-response-"));
    try {
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        const bodyPath = (0, node_path_1.join)(tempDir, "body.md");
        (0, node_fs_1.writeFileSync)(bodyPath, "Sepo self-approval completed.\n\n<!-- sepo-agent-self-approval -->\n", "utf8");
        writeFakeGh(tempDir, `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
if [ "$1" = "api" ] && [ "$2" = "graphql" ]; then
  printf '{"data":{"viewer":{"login":"sepo-agent-app"}}}\\n'
  exit 0
fi
if [ "$1" = "api" ] && [ "$2" = "--paginate" ] && [ "$3" = "--slurp" ]; then
  printf '[[{"id":456,"body":"user marker\\\\n<!-- sepo-agent-self-approval -->","created_at":"2026-05-07T10:00:00Z","user":{"login":"someone-else"}}]]\\n'
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "comment" ]; then
  exit 0
fi
printf 'unexpected gh args: %s\\n' "$*" >&2
exit 1
`);
        const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/post-response.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                BODY_FILE: bodyPath,
                RESPONSE_KIND: "pr_comment",
                TARGET_NUMBER: "321",
                GITHUB_REPOSITORY: "self-evolving/repo",
                FAKE_GH_LOG: logPath,
            },
            encoding: "utf8",
        });
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.match(result.stdout, /Created self-approval status comment/);
        const log = (0, node_fs_1.readFileSync)(logPath, "utf8");
        node_assert_1.strict.match(log, /^api graphql /m);
        node_assert_1.strict.match(log, /^api --paginate --slurp repos\/self-evolving\/repo\/issues\/321\/comments/m);
        node_assert_1.strict.doesNotMatch(log, /^api --method PATCH /m);
        node_assert_1.strict.match(log, /^pr comment 321 --body Sepo self-approval completed/m);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("post-response CLI does not fallback post when self-approval upsert fails", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-post-response-"));
    try {
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        const bodyPath = (0, node_path_1.join)(tempDir, "body.md");
        (0, node_fs_1.writeFileSync)(bodyPath, "Sepo self-approval completed.\n\n<!-- sepo-agent-self-approval -->\n", "utf8");
        writeFakeGh(tempDir, `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
if [ "$1" = "api" ] && [ "$2" = "graphql" ]; then
  printf '{"data":{"viewer":{"login":"sepo-agent-app"}}}\\n'
  exit 0
fi
if [ "$1" = "api" ] && [ "$2" = "--paginate" ] && [ "$3" = "--slurp" ]; then
  printf '[[{"id":789,"body":"existing marker\\\\n<!-- sepo-agent-self-approval -->","created_at":"2026-05-07T10:00:00Z","user":{"login":"sepo-agent-app"}}]]\\n'
  exit 0
fi
if [ "$1" = "api" ] && [ "$2" = "--method" ] && [ "$3" = "PATCH" ]; then
  printf 'patch unavailable\\n' >&2
  exit 1
fi
if [ "$1" = "pr" ] && [ "$2" = "comment" ]; then
  printf 'unexpected fallback post\\n' >&2
  exit 1
fi
printf 'unexpected gh args: %s\\n' "$*" >&2
exit 1
`);
        const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/post-response.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                BODY_FILE: bodyPath,
                RESPONSE_KIND: "pr_comment",
                TARGET_NUMBER: "321",
                GITHUB_REPOSITORY: "self-evolving/repo",
                FAKE_GH_LOG: logPath,
            },
            encoding: "utf8",
        });
        node_assert_1.strict.equal(result.status, 1);
        node_assert_1.strict.match(result.stderr, /Failed to upsert self-approval status comment for self-evolving\/repo#321:/);
        const log = (0, node_fs_1.readFileSync)(logPath, "utf8");
        node_assert_1.strict.match(log, /^api graphql /m);
        node_assert_1.strict.match(log, /^api --paginate --slurp repos\/self-evolving\/repo\/issues\/321\/comments/m);
        node_assert_1.strict.match(log, /^api --method PATCH repos\/self-evolving\/repo\/issues\/comments\/789 /m);
        node_assert_1.strict.doesNotMatch(log, /^pr comment /m);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
//# sourceMappingURL=post-response-cli.test.js.map