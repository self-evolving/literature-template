"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const repoRoot = (0, node_path_1.resolve)(__dirname, "../../..");
(0, node_test_1.test)("dispatch-agent-implement forwards stacked PR base inputs", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-dispatch-implement-"));
    try {
        const payloadPath = (0, node_path_1.join)(tempDir, "dispatch.json");
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(tempDir, "gh"), `#!/usr/bin/env bash
set -euo pipefail
if [ "\${1-}" = "api" ] && [ "\${2-}" = "-X" ] && [ "\${3-}" = "POST" ]; then
  cat > "$FAKE_DISPATCH_PAYLOAD"
  exit 0
fi
printf 'unexpected gh args: %s\\n' "$*" >&2
exit 1
`, { encoding: "utf8", mode: 0o755 });
        const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/dispatch-agent-implement.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                FAKE_DISPATCH_PAYLOAD: payloadPath,
                GITHUB_REPOSITORY: "self-evolving/repo",
                DEFAULT_BRANCH: "main",
                ISSUE_NUMBER: "30",
                REQUESTED_BY: "lolipopshock",
                BASE_BRANCH: "agent/parent-branch",
                BASE_PR: "",
            },
            encoding: "utf8",
        });
        node_assert_1.strict.equal(result.status, 0);
        node_assert_1.strict.ok((0, node_fs_1.existsSync)(payloadPath));
        const payload = JSON.parse((0, node_fs_1.readFileSync)(payloadPath, "utf8"));
        node_assert_1.strict.equal(payload.inputs.base_branch, "agent/parent-branch");
        node_assert_1.strict.equal(payload.inputs.base_pr, "");
        node_assert_1.strict.equal(payload.inputs.automation_max_rounds, "12");
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
//# sourceMappingURL=dispatch-agent-implement-cli.test.js.map