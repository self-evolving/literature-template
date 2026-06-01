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
(0, node_test_1.test)("resolve-dispatch reports invalid AGENT_ACCESS_POLICY cleanly", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-resolve-dispatch-"));
    try {
        const outputPath = (0, node_path_1.join)(tempDir, "github-output.txt");
        (0, node_fs_1.writeFileSync)(outputPath, "", "utf8");
        const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/resolve-dispatch.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                GITHUB_OUTPUT: outputPath,
                REQUESTED_ROUTE: "answer",
                REQUEST_TEXT: "@sepo-agent /answer please check this",
                TARGET_KIND: "issue",
                AUTHOR_ASSOCIATION: "MEMBER",
                ACCESS_POLICY: "{",
                REPOSITORY_PRIVATE: "true",
            },
            encoding: "utf8",
        });
        node_assert_1.strict.equal(result.status, 2);
        node_assert_1.strict.match(result.stderr, /Invalid AGENT_ACCESS_POLICY:/);
        node_assert_1.strict.doesNotMatch(result.stderr, /at parseAccessPolicy/);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("resolve-dispatch uses generated metadata for explicit implement tracking issues", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-resolve-dispatch-"));
    try {
        const outputPath = (0, node_path_1.join)(tempDir, "github-output.txt");
        const metadataPath = (0, node_path_1.join)(tempDir, "metadata.json");
        (0, node_fs_1.writeFileSync)(outputPath, "", "utf8");
        (0, node_fs_1.writeFileSync)(metadataPath, JSON.stringify({
            issue_title: "Fix explicit implement issue titles",
            issue_body: "## Goal\nGenerate titles from PR context.\n\n## Acceptance criteria\n- Ignore earlier prose command mentions.",
            base_pr: "268",
        }), "utf8");
        const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/resolve-dispatch.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                GITHUB_OUTPUT: outputPath,
                RESPONSE_FILE: metadataPath,
                REQUESTED_ROUTE: "implement",
                REQUEST_TEXT: "Earlier prose mentions /implement with stale wording.\n\n@sepo-agent /implement",
                TARGET_KIND: "pull_request",
                AUTHOR_ASSOCIATION: "MEMBER",
                ACCESS_POLICY: "",
                REPOSITORY_PRIVATE: "true",
            },
            encoding: "utf8",
        });
        node_assert_1.strict.equal(result.status, 0);
        const outputs = parseGithubOutput(outputPath);
        node_assert_1.strict.equal(outputs.get("route"), "implement");
        node_assert_1.strict.equal(outputs.get("needs_approval"), "false");
        node_assert_1.strict.equal(outputs.get("issue_title"), "Fix explicit implement issue titles");
        node_assert_1.strict.doesNotMatch(outputs.get("issue_title") || "", /stale wording/);
        node_assert_1.strict.match(outputs.get("issue_body") || "", /Generate titles from PR context/);
        node_assert_1.strict.equal(outputs.get("base_pr"), "268");
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("resolve-dispatch falls back when generated implement metadata is invalid", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-resolve-dispatch-"));
    try {
        const outputPath = (0, node_path_1.join)(tempDir, "github-output.txt");
        const metadataPath = (0, node_path_1.join)(tempDir, "metadata.json");
        (0, node_fs_1.writeFileSync)(outputPath, "", "utf8");
        (0, node_fs_1.writeFileSync)(metadataPath, '{"issue_title":"Missing body"}', "utf8");
        const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/resolve-dispatch.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                GITHUB_OUTPUT: outputPath,
                RESPONSE_FILE: metadataPath,
                REQUESTED_ROUTE: "implement",
                REQUEST_TEXT: "@sepo-agent /implement",
                TARGET_KIND: "pull_request",
                AUTHOR_ASSOCIATION: "MEMBER",
                ACCESS_POLICY: "",
                REPOSITORY_PRIVATE: "true",
            },
            encoding: "utf8",
        });
        node_assert_1.strict.equal(result.status, 0);
        node_assert_1.strict.match(result.stderr, /using fallback metadata/);
        const outputs = parseGithubOutput(outputPath);
        node_assert_1.strict.equal(outputs.get("issue_title"), "Implement requested change");
        node_assert_1.strict.match(outputs.get("issue_body") || "", /Original request/);
        node_assert_1.strict.equal(outputs.get("base_pr"), "");
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("resolve-dispatch rejects invalid implement base PR metadata", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-resolve-dispatch-"));
    try {
        const outputPath = (0, node_path_1.join)(tempDir, "github-output.txt");
        const metadataPath = (0, node_path_1.join)(tempDir, "metadata.json");
        (0, node_fs_1.writeFileSync)(outputPath, "", "utf8");
        (0, node_fs_1.writeFileSync)(metadataPath, JSON.stringify({
            issue_title: "Stack follow-up work",
            issue_body: "## Goal\nCreate a stacked follow-up PR.",
            base_pr: "#268",
        }), "utf8");
        const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/resolve-dispatch.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                GITHUB_OUTPUT: outputPath,
                RESPONSE_FILE: metadataPath,
                REQUESTED_ROUTE: "implement",
                REQUEST_TEXT: "@sepo-agent /implement work on this as a stacked PR?",
                TARGET_KIND: "pull_request",
                AUTHOR_ASSOCIATION: "MEMBER",
                ACCESS_POLICY: "",
                REPOSITORY_PRIVATE: "true",
            },
            encoding: "utf8",
        });
        node_assert_1.strict.equal(result.status, 0);
        node_assert_1.strict.match(result.stderr, /base_pr must be a positive integer/);
        const outputs = parseGithubOutput(outputPath);
        node_assert_1.strict.equal(outputs.get("base_pr"), "");
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
//# sourceMappingURL=resolve-dispatch-cli.test.js.map