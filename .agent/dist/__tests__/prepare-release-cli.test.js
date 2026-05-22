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
(0, node_test_1.test)("prepare-release reuses an open release issue for the same version", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-prepare-release-"));
    try {
        const outputPath = (0, node_path_1.join)(tempDir, "github-output.txt");
        const callsPath = (0, node_path_1.join)(tempDir, "gh-calls.txt");
        (0, node_fs_1.writeFileSync)(outputPath, "", "utf8");
        (0, node_fs_1.writeFileSync)(callsPath, "", "utf8");
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(tempDir, "gh"), `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$GH_CALLS"
if [ "$1" = "issue" ] && [ "$2" = "list" ]; then
  printf '[{"number":42,"title":"Prepare Sepo release 0.2.0","url":"https://github.com/self-evolving/repo/issues/42"}]\\n'
  exit 0
fi
if [ "$1" = "issue" ] && [ "$2" = "create" ]; then
  echo "unexpected create" >&2
  exit 1
fi
exit 1
`, { encoding: "utf8", mode: 0o755 });
        (0, node_child_process_1.execFileSync)("node", [".agent/dist/cli/prepare-release.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                GH_CALLS: callsPath,
                GITHUB_OUTPUT: outputPath,
                GITHUB_REPOSITORY: "self-evolving/repo",
                RUNNER_TEMP: tempDir,
                VERSION: "0.2.0",
            },
        });
        const outputs = parseGithubOutput(outputPath);
        node_assert_1.strict.equal(outputs.get("issue_number"), "42");
        node_assert_1.strict.equal(outputs.get("issue_action"), "reused");
        node_assert_1.strict.equal(outputs.get("version"), "0.2.0");
        node_assert_1.strict.match(outputs.get("request_text") || "", /0\.2\.0/);
        const calls = (0, node_fs_1.readFileSync)(callsPath, "utf8");
        node_assert_1.strict.match(calls, /issue list/);
        node_assert_1.strict.doesNotMatch(calls, /issue create/);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("prepare-release emits created issue outputs from a valid create URL", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-prepare-release-"));
    try {
        const outputPath = (0, node_path_1.join)(tempDir, "github-output.txt");
        const callsPath = (0, node_path_1.join)(tempDir, "gh-calls.txt");
        (0, node_fs_1.writeFileSync)(outputPath, "", "utf8");
        (0, node_fs_1.writeFileSync)(callsPath, "", "utf8");
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(tempDir, "gh"), `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$GH_CALLS"
if [ "$1" = "issue" ] && [ "$2" = "list" ]; then
  printf '[]\\n'
  exit 0
fi
if [ "$1" = "issue" ] && [ "$2" = "create" ]; then
  printf 'https://github.com/self-evolving/repo/issues/77\\n'
  exit 0
fi
exit 1
`, { encoding: "utf8", mode: 0o755 });
        (0, node_child_process_1.execFileSync)("node", [".agent/dist/cli/prepare-release.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                GH_CALLS: callsPath,
                GITHUB_OUTPUT: outputPath,
                GITHUB_REPOSITORY: "self-evolving/repo",
                RUNNER_TEMP: tempDir,
                VERSION: "0.2.0",
            },
        });
        const outputs = parseGithubOutput(outputPath);
        node_assert_1.strict.equal(outputs.get("issue_number"), "77");
        node_assert_1.strict.equal(outputs.get("issue_action"), "created");
        node_assert_1.strict.equal(outputs.get("issue_url"), "https://github.com/self-evolving/repo/issues/77");
        const bodyFile = (0, node_fs_1.readdirSync)(tempDir).find((name) => /^release-prepare-[a-f0-9]+\.md$/.test(name));
        node_assert_1.strict.ok(bodyFile);
        const issueBody = (0, node_fs_1.readFileSync)((0, node_path_1.join)(tempDir, bodyFile), "utf8");
        node_assert_1.strict.match(issueBody, /`\.agent\/CHANGELOG\.md`/);
        const calls = (0, node_fs_1.readFileSync)(callsPath, "utf8");
        node_assert_1.strict.match(calls, /issue create/);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("prepare-release fails clearly when a created issue URL has no issue number", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-prepare-release-"));
    try {
        const outputPath = (0, node_path_1.join)(tempDir, "github-output.txt");
        const callsPath = (0, node_path_1.join)(tempDir, "gh-calls.txt");
        (0, node_fs_1.writeFileSync)(outputPath, "", "utf8");
        (0, node_fs_1.writeFileSync)(callsPath, "", "utf8");
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(tempDir, "gh"), `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$GH_CALLS"
if [ "$1" = "issue" ] && [ "$2" = "list" ]; then
  printf '[]\\n'
  exit 0
fi
if [ "$1" = "issue" ] && [ "$2" = "create" ]; then
  printf 'https://github.com/self-evolving/repo/issues/not-a-number\\n'
  exit 0
fi
exit 1
`, { encoding: "utf8", mode: 0o755 });
        const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/prepare-release.js"], {
            cwd: repoRoot,
            encoding: "utf8",
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                GH_CALLS: callsPath,
                GITHUB_OUTPUT: outputPath,
                GITHUB_REPOSITORY: "self-evolving/repo",
                RUNNER_TEMP: tempDir,
                VERSION: "0.2.0",
            },
        });
        node_assert_1.strict.equal(result.status, 1);
        node_assert_1.strict.match(result.stderr, /Could not parse created release prepare issue number/);
        node_assert_1.strict.equal((0, node_fs_1.readFileSync)(outputPath, "utf8"), "");
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
//# sourceMappingURL=prepare-release-cli.test.js.map