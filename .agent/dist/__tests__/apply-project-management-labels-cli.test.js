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
function writePlan(tempDir) {
    const bodyFile = (0, node_path_1.join)(tempDir, "summary.md");
    (0, node_fs_1.writeFileSync)(bodyFile, `## Project Management Summary

\`\`\`json
{
  "label_changes": [
    {
      "kind": "issue",
      "number": 34,
      "add": ["priority/p1", "effort/high", "bug"],
      "remove": ["priority/p3", "effort/low", "external"]
    },
    {
      "kind": "pull_request",
      "number": 39,
      "add": ["priority/p3", "effort/low"],
      "remove": ["priority/p2", "effort/high"]
    },
    {
      "kind": "discussion",
      "number": 7,
      "add": ["priority/p0"],
      "remove": []
    }
  ]
}
\`\`\`
`);
    return bodyFile;
}
function runCli(tempDir, env) {
    return (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/apply-project-management-labels.js"], {
        cwd: repoRoot,
        env: {
            ...process.env,
            PATH: `${tempDir}:${process.env.PATH || ""}`,
            ...env,
        },
        encoding: "utf8",
    });
}
(0, node_test_1.test)("apply project management labels skips gh calls in dry-run mode", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "apply-project-labels-"));
    try {
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        const outputPath = (0, node_path_1.join)(tempDir, "outputs.txt");
        writePlan(tempDir);
        writeFakeGh(tempDir, `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
exit 1
`);
        const result = runCli(tempDir, {
            AGENT_PROJECT_MANAGEMENT_DRY_RUN: "true",
            AGENT_PROJECT_MANAGEMENT_APPLY_LABELS: "true",
            BODY_FILE: (0, node_path_1.join)(tempDir, "summary.md"),
            FAKE_GH_LOG: logPath,
            GITHUB_OUTPUT: outputPath,
            GITHUB_REPOSITORY: "self-evolving/repo",
        });
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.match(result.stdout, /Dry run is enabled/);
        node_assert_1.strict.equal((0, node_fs_1.readFileSync)(outputPath, "utf8").includes("labels_applied"), true);
        node_assert_1.strict.throws(() => (0, node_fs_1.readFileSync)(logPath, "utf8"));
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("apply project management labels fails dry-run without a valid plan", () => {
    const cases = [
        ["missing fenced json", "## Project Management Summary\n\nNo structured plan.\n"],
        ["malformed fenced json", "## Project Management Summary\n\n```json\nnot-json\n```\n"],
    ];
    for (const [name, body] of cases) {
        const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "apply-project-labels-"));
        try {
            const bodyFile = (0, node_path_1.join)(tempDir, "summary.md");
            const logPath = (0, node_path_1.join)(tempDir, "gh.log");
            const outputPath = (0, node_path_1.join)(tempDir, "outputs.txt");
            (0, node_fs_1.writeFileSync)(bodyFile, body);
            writeFakeGh(tempDir, `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
exit 1
`);
            const result = runCli(tempDir, {
                AGENT_PROJECT_MANAGEMENT_DRY_RUN: "true",
                AGENT_PROJECT_MANAGEMENT_APPLY_LABELS: "true",
                BODY_FILE: bodyFile,
                FAKE_GH_LOG: logPath,
                GITHUB_OUTPUT: outputPath,
                GITHUB_REPOSITORY: "self-evolving/repo",
            });
            node_assert_1.strict.equal(result.status, 1, name);
            node_assert_1.strict.match(result.stderr, /valid fenced JSON label_changes plan/);
            node_assert_1.strict.throws(() => (0, node_fs_1.readFileSync)(logPath, "utf8"));
        }
        finally {
            (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
        }
    }
});
(0, node_test_1.test)("apply project management labels defaults to applying managed changes", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "apply-project-labels-"));
    try {
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        const outputPath = (0, node_path_1.join)(tempDir, "outputs.txt");
        writePlan(tempDir);
        writeFakeGh(tempDir, `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
if [ "$1" = "label" ] && [ "$2" = "list" ]; then
  exit 0
fi
if [ "$1" = "label" ] && [ "$2" = "create" ]; then
  exit 0
fi
if [ "$1" = "issue" ] && [ "$2" = "edit" ]; then
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "edit" ]; then
  exit 0
fi
printf 'unexpected gh args: %s\\n' "$*" >&2
exit 1
`);
        const result = runCli(tempDir, {
            AGENT_PROJECT_MANAGEMENT_DRY_RUN: "false",
            BODY_FILE: (0, node_path_1.join)(tempDir, "summary.md"),
            FAKE_GH_LOG: logPath,
            GITHUB_OUTPUT: outputPath,
            GITHUB_REPOSITORY: "self-evolving/repo",
        });
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.match(result.stdout, /Applied 8 managed priority\/effort label operation/);
        const log = (0, node_fs_1.readFileSync)(logPath, "utf8");
        for (const label of [
            "priority/p0",
            "priority/p1",
            "priority/p2",
            "priority/p3",
            "effort/low",
            "effort/medium",
            "effort/high",
        ]) {
            node_assert_1.strict.match(log, new RegExp(`^label create ${label} `, "m"));
        }
        node_assert_1.strict.match(log, /^issue edit 34 --remove-label priority\/p3 --repo self-evolving\/repo$/m);
        node_assert_1.strict.match(log, /^issue edit 34 --remove-label effort\/low --repo self-evolving\/repo$/m);
        node_assert_1.strict.match(log, /^issue edit 34 --add-label priority\/p1 --repo self-evolving\/repo$/m);
        node_assert_1.strict.match(log, /^issue edit 34 --add-label effort\/high --repo self-evolving\/repo$/m);
        node_assert_1.strict.match(log, /^pr edit 39 --remove-label priority\/p2 --repo self-evolving\/repo$/m);
        node_assert_1.strict.match(log, /^pr edit 39 --remove-label effort\/high --repo self-evolving\/repo$/m);
        node_assert_1.strict.match(log, /^pr edit 39 --add-label priority\/p3 --repo self-evolving\/repo$/m);
        node_assert_1.strict.match(log, /^pr edit 39 --add-label effort\/low --repo self-evolving\/repo$/m);
        node_assert_1.strict.doesNotMatch(log, / bug| external|discussion/);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("apply project management labels fails real label application without a valid plan", () => {
    const cases = [
        ["missing fenced json", "## Project Management Summary\n\nNo structured plan.\n"],
        ["malformed fenced json", "## Project Management Summary\n\n```json\nnot-json\n```\n"],
    ];
    for (const [name, body] of cases) {
        const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "apply-project-labels-"));
        try {
            const bodyFile = (0, node_path_1.join)(tempDir, "summary.md");
            const logPath = (0, node_path_1.join)(tempDir, "gh.log");
            const outputPath = (0, node_path_1.join)(tempDir, "outputs.txt");
            (0, node_fs_1.writeFileSync)(bodyFile, body);
            writeFakeGh(tempDir, `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
exit 1
`);
            const result = runCli(tempDir, {
                AGENT_PROJECT_MANAGEMENT_DRY_RUN: "false",
                AGENT_PROJECT_MANAGEMENT_APPLY_LABELS: "true",
                BODY_FILE: bodyFile,
                FAKE_GH_LOG: logPath,
                GITHUB_OUTPUT: outputPath,
                GITHUB_REPOSITORY: "self-evolving/repo",
            });
            node_assert_1.strict.equal(result.status, 1, name);
            node_assert_1.strict.match(result.stderr, /valid fenced JSON label_changes plan/);
            node_assert_1.strict.throws(() => (0, node_fs_1.readFileSync)(logPath, "utf8"));
        }
        finally {
            (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
        }
    }
});
(0, node_test_1.test)("apply project management labels allows an explicit empty plan", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "apply-project-labels-"));
    try {
        const bodyFile = (0, node_path_1.join)(tempDir, "summary.md");
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        const outputPath = (0, node_path_1.join)(tempDir, "outputs.txt");
        (0, node_fs_1.writeFileSync)(bodyFile, "## Project Management Summary\n\n```json\n{\"label_changes\":[]}\n```\n");
        writeFakeGh(tempDir, "#!/usr/bin/env bash\nprintf '%s\\n' \"$*\" >> \"$FAKE_GH_LOG\"\nexit 1\n");
        const result = runCli(tempDir, {
            AGENT_PROJECT_MANAGEMENT_DRY_RUN: "false",
            AGENT_PROJECT_MANAGEMENT_APPLY_LABELS: "true",
            BODY_FILE: bodyFile,
            FAKE_GH_LOG: logPath,
            GITHUB_OUTPUT: outputPath,
            GITHUB_REPOSITORY: "self-evolving/repo",
        });
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.match(result.stdout, /Applied 0 managed priority\/effort label operation/);
        node_assert_1.strict.throws(() => (0, node_fs_1.readFileSync)(logPath, "utf8"));
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
//# sourceMappingURL=apply-project-management-labels-cli.test.js.map