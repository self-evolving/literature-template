"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_child_process_1 = require("node:child_process");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
function runPendingGate(prsJson, extraEnv = {}) {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "pending-update-gate-"));
    const binDir = (0, node_path_1.join)(tempDir, "bin");
    const outputFile = (0, node_path_1.join)(tempDir, "outputs.txt");
    const responseFile = (0, node_path_1.join)(tempDir, "prs.json");
    const ghPath = (0, node_path_1.join)(binDir, "gh");
    (0, node_fs_1.mkdirSync)(binDir);
    (0, node_fs_1.writeFileSync)(responseFile, prsJson);
    (0, node_fs_1.writeFileSync)(ghPath, [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        "if [ \"$1 $2 $3\" != \"pr list --repo\" ]; then",
        "  echo \"unexpected gh invocation: $*\" >&2",
        "  exit 1",
        "fi",
        "cat \"${GH_STUB_RESPONSE}\"",
    ].join("\n") + "\n");
    (0, node_fs_1.chmodSync)(ghPath, 0o755);
    const result = (0, node_child_process_1.spawnSync)("bash", ["scripts/resolve-pending-update-pr.sh"], {
        cwd: process.cwd(),
        env: {
            ...process.env,
            GH_TOKEN: "test-token",
            GITHUB_OUTPUT: outputFile,
            GITHUB_REPOSITORY: "self-evolving/repo",
            GH_STUB_RESPONSE: responseFile,
            IGNORE_EXISTING_UPDATE_PR: "false",
            PATH: `${binDir}:${process.env.PATH || ""}`,
            UPDATE_BRANCH_PREFIX: "agent/update-agent-infra-",
            ...extraEnv,
        },
        encoding: "utf8",
    });
    const outputText = result.status === 0 ? (0, node_fs_1.readFileSync)(outputFile, "utf8") : "";
    const payload = result.stdout.trim() ? JSON.parse(result.stdout) : null;
    return { result, outputText, payload };
}
(0, node_test_1.test)("pending update PR gate adopts same-repository update branches", () => {
    const { result, outputText, payload } = runPendingGate(JSON.stringify([
        {
            number: 123,
            url: "https://github.com/self-evolving/repo/pull/123",
            headRefName: "agent/update-agent-infra-20260503",
            isCrossRepository: false,
        },
    ]));
    node_assert_1.strict.equal(result.status, 0, result.stderr);
    node_assert_1.strict.equal(payload.skip, false);
    node_assert_1.strict.equal(payload.found, true);
    node_assert_1.strict.equal(payload.reason, "existing update PR will be updated");
    node_assert_1.strict.equal(payload.prNumber, "123");
    node_assert_1.strict.equal(payload.branch, "agent/update-agent-infra-20260503");
    node_assert_1.strict.match(outputText, /skip<<[\s\S]*false/);
    node_assert_1.strict.match(outputText, /found<<[\s\S]*true/);
    node_assert_1.strict.match(outputText, /pr_url<<[\s\S]*\/pull\/123/);
});
(0, node_test_1.test)("pending update PR gate ignores unrelated and cross-repository PRs", () => {
    const { result, payload } = runPendingGate(JSON.stringify([
        {
            number: 10,
            url: "https://github.com/self-evolving/repo/pull/10",
            headRefName: "agent/update-agent-infra-20260503",
            isCrossRepository: true,
        },
        {
            number: 11,
            url: "https://github.com/self-evolving/repo/pull/11",
            headRefName: "agent/implement-issue-27/codex-1",
            isCrossRepository: false,
        },
    ]));
    node_assert_1.strict.equal(result.status, 0, result.stderr);
    node_assert_1.strict.equal(payload.skip, false);
    node_assert_1.strict.equal(payload.found, false);
    node_assert_1.strict.equal(payload.reason, "no pending update PR");
});
(0, node_test_1.test)("pending update PR gate allows explicit force runs", () => {
    const { result, payload } = runPendingGate(JSON.stringify([
        {
            number: 123,
            url: "https://github.com/self-evolving/repo/pull/123",
            headRefName: "agent/update-agent-infra-20260503",
            isCrossRepository: false,
        },
    ]), { IGNORE_EXISTING_UPDATE_PR: "true" });
    node_assert_1.strict.equal(result.status, 0, result.stderr);
    node_assert_1.strict.equal(payload.skip, false);
    node_assert_1.strict.equal(payload.found, false);
    node_assert_1.strict.equal(payload.reason, "pending update PR override enabled");
    node_assert_1.strict.equal(payload.prNumber, "");
    node_assert_1.strict.equal(payload.branch, "");
});
//# sourceMappingURL=pending-update-pr-gate-shell.test.js.map