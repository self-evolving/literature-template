"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const implementation_base_js_1 = require("../implementation-base.js");
function withFakePrMeta(metaJson, callback) {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-implementation-base-"));
    const originalPath = process.env.PATH;
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(tempDir, "gh"), [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        "if [ \"${1-}\" = \"pr\" ] && [ \"${2-}\" = \"view\" ]; then",
        `  printf '%s\\n' '${metaJson}'`,
        "  exit 0",
        "fi",
        "printf 'unexpected gh args: %s\\n' \"$*\" >&2",
        "exit 1",
        "",
    ].join("\n"), { encoding: "utf8", mode: 0o755 });
    process.env.PATH = `${tempDir}:${originalPath || ""}`;
    try {
        callback();
    }
    finally {
        process.env.PATH = originalPath;
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
}
(0, node_test_1.test)("implementation base defaults to repository default branch", () => {
    node_assert_1.strict.deepEqual((0, implementation_base_js_1.resolveImplementationBase)({ defaultBranch: "main" }), {
        baseBranch: "main",
        source: "default_branch",
    });
});
(0, node_test_1.test)("implementation base accepts an explicit branch", () => {
    node_assert_1.strict.deepEqual((0, implementation_base_js_1.resolveImplementationBase)({
        defaultBranch: "main",
        baseBranch: "agent/implement-issue-30/codex-1",
    }), {
        baseBranch: "agent/implement-issue-30/codex-1",
        source: "base_branch",
    });
});
(0, node_test_1.test)("implementation base resolves an open same-repository PR head", () => {
    withFakePrMeta("{\"headRefName\":\"agent/parent-branch\",\"headRefOid\":\"abc123\",\"isCrossRepository\":false,\"state\":\"OPEN\"}", () => {
        node_assert_1.strict.deepEqual((0, implementation_base_js_1.resolveImplementationBase)({
            defaultBranch: "main",
            basePr: "42",
            repo: "self-evolving/repo",
        }), {
            baseBranch: "agent/parent-branch",
            source: "base_pr",
            basePr: 42,
        });
    });
});
(0, node_test_1.test)("implementation base rejects cross-repository PR heads", () => {
    withFakePrMeta("{\"headRefName\":\"contributor:topic\",\"headRefOid\":\"abc123\",\"isCrossRepository\":true,\"state\":\"OPEN\"}", () => node_assert_1.strict.throws(() => (0, implementation_base_js_1.resolveImplementationBase)({
        defaultBranch: "main",
        basePr: "42",
        repo: "self-evolving/repo",
    }), /from a fork/));
});
(0, node_test_1.test)("implementation base rejects non-open PRs", () => {
    withFakePrMeta("{\"headRefName\":\"agent/closed-parent\",\"headRefOid\":\"abc123\",\"isCrossRepository\":false,\"state\":\"CLOSED\"}", () => node_assert_1.strict.throws(() => (0, implementation_base_js_1.resolveImplementationBase)({
        defaultBranch: "main",
        basePr: "42",
        repo: "self-evolving/repo",
    }), /must be open/));
});
(0, node_test_1.test)("implementation base rejects ambiguous and unsafe inputs", () => {
    node_assert_1.strict.throws(() => (0, implementation_base_js_1.resolveImplementationBase)({ defaultBranch: "main", baseBranch: "topic", basePr: "12" }), /set only one/);
    node_assert_1.strict.throws(() => (0, implementation_base_js_1.resolveImplementationBase)({ defaultBranch: "main", basePr: "#12" }), /positive integer/);
    node_assert_1.strict.throws(() => (0, implementation_base_js_1.validateBaseBranch)("bad branch"), /invalid base branch/);
    node_assert_1.strict.throws(() => (0, implementation_base_js_1.validateBaseBranch)("-topic"), /must not start/);
});
//# sourceMappingURL=implementation-base.test.js.map