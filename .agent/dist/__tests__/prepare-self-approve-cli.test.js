"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const repoRoot = (0, node_path_1.resolve)(__dirname, "../../..");
function runPrepareSelfApprove(env, tempDir) {
    const outputFile = (0, node_path_1.join)(tempDir, "github-output");
    (0, node_fs_1.writeFileSync)(outputFile, "", "utf8");
    const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/prepare-self-approve.js"], {
        cwd: repoRoot,
        env: {
            ...process.env,
            ...env,
            GITHUB_OUTPUT: outputFile,
        },
        encoding: "utf8",
    });
    return {
        status: result.status,
        output: (0, node_fs_1.readFileSync)(outputFile, "utf8"),
        stderr: result.stderr,
    };
}
(0, node_test_1.test)("prepare-self-approve stops when self-approval is disabled", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-self-approve-prepare-"));
    try {
        const result = runPrepareSelfApprove({
            AGENT_ALLOW_SELF_APPROVE: "false",
            GITHUB_REPOSITORY: "self-evolving/repo",
            TARGET_KIND: "pull_request",
            TARGET_NUMBER: "42",
        }, tempDir);
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.match(result.output, /should_run<<[^\n]+\nfalse/);
        node_assert_1.strict.match(result.output, /AGENT_ALLOW_SELF_APPROVE is not enabled/);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("prepare-self-approve stops on non-PR targets before reading GitHub", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-self-approve-prepare-"));
    try {
        const result = runPrepareSelfApprove({
            AGENT_ALLOW_SELF_APPROVE: "true",
            GITHUB_REPOSITORY: "self-evolving/repo",
            TARGET_KIND: "issue",
            TARGET_NUMBER: "42",
        }, tempDir);
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.match(result.output, /should_run<<[^\n]+\nfalse/);
        node_assert_1.strict.match(result.output, /only supported for pull requests/);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("prepare-self-approve stops on closed pull requests", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-self-approve-prepare-"));
    try {
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(tempDir, "gh"), `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
if [ "$1" = "pr" ] && [ "$2" = "view" ]; then
  printf '{"headRefName":"agent/test","headRefOid":"abc123","isCrossRepository":false,"state":"CLOSED"}\\n'
  exit 0
fi
printf 'unexpected gh args: %s\\n' "$*" >&2
exit 1
`, { encoding: "utf8", mode: 0o755 });
        const result = runPrepareSelfApprove({
            PATH: `${tempDir}:${process.env.PATH || ""}`,
            AGENT_ALLOW_SELF_APPROVE: "true",
            FAKE_GH_LOG: logPath,
            GITHUB_REPOSITORY: "self-evolving/repo",
            TARGET_KIND: "pull_request",
            TARGET_NUMBER: "42",
        }, tempDir);
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.match(result.output, /should_run<<[^\n]+\nfalse/);
        node_assert_1.strict.match(result.output, /pull request is closed/);
        node_assert_1.strict.match((0, node_fs_1.readFileSync)(logPath, "utf8"), /^pr view 42 /m);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("prepare-self-approve emits success outputs for trusted current-head SHIP", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-self-approve-prepare-"));
    try {
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(tempDir, "gh"), `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
if [ "$1" = "pr" ] && [ "$2" = "view" ]; then
  printf '{"author":{"login":"lolipopshock"},"headRefName":"agent/test","headRefOid":"abc123","isCrossRepository":false,"state":"OPEN"}\\n'
  exit 0
fi
if [ "$1" = "api" ] && [ "$2" = "graphql" ]; then
  printf '{"data":{"viewer":{"login":"sepo-agent-app"}}}\\n'
  exit 0
fi
if [ "$1" = "api" ] && [ "$2" = "--paginate" ] && [ "$3" = "--slurp" ]; then
  printf '[[{"id":123,"body":"## AI Review Synthesis <!-- sepo-agent-review-synthesis --> <!-- sepo-agent-review-synthesis-head: abc123 --> ## Final Verdict SHIP","created_at":"2026-05-07T10:00:00Z","user":{"login":"sepo-agent-app"}}]]\\n'
  exit 0
fi
printf 'unexpected gh args: %s\\n' "$*" >&2
exit 1
`, { encoding: "utf8", mode: 0o755 });
        const result = runPrepareSelfApprove({
            PATH: `${tempDir}:${process.env.PATH || ""}`,
            AGENT_ALLOW_SELF_APPROVE: "true",
            FAKE_GH_LOG: logPath,
            GITHUB_REPOSITORY: "self-evolving/repo",
            TARGET_KIND: "pull_request",
            TARGET_NUMBER: "42",
        }, tempDir);
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.match(result.output, /should_run<<[^\n]+\ntrue/);
        node_assert_1.strict.match(result.output, /head_sha<<[^\n]+\nabc123/);
        node_assert_1.strict.match((0, node_fs_1.readFileSync)(logPath, "utf8"), /^api graphql /m);
        node_assert_1.strict.match((0, node_fs_1.readFileSync)(logPath, "utf8"), /^api --paginate --slurp repos\/self-evolving\/repo\/issues\/42\/comments/m);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("prepare-self-approve runs non-SHIP HUMAN_DECISION gate", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-self-approve-prepare-"));
    try {
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(tempDir, "gh"), `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
if [ "$1" = "pr" ] && [ "$2" = "view" ]; then
  printf '{"author":{"login":"lolipopshock"},"headRefName":"agent/test","headRefOid":"abc123","isCrossRepository":false,"state":"OPEN"}\\n'
  exit 0
fi
if [ "$1" = "api" ] && [ "$2" = "graphql" ]; then
  printf '{"data":{"viewer":{"login":"sepo-agent-app"}}}\\n'
  exit 0
fi
if [ "$1" = "api" ] && [ "$2" = "--paginate" ] && [ "$3" = "--slurp" ]; then
  printf '[[{"id":123,"body":"## AI Review Synthesis <!-- sepo-agent-review-synthesis --> <!-- sepo-agent-review-synthesis-head: abc123 --> ## Recommended Next Step HUMAN_DECISION ## Final Verdict NEEDS_REWORK","created_at":"2026-05-07T10:00:00Z","user":{"login":"sepo-agent-app"}}]]\\n'
  exit 0
fi
printf 'unexpected gh args: %s\\n' "$*" >&2
exit 1
`, { encoding: "utf8", mode: 0o755 });
        const result = runPrepareSelfApprove({
            PATH: `${tempDir}:${process.env.PATH || ""}`,
            AGENT_ALLOW_SELF_APPROVE: "true",
            FAKE_GH_LOG: logPath,
            GITHUB_REPOSITORY: "self-evolving/repo",
            SOURCE_RECOMMENDED_NEXT_STEP: "HUMAN_DECISION",
            TARGET_KIND: "pull_request",
            TARGET_NUMBER: "42",
        }, tempDir);
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.match(result.output, /should_run<<[^\n]+\ntrue/);
        node_assert_1.strict.match(result.output, /head_sha<<[^\n]+\nabc123/);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("prepare-self-approve requires trusted HUMAN_DECISION before non-SHIP gate", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-self-approve-prepare-"));
    try {
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(tempDir, "gh"), `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
if [ "$1" = "pr" ] && [ "$2" = "view" ]; then
  printf '{"author":{"login":"lolipopshock"},"headRefName":"agent/test","headRefOid":"abc123","isCrossRepository":false,"state":"OPEN"}\\n'
  exit 0
fi
if [ "$1" = "api" ] && [ "$2" = "graphql" ]; then
  printf '{"data":{"viewer":{"login":"sepo-agent-app"}}}\\n'
  exit 0
fi
if [ "$1" = "api" ] && [ "$2" = "--paginate" ] && [ "$3" = "--slurp" ]; then
  printf '[[{"id":123,"body":"## AI Review Synthesis <!-- sepo-agent-review-synthesis --> <!-- sepo-agent-review-synthesis-head: abc123 --> ## Recommended Next Step FIX_PR ## Final Verdict NEEDS_REWORK","created_at":"2026-05-07T10:00:00Z","user":{"login":"sepo-agent-app"}}]]\\n'
  exit 0
fi
printf 'unexpected gh args: %s\\n' "$*" >&2
exit 1
`, { encoding: "utf8", mode: 0o755 });
        const result = runPrepareSelfApprove({
            PATH: `${tempDir}:${process.env.PATH || ""}`,
            AGENT_ALLOW_SELF_APPROVE: "true",
            FAKE_GH_LOG: logPath,
            GITHUB_REPOSITORY: "self-evolving/repo",
            SOURCE_RECOMMENDED_NEXT_STEP: "HUMAN_DECISION",
            TARGET_KIND: "pull_request",
            TARGET_NUMBER: "42",
        }, tempDir);
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.match(result.output, /should_run<<[^\n]+\nfalse/);
        node_assert_1.strict.match(result.output, /not SHIP/);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
//# sourceMappingURL=prepare-self-approve-cli.test.js.map