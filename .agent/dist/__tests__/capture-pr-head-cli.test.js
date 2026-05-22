"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const repoRoot = (0, node_path_1.resolve)(__dirname, "../../..");
function writeFakeGh(tempDir, body) {
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(tempDir, "gh"), body, { encoding: "utf8", mode: 0o755 });
}
(0, node_test_1.test)("capture-pr-head CLI writes empty output when PR metadata lookup fails", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-capture-pr-head-"));
    try {
        const outputPath = (0, node_path_1.join)(tempDir, "github-output.txt");
        (0, node_fs_1.writeFileSync)(outputPath, "", "utf8");
        writeFakeGh(tempDir, `#!/usr/bin/env bash
printf 'metadata unavailable\\n' >&2
exit 1
`);
        const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/capture-pr-head.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                GITHUB_OUTPUT: outputPath,
                GITHUB_REPOSITORY: "self-evolving/repo",
                TARGET_NUMBER: "172",
            },
            encoding: "utf8",
        });
        node_assert_1.strict.equal(result.status, 0);
        node_assert_1.strict.match(result.stderr, /Reviewed head capture skipped:/);
        node_assert_1.strict.match((0, node_fs_1.readFileSync)(outputPath, "utf8"), /^head_sha<<DELIM_[0-9a-f]+\n\nDELIM_[0-9a-f]+$/m);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
//# sourceMappingURL=capture-pr-head-cli.test.js.map