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
function runCli(tempDir, env) {
    return (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/post-project-management-summary.js"], {
        cwd: repoRoot,
        env: {
            ...process.env,
            PATH: `${tempDir}:${process.env.PATH || ""}`,
            ...env,
        },
        encoding: "utf8",
    });
}
(0, node_test_1.test)("post project management summary writes the Actions step summary without discussion posting", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "project-summary-"));
    try {
        const bodyFile = (0, node_path_1.join)(tempDir, "summary.md");
        const stepSummary = (0, node_path_1.join)(tempDir, "step-summary.md");
        const outputs = (0, node_path_1.join)(tempDir, "outputs.txt");
        (0, node_fs_1.writeFileSync)(bodyFile, "## Project Management Summary\n\n- Mode: dry run\n");
        const result = runCli(tempDir, {
            AGENT_PROJECT_MANAGEMENT_POST_SUMMARY: "false",
            BODY_FILE: bodyFile,
            GITHUB_OUTPUT: outputs,
            GITHUB_STEP_SUMMARY: stepSummary,
        });
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.match(result.stdout, /posting is disabled/);
        node_assert_1.strict.match((0, node_fs_1.readFileSync)(stepSummary, "utf8"), /Mode: dry run/);
        node_assert_1.strict.match((0, node_fs_1.readFileSync)(outputs, "utf8"), /summary_posted<<.*\nfalse\n/s);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("post project management summary comments on today's Daily Summary discussion when enabled", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "project-summary-"));
    try {
        const bodyFile = (0, node_path_1.join)(tempDir, "summary.md");
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        const outputPath = (0, node_path_1.join)(tempDir, "outputs.txt");
        const stepSummary = (0, node_path_1.join)(tempDir, "step-summary.md");
        (0, node_fs_1.writeFileSync)(bodyFile, "## Project Management Summary\n\n- Mode: labels applied\n");
        writeFakeGh(tempDir, `#!/usr/bin/env bash
printf '%s\n' "$*" >> "$FAKE_GH_LOG"
if [ "$1" = "api" ] && [ "$2" = "graphql" ]; then
  if printf '%s\n' "$*" | grep -q 'discussions(first'; then
    printf '{"data":{"repository":{"discussions":{"nodes":[{"id":"D_1","number":7,"title":"Daily Summary — 2026-04-29","url":"https://github.com/self-evolving/repo/discussions/7","category":{"name":"General"}}]}}}}'
    exit 0
  fi
  if printf '%s\n' "$*" | grep -q 'addDiscussionComment'; then
    printf '{"data":{"addDiscussionComment":{"comment":{"url":"https://github.com/self-evolving/repo/discussions/7#discussioncomment-1"}}}}'
    exit 0
  fi
fi
printf 'unexpected gh args: %s\n' "$*" >&2
exit 1
`);
        const result = runCli(tempDir, {
            AGENT_PROJECT_MANAGEMENT_DISCUSSION_CATEGORY: "General",
            AGENT_PROJECT_MANAGEMENT_POST_SUMMARY: "true",
            AGENT_PROJECT_MANAGEMENT_SUMMARY_DATE: "2026-04-29",
            BODY_FILE: bodyFile,
            FAKE_GH_LOG: logPath,
            GITHUB_OUTPUT: outputPath,
            GITHUB_REPOSITORY: "self-evolving/repo",
            GITHUB_STEP_SUMMARY: stepSummary,
        });
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.match(result.stdout, /Posted project management summary to https:\/\/github\.com\/self-evolving\/repo\/discussions\/7/);
        const log = (0, node_fs_1.readFileSync)(logPath, "utf8");
        node_assert_1.strict.match(log, /^api graphql /m);
        node_assert_1.strict.match(log, /addDiscussionComment/);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
//# sourceMappingURL=post-project-management-summary-cli.test.js.map