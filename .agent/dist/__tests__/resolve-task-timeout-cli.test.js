"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const resolve_task_timeout_js_1 = require("../cli/resolve-task-timeout.js");
(0, node_test_1.test)("resolveTaskTimeoutMinutes uses route overrides", () => {
    node_assert_1.strict.equal((0, resolve_task_timeout_js_1.resolveTaskTimeoutMinutes)({
        AGENT_TASK_TIMEOUT_POLICY: '{"default_minutes": 30, "route_overrides": {"review": 45}}',
        ROUTE: "review",
    }), 45);
});
(0, node_test_1.test)("runResolveTaskTimeoutCli writes resolved minutes on success", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "resolve-task-timeout-"));
    const outputFile = (0, node_path_1.join)(tempDir, "github-output");
    const originalOutput = process.env.GITHUB_OUTPUT;
    const originalLog = console.log;
    const logs = [];
    process.env.GITHUB_OUTPUT = outputFile;
    console.log = (message) => {
        logs.push(String(message || ""));
    };
    try {
        const code = (0, resolve_task_timeout_js_1.runResolveTaskTimeoutCli)({
            AGENT_TASK_TIMEOUT_POLICY: '{"default_minutes": 30, "route_overrides": {"review": 45}}',
            ROUTE: "review",
        });
        node_assert_1.strict.equal(code, 0);
        node_assert_1.strict.match((0, node_fs_1.readFileSync)(outputFile, "utf8"), /minutes<<.*\n45\n/s);
        node_assert_1.strict.match(logs.join("\n"), /task timeout: 45 minutes/);
    }
    finally {
        console.log = originalLog;
        if (originalOutput === undefined) {
            delete process.env.GITHUB_OUTPUT;
        }
        else {
            process.env.GITHUB_OUTPUT = originalOutput;
        }
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("runResolveTaskTimeoutCli fails clearly on malformed policy", () => {
    const originalError = console.error;
    const errors = [];
    console.error = (message) => {
        errors.push(String(message || ""));
    };
    try {
        const code = (0, resolve_task_timeout_js_1.runResolveTaskTimeoutCli)({
            AGENT_TASK_TIMEOUT_POLICY: '{"default_minutes": "30"}',
            ROUTE: "answer",
        });
        node_assert_1.strict.equal(code, 2);
        node_assert_1.strict.match(errors.join("\n"), /Invalid AGENT_TASK_TIMEOUT_POLICY/);
        node_assert_1.strict.match(errors.join("\n"), /default_minutes must be a positive integer/);
    }
    finally {
        console.error = originalError;
    }
});
//# sourceMappingURL=resolve-task-timeout-cli.test.js.map