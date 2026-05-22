"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const repoRoot = (0, node_path_1.resolve)(__dirname, "../../..");
(0, node_test_1.test)("dispatch-agent-orchestrator defaults automation max rounds to 12", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-dispatch-orchestrator-"));
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
        const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/dispatch-agent-orchestrator.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                FAKE_DISPATCH_PAYLOAD: payloadPath,
                GITHUB_REPOSITORY: "self-evolving/repo",
                DEFAULT_BRANCH: "main",
                SOURCE_ACTION: "orchestrate",
                SOURCE_CONCLUSION: "requested",
                TARGET_KIND: "issue",
                TARGET_NUMBER: "30",
                REQUESTED_BY: "lolipopshock",
                REQUEST_TEXT: "@sepo-agent /orchestrate",
                AUTOMATION_MODE: "agent",
            },
            encoding: "utf8",
        });
        node_assert_1.strict.equal(result.status, 0, result.stderr || result.stdout);
        node_assert_1.strict.ok((0, node_fs_1.existsSync)(payloadPath));
        const payload = JSON.parse((0, node_fs_1.readFileSync)(payloadPath, "utf8"));
        node_assert_1.strict.equal(payload.inputs.automation_max_rounds, "12");
        node_assert_1.strict.equal(payload.inputs.automation_current_round, "1");
        node_assert_1.strict.equal(payload.inputs.source_action, "orchestrate");
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("dispatch-agent-orchestrator forwards review recommended next step", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-dispatch-orchestrator-"));
    try {
        const payloadPath = (0, node_path_1.join)(tempDir, "dispatch.json");
        const responsePath = (0, node_path_1.join)(tempDir, "response.md");
        (0, node_fs_1.writeFileSync)(responsePath, [
            "## Recommended Next Step",
            "HUMAN_DECISION: Let self-approval decide whether the warnings are acceptable.",
            "",
            "## Final Verdict",
            "MINOR_ISSUES",
            "",
            "## Action Items",
            "- [ ] Optional polish that should not become fix-pr context.",
        ].join("\n"), "utf8");
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(tempDir, "gh"), `#!/usr/bin/env bash
set -euo pipefail
if [ "\${1-}" = "api" ] && [ "\${2-}" = "-X" ] && [ "\${3-}" = "POST" ]; then
  cat > "$FAKE_DISPATCH_PAYLOAD"
  exit 0
fi
printf 'unexpected gh args: %s\\n' "$*" >&2
exit 1
`, { encoding: "utf8", mode: 0o755 });
        const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/dispatch-agent-orchestrator.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                FAKE_DISPATCH_PAYLOAD: payloadPath,
                GITHUB_REPOSITORY: "self-evolving/repo",
                DEFAULT_BRANCH: "main",
                SOURCE_ACTION: "review",
                RESPONSE_FILE: responsePath,
                TARGET_KIND: "pull_request",
                TARGET_NUMBER: "30",
                REQUESTED_BY: "lolipopshock",
                REQUEST_TEXT: "@sepo-agent /orchestrate",
                AUTOMATION_MODE: "heuristics",
                ORCHESTRATION_ENABLED: "true",
            },
            encoding: "utf8",
        });
        node_assert_1.strict.equal(result.status, 0, result.stderr || result.stdout);
        node_assert_1.strict.ok((0, node_fs_1.existsSync)(payloadPath));
        const payload = JSON.parse((0, node_fs_1.readFileSync)(payloadPath, "utf8"));
        node_assert_1.strict.equal(payload.inputs.source_conclusion, "minor_issues");
        node_assert_1.strict.equal(payload.inputs.source_recommended_next_step, "human_decision");
        node_assert_1.strict.equal(payload.inputs.source_handoff_context, "");
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
//# sourceMappingURL=dispatch-agent-orchestrator-cli.test.js.map