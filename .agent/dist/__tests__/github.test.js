"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const github_js_1 = require("../github.js");
function writeExecutable(path, content) {
    (0, node_fs_1.writeFileSync)(path, content, { encoding: "utf8", mode: 0o755 });
}
(0, node_test_1.test)("dispatchWorkflow retries without inputs unsupported by the live workflow schema", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-dispatch-workflow-"));
    const originalPath = process.env.PATH;
    try {
        const binDir = (0, node_path_1.join)(tempDir, "bin");
        const payloadDir = (0, node_path_1.join)(tempDir, "payloads");
        const countPath = (0, node_path_1.join)(tempDir, "count");
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        (0, node_fs_1.mkdirSync)(binDir, { recursive: true });
        (0, node_fs_1.mkdirSync)(payloadDir, { recursive: true });
        writeExecutable((0, node_path_1.join)(binDir, "gh"), [
            "#!/usr/bin/env bash",
            "set -euo pipefail",
            `count_path=${JSON.stringify(countPath)}`,
            `payload_dir=${JSON.stringify(payloadDir)}`,
            `log_path=${JSON.stringify(logPath)}`,
            "count=0",
            "if [[ -f \"$count_path\" ]]; then count=$(cat \"$count_path\"); fi",
            "count=$((count + 1))",
            "printf '%s' \"$count\" > \"$count_path\"",
            "printf '%s\\n' \"$*\" >> \"$log_path\"",
            "cat > \"$payload_dir/payload-$count.json\"",
            "if [[ \"$count\" == \"1\" ]]; then",
            "  printf '%s\\n' '{\"message\":\"Unexpected inputs provided: [\\\"target_kind\\\", \\\"access_policy\\\"]\"}'",
            "  printf '%s\\n' 'gh: Unexpected inputs provided: [\"target_kind\", \"access_policy\"]' >&2",
            "  exit 1",
            "fi",
            "exit 0",
            "",
        ].join("\n"));
        process.env.PATH = `${binDir}:${originalPath || ""}`;
        (0, github_js_1.dispatchWorkflow)("self-evolving/repo", "agent-orchestrator.yml", "main", {
            access_policy: "{}",
            source_action: "fix-pr",
            target_kind: "pull_request",
            target_number: "20",
        });
        const firstPayload = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(payloadDir, "payload-1.json"), "utf8"));
        const retryPayload = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(payloadDir, "payload-2.json"), "utf8"));
        const log = (0, node_fs_1.readFileSync)(logPath, "utf8").trim().split(/\r?\n/);
        node_assert_1.strict.equal(log.length, 2);
        node_assert_1.strict.equal(firstPayload.inputs.target_kind, "pull_request");
        node_assert_1.strict.equal(firstPayload.inputs.access_policy, "{}");
        node_assert_1.strict.equal(retryPayload.ref, "main");
        node_assert_1.strict.deepEqual(retryPayload.inputs, {
            source_action: "fix-pr",
            target_number: "20",
        });
    }
    finally {
        process.env.PATH = originalPath;
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
//# sourceMappingURL=github.test.js.map