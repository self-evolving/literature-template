"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const repoRoot = (0, node_path_1.resolve)(__dirname, "../../..");
function parseGithubOutput(path) {
    const raw = (0, node_fs_1.readFileSync)(path, "utf8");
    const outputs = new Map();
    const blocks = raw.matchAll(/^([^<\n]+)<<([^\n]+)\n([\s\S]*?)\n\2$/gm);
    for (const [, name, , value] of blocks) {
        outputs.set(name, value);
    }
    return outputs;
}
function runPreflight(env) {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-orchestrator-preflight-"));
    try {
        const outputPath = (0, node_path_1.join)(tempDir, "github-output.txt");
        (0, node_fs_1.writeFileSync)(outputPath, "", "utf8");
        const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/orchestrator-preflight.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                GITHUB_OUTPUT: outputPath,
                AUTOMATION_MODE: "agent",
                AUTOMATION_CURRENT_ROUND: "1",
                AUTOMATION_MAX_ROUNDS: "5",
                SOURCE_ACTION: "orchestrate",
                SOURCE_CONCLUSION: "requested",
                TARGET_KIND: "issue",
                AUTHOR_ASSOCIATION: "MEMBER",
                REPOSITORY_PRIVATE: "true",
                ...env,
            },
            encoding: "utf8",
        });
        return {
            status: result.status,
            stderr: result.stderr,
            stdout: result.stdout,
            outputs: parseGithubOutput(outputPath),
        };
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
}
(0, node_test_1.test)("preflight disables planner when initial orchestrate lacks delegated route access", () => {
    const run = runPreflight({
        AUTHOR_ASSOCIATION: "CONTRIBUTOR",
        ACCESS_POLICY: JSON.stringify({
            route_overrides: {
                implement: ["MEMBER"],
            },
        }),
    });
    node_assert_1.strict.equal(run.status, 0, run.stderr || run.stdout);
    node_assert_1.strict.equal(run.outputs.get("planner_enabled"), "false");
    node_assert_1.strict.equal(run.outputs.get("authorization_stop"), "true");
    node_assert_1.strict.equal(run.outputs.get("authorization_stop_reason"), "orchestrate requests require implement access; implement currently requires MEMBER access.");
});
(0, node_test_1.test)("preflight keeps planner enabled for authorized issue meta-orchestration", () => {
    const run = runPreflight({});
    node_assert_1.strict.equal(run.status, 0, run.stderr || run.stdout);
    node_assert_1.strict.equal(run.outputs.get("planner_enabled"), "true");
    node_assert_1.strict.equal(run.outputs.get("authorization_stop"), "false");
});
(0, node_test_1.test)("preflight defaults automation max rounds to 12", () => {
    const run = runPreflight({ AUTOMATION_MAX_ROUNDS: "" });
    node_assert_1.strict.equal(run.status, 0, run.stderr || run.stdout);
    node_assert_1.strict.equal(run.outputs.get("max_rounds"), "12");
    node_assert_1.strict.equal(run.outputs.get("planner_enabled"), "true");
});
(0, node_test_1.test)("preflight checks self-approval delegated access only when enabled", () => {
    const accessPolicy = JSON.stringify({
        route_overrides: {
            "agent-self-approve": ["MEMBER"],
        },
    });
    const disabled = runPreflight({
        AUTHOR_ASSOCIATION: "CONTRIBUTOR",
        ACCESS_POLICY: accessPolicy,
        REPOSITORY_PRIVATE: "false",
        AGENT_ALLOW_SELF_APPROVE: "false",
    });
    node_assert_1.strict.equal(disabled.status, 0, disabled.stderr || disabled.stdout);
    node_assert_1.strict.equal(disabled.outputs.get("authorization_stop"), "false");
    const enabled = runPreflight({
        AUTHOR_ASSOCIATION: "CONTRIBUTOR",
        ACCESS_POLICY: accessPolicy,
        REPOSITORY_PRIVATE: "false",
        AGENT_ALLOW_SELF_APPROVE: "true",
    });
    node_assert_1.strict.equal(enabled.status, 0, enabled.stderr || enabled.stdout);
    node_assert_1.strict.equal(enabled.outputs.get("authorization_stop"), "true");
    node_assert_1.strict.equal(enabled.outputs.get("authorization_stop_reason"), "orchestrate requests require agent-self-approve access; agent-self-approve currently requires MEMBER access.");
});
(0, node_test_1.test)("preflight checks self-merge delegated access only when enabled", () => {
    const accessPolicy = JSON.stringify({
        route_overrides: {
            "agent-self-merge": ["MEMBER"],
        },
    });
    const disabled = runPreflight({
        AUTHOR_ASSOCIATION: "CONTRIBUTOR",
        ACCESS_POLICY: accessPolicy,
        REPOSITORY_PRIVATE: "false",
        AGENT_ALLOW_SELF_APPROVE: "true",
        AGENT_ALLOW_SELF_MERGE: "false",
    });
    node_assert_1.strict.equal(disabled.status, 0, disabled.stderr || disabled.stdout);
    node_assert_1.strict.equal(disabled.outputs.get("authorization_stop"), "false");
    const enabled = runPreflight({
        AUTHOR_ASSOCIATION: "CONTRIBUTOR",
        ACCESS_POLICY: accessPolicy,
        REPOSITORY_PRIVATE: "false",
        AGENT_ALLOW_SELF_APPROVE: "true",
        AGENT_ALLOW_SELF_MERGE: "true",
    });
    node_assert_1.strict.equal(enabled.status, 0, enabled.stderr || enabled.stdout);
    node_assert_1.strict.equal(enabled.outputs.get("authorization_stop"), "true");
    node_assert_1.strict.equal(enabled.outputs.get("authorization_stop_reason"), "orchestrate requests require agent-self-merge access; agent-self-merge currently requires MEMBER access.");
});
(0, node_test_1.test)("preflight keeps planner enabled for authorized PR orchestration", () => {
    const run = runPreflight({
        TARGET_KIND: "pull_request",
    });
    node_assert_1.strict.equal(run.status, 0, run.stderr || run.stdout);
    node_assert_1.strict.equal(run.outputs.get("planner_enabled"), "true");
    node_assert_1.strict.equal(run.outputs.get("authorization_stop"), "false");
});
//# sourceMappingURL=orchestrator-preflight-cli.test.js.map