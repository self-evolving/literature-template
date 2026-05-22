"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const repoRoot = (0, node_path_1.resolve)(__dirname, "../../..");
function parseGithubOutput(raw) {
    const outputs = new Map();
    const blocks = raw.matchAll(/^([^<\n]+)<<([^\n]+)\n([\s\S]*?)\n\2$/gm);
    for (const [, name, , value] of blocks) {
        outputs.set(name, value);
    }
    return outputs;
}
function writeFakeGh(tempDir) {
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(tempDir, "gh"), `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
if [ "$1" = "pr" ] && [ "$2" = "view" ]; then
  view_count_file="\${FAKE_GH_VIEW_COUNT_FILE-\${FAKE_GH_LOG}.view-count}"
  view_count=0
  if [ -f "$view_count_file" ]; then
    view_count="$(cat "$view_count_file")"
  fi
  printf '%s\\n' "$((view_count + 1))" > "$view_count_file"
  auto_merge_request="\${FAKE_AUTO_MERGE_REQUEST-null}"
  is_draft="\${FAKE_IS_DRAFT-false}"
  merge_state="\${FAKE_MERGE_STATE-CLEAN}"
  mergeable="\${FAKE_MERGEABLE-MERGEABLE}"
  if [ "\${FAKE_READY_RECHECK-}" = "true" ] && [ "$view_count" -gt 0 ]; then
    is_draft="\${FAKE_AFTER_READY_IS_DRAFT-false}"
    merge_state="\${FAKE_AFTER_READY_MERGE_STATE-CLEAN}"
    mergeable="\${FAKE_AFTER_READY_MERGEABLE-MERGEABLE}"
  fi
  printf '{"headRefOid":"abc123","isDraft":%s,"state":"%s","mergeStateStatus":"%s","mergeable":"%s","reviewDecision":"%s","statusCheckRollup":%s,"autoMergeRequest":%s}\\n' \
    "$is_draft" \
    "\${FAKE_PR_STATE-OPEN}" \
    "$merge_state" \
    "$mergeable" \
    "\${FAKE_REVIEW_DECISION-APPROVED}" \
    "\${FAKE_STATUS_CHECK_ROLLUP-[]}" \
    "$auto_merge_request"
  exit 0
fi
if [ "$1" = "api" ] && [ "$2" = "graphql" ]; then
  printf '{"data":{"viewer":{"login":"sepo-agent-app[bot]"}}}\\n'
  exit 0
fi
if [ "$1" = "api" ] && [ "$2" = "--paginate" ] && [ "$3" = "--slurp" ]; then
  printf '[[{"id":123,"state":"APPROVED","body":"Sepo self-approval completed. <!-- sepo-agent-self-approval -->","commit_id":"%s","submitted_at":"2026-05-10T10:00:00Z","user":{"login":"sepo-agent-app"}}]]\\n' "\${FAKE_APPROVAL_HEAD-abc123}"
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "ready" ]; then
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "merge" ]; then
  exit 0
fi
printf 'unexpected gh args: %s\\n' "$*" >&2
exit 1
`, { encoding: "utf8", mode: 0o755 });
}
function runResolveSelfMerge(tempDir, env = {}) {
    const outputFile = (0, node_path_1.join)(tempDir, "github-output");
    (0, node_fs_1.writeFileSync)(outputFile, "", "utf8");
    const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/resolve-self-merge.js"], {
        cwd: repoRoot,
        env: {
            ...process.env,
            ...env,
            PATH: `${tempDir}:${process.env.PATH || ""}`,
            AGENT_ALLOW_SELF_MERGE: env.AGENT_ALLOW_SELF_MERGE || "true",
            FAKE_GH_LOG: (0, node_path_1.join)(tempDir, "gh.log"),
            GITHUB_OUTPUT: outputFile,
            GITHUB_REPOSITORY: "self-evolving/repo",
            TARGET_KIND: "pull_request",
            TARGET_NUMBER: "42",
        },
        encoding: "utf8",
    });
    return {
        status: result.status,
        stderr: result.stderr,
        outputs: parseGithubOutput((0, node_fs_1.readFileSync)(outputFile, "utf8")),
        log: (0, node_fs_1.readFileSync)((0, node_path_1.join)(tempDir, "gh.log"), "utf8"),
    };
}
(0, node_test_1.test)("resolve-self-merge merges immediately when preflight passes", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-self-merge-cli-"));
    try {
        writeFakeGh(tempDir);
        const result = runResolveSelfMerge(tempDir);
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.equal(result.outputs.get("conclusion"), "merged");
        node_assert_1.strict.equal(result.outputs.get("merged"), "true");
        node_assert_1.strict.equal(result.outputs.get("status_post"), "true");
        node_assert_1.strict.match((0, node_fs_1.readFileSync)(result.outputs.get("body_file") || "", "utf8"), /<!-- sepo-agent-self-merge -->/);
        node_assert_1.strict.match(result.log, /^pr merge 42 --repo self-evolving\/repo --merge --match-head-commit abc123$/m);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("resolve-self-merge enables auto-merge when checks are pending", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-self-merge-cli-"));
    try {
        writeFakeGh(tempDir);
        const result = runResolveSelfMerge(tempDir, {
            FAKE_MERGE_STATE: "BLOCKED",
            FAKE_MERGEABLE: "UNKNOWN",
            FAKE_STATUS_CHECK_ROLLUP: '[{"name":"check","status":"IN_PROGRESS","conclusion":""}]',
        });
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.equal(result.outputs.get("conclusion"), "auto_merge_enabled");
        node_assert_1.strict.equal(result.outputs.get("auto_merge_enabled"), "true");
        node_assert_1.strict.equal(result.outputs.get("status_post"), "true");
        node_assert_1.strict.match(result.log, /^pr merge 42 --repo self-evolving\/repo --merge --auto --match-head-commit abc123$/m);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("resolve-self-merge blocks auto-merge when merge state is missing", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-self-merge-cli-"));
    try {
        writeFakeGh(tempDir);
        const result = runResolveSelfMerge(tempDir, {
            FAKE_MERGE_STATE: "",
            FAKE_MERGEABLE: "UNKNOWN",
            FAKE_STATUS_CHECK_ROLLUP: '[{"name":"check","status":"IN_PROGRESS","conclusion":""}]',
        });
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.equal(result.outputs.get("conclusion"), "blocked");
        node_assert_1.strict.match(result.outputs.get("reason") || "", /merge state: unknown/);
        node_assert_1.strict.doesNotMatch(result.log, /^pr merge /m);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("resolve-self-merge blocks existing auto-merge when merge state is ineligible", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-self-merge-cli-"));
    try {
        writeFakeGh(tempDir);
        const result = runResolveSelfMerge(tempDir, {
            FAKE_AUTO_MERGE_REQUEST: "{}",
            FAKE_MERGE_STATE: "DIRTY",
            FAKE_MERGEABLE: "MERGEABLE",
            FAKE_STATUS_CHECK_ROLLUP: '[{"name":"check","status":"IN_PROGRESS","conclusion":""}]',
        });
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.equal(result.outputs.get("conclusion"), "blocked");
        node_assert_1.strict.equal(result.outputs.get("auto_merge_enabled"), "false");
        node_assert_1.strict.match(result.outputs.get("reason") || "", /not eligible for auto-merge/);
        node_assert_1.strict.doesNotMatch(result.log, /^pr merge /m);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("resolve-self-merge marks draft PRs ready before merging", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-self-merge-cli-"));
    try {
        writeFakeGh(tempDir);
        const result = runResolveSelfMerge(tempDir, {
            FAKE_IS_DRAFT: "true",
            FAKE_MERGE_STATE: "DRAFT",
            FAKE_MERGEABLE: "UNKNOWN",
            FAKE_READY_RECHECK: "true",
        });
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.equal(result.outputs.get("conclusion"), "merged");
        node_assert_1.strict.equal((result.log.match(/^pr view /gm) || []).length, 2);
        node_assert_1.strict.match(result.log, /^pr ready 42 --repo self-evolving\/repo$/m);
        node_assert_1.strict.match(result.log, /^pr merge 42 --repo self-evolving\/repo --merge --match-head-commit abc123$/m);
        node_assert_1.strict.ok(result.log.indexOf("pr ready 42") < result.log.indexOf("pr merge 42"));
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("resolve-self-merge does not constrain the configured PR base", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-self-merge-cli-"));
    try {
        writeFakeGh(tempDir);
        const result = runResolveSelfMerge(tempDir);
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.equal(result.outputs.get("conclusion"), "merged");
        node_assert_1.strict.doesNotMatch(result.log, /^pr list /m);
        node_assert_1.strict.match(result.log, /^pr merge 42 --repo self-evolving\/repo --merge --match-head-commit abc123$/m);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("resolve-self-merge blocks stale self-approval heads", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-self-merge-cli-"));
    try {
        writeFakeGh(tempDir);
        const result = runResolveSelfMerge(tempDir, { FAKE_APPROVAL_HEAD: "old123" });
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.equal(result.outputs.get("conclusion"), "blocked");
        node_assert_1.strict.match(result.outputs.get("reason") || "", /different head SHA/);
        node_assert_1.strict.doesNotMatch(result.log, /^pr merge /m);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
//# sourceMappingURL=resolve-self-merge-cli.test.js.map