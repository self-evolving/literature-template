"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
function writeFakeGh(tempDir, responses) {
    const responseList = Array.isArray(responses) ? responses : [responses];
    responseList.forEach((response, index) => {
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(tempDir, `response-${index}.json`), response);
    });
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(tempDir, "gh"), `#!/usr/bin/env bash
if [ "$1" = "api" ] && [ "$2" = "graphql" ]; then
  count_file="${(0, node_path_1.join)(tempDir, "gh-count")}"
  count="$(cat "$count_file" 2>/dev/null || printf '0')"
  response_file="${(0, node_path_1.join)(tempDir, "response-")}$count.json"
  next_count="$((count + 1))"
  printf '%s' "$next_count" > "$count_file"
  if [ -f "$response_file" ]; then
    cat "$response_file"
    exit 0
  fi
  printf 'missing fake gh response: %s\\n' "$response_file" >&2
  exit 1
fi
printf 'unexpected gh args: %s\\n' "$*" >&2
exit 1
`, { encoding: "utf8", mode: 0o755 });
}
function runGate(tempDir, env) {
    const outputFile = (0, node_path_1.join)(tempDir, "outputs.txt");
    const result = (0, node_child_process_1.spawnSync)("bash", ["scripts/resolve-discussion-post-gate.sh"], {
        cwd: process.cwd(),
        env: {
            ...process.env,
            GITHUB_OUTPUT: outputFile,
            GITHUB_REPOSITORY: "self-evolving/repo",
            PATH: `${tempDir}:${process.env.PATH || ""}`,
            ...env,
        },
        encoding: "utf8",
    });
    const outputText = result.status === 0 ? (0, node_fs_1.readFileSync)(outputFile, "utf8") : "";
    const payload = result.stdout.trim() ? JSON.parse(result.stdout) : null;
    return { result, outputText, payload };
}
(0, node_test_1.test)("discussion post gate skips when repository discussions are disabled", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "discussion-gate-"));
    try {
        writeFakeGh(tempDir, '{"data":{"repository":{"hasDiscussionsEnabled":false,"discussionCategories":{"nodes":[]}}}}');
        const { result, outputText, payload } = runGate(tempDir, {
            DISCUSSION_CATEGORY: "General",
        });
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.equal(payload.skip, true);
        node_assert_1.strict.equal(payload.reason, "repository discussions are disabled");
        node_assert_1.strict.match(outputText, /skip<<[\s\S]*true/);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("discussion post gate skips when the configured category is missing", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "discussion-gate-"));
    try {
        writeFakeGh(tempDir, '{"data":{"repository":{"hasDiscussionsEnabled":true,"discussionCategories":{"nodes":[{"name":"General"}]}}}}');
        const { result, payload } = runGate(tempDir, {
            DISCUSSION_CATEGORY: "Daily Summaries",
        });
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.equal(payload.skip, true);
        node_assert_1.strict.equal(payload.reason, "discussion category 'Daily Summaries' was not found");
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("discussion post gate allows summary generation when posting is available", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "discussion-gate-"));
    try {
        writeFakeGh(tempDir, '{"data":{"repository":{"hasDiscussionsEnabled":true,"discussionCategories":{"nodes":[{"name":"General"}]}}}}');
        const { result, payload } = runGate(tempDir, {
            DISCUSSION_CATEGORY: "General",
        });
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.equal(payload.skip, false);
        node_assert_1.strict.equal(payload.reason, "discussion posting is available");
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("discussion post gate paginates categories before deciding posting is available", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "discussion-gate-"));
    try {
        writeFakeGh(tempDir, [
            '{"data":{"repository":{"hasDiscussionsEnabled":true,"discussionCategories":{"nodes":[{"name":"General"}],"pageInfo":{"hasNextPage":true,"endCursor":"cursor-1"}}}}}',
            '{"data":{"repository":{"hasDiscussionsEnabled":true,"discussionCategories":{"nodes":[{"name":"Daily Summaries"}],"pageInfo":{"hasNextPage":false,"endCursor":"cursor-2"}}}}}',
        ]);
        const { result, payload } = runGate(tempDir, {
            DISCUSSION_CATEGORY: "Daily Summaries",
        });
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.equal((0, node_fs_1.readFileSync)((0, node_path_1.join)(tempDir, "gh-count"), "utf8"), "2");
        node_assert_1.strict.equal(payload.skip, false);
        node_assert_1.strict.equal(payload.reason, "discussion posting is available");
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
//# sourceMappingURL=discussion-post-gate-shell.test.js.map