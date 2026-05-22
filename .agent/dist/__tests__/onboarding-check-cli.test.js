"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const repoRoot = (0, node_path_1.resolve)(__dirname, "../../..");
const expectedSetupIssueBody = `Use this issue to track Sepo setup for this repository.

The latest setup status is maintained in the comment below.
`;
function writeFakeGh(tempDir, body) {
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(tempDir, "gh"), body, { encoding: "utf8", mode: 0o755 });
}
function runOnboarding(tempDir, env) {
    return (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/onboarding-check.js"], {
        cwd: repoRoot,
        env: {
            ...process.env,
            PATH: `${tempDir}:${process.env.PATH || ""}`,
            RUNNER_TEMP: tempDir,
            ...env,
        },
        encoding: "utf8",
    });
}
function readOnboardingIssueBody(log, commandPattern) {
    const match = log.match(commandPattern);
    node_assert_1.strict.ok(match, "expected onboarding issue body file in gh log");
    const bodyFile = match[1];
    node_assert_1.strict.ok(bodyFile, "expected onboarding issue body file path in gh log");
    return (0, node_fs_1.readFileSync)(bodyFile, "utf8");
}
(0, node_test_1.test)("onboarding-check CLI creates labels, issue, and marker comment", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-onboarding-"));
    try {
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        writeFakeGh(tempDir, `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
if [ "$1" = "label" ] && [ "$2" = "list" ]; then
  exit 0
fi
if [ "$1" = "label" ] && [ "$2" = "create" ]; then
  exit 0
fi
if [ "$1" = "api" ] && [[ "$2" == repos/*/git/matching-refs/heads/agent/memory ]]; then
  printf 'refs/heads/agent/memory\\n'
  exit 0
fi
if [ "$1" = "api" ] && [[ "$2" == repos/*/git/matching-refs/heads/agent/rubrics ]]; then
  exit 0
fi
if [ "$1" = "issue" ] && [ "$2" = "list" ]; then
  printf '[]'
  exit 0
fi
if [ "$1" = "issue" ] && [ "$2" = "create" ]; then
  printf 'https://github.com/self-evolving/repo/issues/77\\n'
  exit 0
fi
if [ "$1" = "api" ] && [[ "$2" == repos/*/issues/77/comments ]]; then
  printf '[]'
  exit 0
fi
if [ "$1" = "issue" ] && [ "$2" = "comment" ]; then
  exit 0
fi
printf 'unexpected gh args: %s\\n' "$*" >&2
exit 1
`);
        const result = runOnboarding(tempDir, {
            AGENT_PROVIDER: "codex",
            AGENT_PROVIDER_REASON: "OPENAI_API_KEY is configured",
            AUTH_MODE: "oidc_broker",
            CLAUDE_CODE_OAUTH_TOKEN_CONFIGURED: "false",
            FAKE_GH_LOG: logPath,
            GITHUB_REPOSITORY: "self-evolving/repo",
            OPENAI_API_KEY_CONFIGURED: "true",
            RUN_URL: "https://github.com/self-evolving/repo/actions/runs/1",
        });
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.match(result.stdout, /Sepo onboarding issue is #77/);
        const log = (0, node_fs_1.readFileSync)(logPath, "utf8");
        node_assert_1.strict.match(log, /^label create agent\/answer --color 1f883d --description Ask Sepo to answer/m);
        node_assert_1.strict.match(log, /^label create agent\/orchestrate --color fb8c00 --description Ask Sepo to run/m);
        node_assert_1.strict.match(log, /^issue create --title Sepo setup check --body-file .+ --repo self-evolving\/repo$/m);
        node_assert_1.strict.match(log, /^issue comment 77 --body <!-- sepo-agent-onboarding-check -->/m);
        const issueBody = readOnboardingIssueBody(log, /^issue create --title Sepo setup check --body-file ([^ ]*sepo-onboarding-[a-f0-9]+\.md) --repo self-evolving\/repo$/m);
        node_assert_1.strict.equal(issueBody, expectedSetupIssueBody);
        node_assert_1.strict.doesNotMatch(issueBody, /@sepo-agent/);
        node_assert_1.strict.match(log, /## Sepo setup status/);
        node_assert_1.strict.match(log, /### Current status/);
        node_assert_1.strict.match(log, /GitHub App\/auth: resolved via `oidc_broker`/);
        node_assert_1.strict.match(log, /Model credentials: `OPENAI_API_KEY` configured/);
        node_assert_1.strict.match(log, /Agent provider: `codex` \(OPENAI_API_KEY is configured\)/);
        node_assert_1.strict.match(log, /Memory: initialized \(`agent\/memory`\)/);
        node_assert_1.strict.match(log, /Rubrics: not initialized/);
        node_assert_1.strict.match(log, /Optional: run \*\*Actions > Agent \/ Rubrics \/ Initialization\*\*\./);
        node_assert_1.strict.match(log, /### Remaining setup/);
        node_assert_1.strict.match(log, /Optional: initialize rubrics branch `agent\/rubrics`\./);
        node_assert_1.strict.match(log, /### Test Sepo/);
        node_assert_1.strict.match(log, /@sepo-agent \/answer Is Sepo configured correctly in this repository\?/);
        node_assert_1.strict.match(log, /@sepo-agent \/implement Create a small README update that verifies the agent can open a PR\./);
        node_assert_1.strict.match(log, /@sepo-agent \/review/);
        node_assert_1.strict.match(log, /Last checked: https:\/\/github.com\/self-evolving\/repo\/actions\/runs\/1/);
        node_assert_1.strict.doesNotMatch(log, /Built-in trigger labels:/);
        node_assert_1.strict.doesNotMatch(log, /`agent\/fix-pr` ->/);
        node_assert_1.strict.match(log, /agent\/fix-pr/);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("onboarding-check CLI updates an existing marker comment", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-onboarding-"));
    try {
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        writeFakeGh(tempDir, `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
if [ "$1" = "label" ] && [ "$2" = "list" ]; then
  printf '%s\\n' "$4"
  exit 0
fi
if [ "$1" = "api" ] && [[ "$2" == repos/*/git/matching-refs/heads/* ]]; then
  exit 0
fi
if [ "$1" = "issue" ] && [ "$2" = "list" ]; then
  printf '[{"number":5,"title":"Sepo setup check"}]'
  exit 0
fi
if [ "$1" = "api" ] && [[ "$2" == repos/*/issues/5/comments ]]; then
  printf '[{"id":123,"body":"<!-- sepo-agent-onboarding-check --> old"}]'
  exit 0
fi
if [ "$1" = "issue" ] && [ "$2" = "edit" ]; then
  exit 0
fi
if [ "$1" = "api" ] && [ "$2" = "-X" ] && [ "$3" = "PATCH" ]; then
  exit 0
fi
printf 'unexpected gh args: %s\\n' "$*" >&2
exit 1
`);
        const result = runOnboarding(tempDir, {
            AUTH_MODE: "",
            FAKE_GH_LOG: logPath,
            GITHUB_REPOSITORY: "self-evolving/repo",
        });
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        const log = (0, node_fs_1.readFileSync)(logPath, "utf8");
        node_assert_1.strict.doesNotMatch(log, /^issue create /m);
        node_assert_1.strict.doesNotMatch(log, /^label create /m);
        node_assert_1.strict.match(log, /^issue edit 5 --repo self-evolving\/repo --body-file .+$/m);
        const updatedIssueBody = readOnboardingIssueBody(log, /^issue edit 5 --repo self-evolving\/repo --body-file ([^ ]*sepo-onboarding-[a-f0-9]+\.md)$/m);
        node_assert_1.strict.equal(updatedIssueBody, expectedSetupIssueBody);
        node_assert_1.strict.doesNotMatch(updatedIssueBody, /@sepo-agent/);
        node_assert_1.strict.match(log, /^api -X PATCH repos\/self-evolving\/repo\/issues\/comments\/123 -f body=<!-- sepo-agent-onboarding-check -->/m);
        node_assert_1.strict.match(log, /GitHub App\/auth: not resolved/);
        node_assert_1.strict.match(log, /Model credentials: not configured/);
        node_assert_1.strict.match(log, /Add `OPENAI_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN` as a repository secret\./);
        node_assert_1.strict.match(log, /Memory: not initialized/);
        node_assert_1.strict.match(log, /Run \*\*Actions > Agent \/ Memory \/ Initialization\*\*\./);
        node_assert_1.strict.match(log, /Configure one model provider credential\./);
        node_assert_1.strict.doesNotMatch(log, /Built-in trigger labels:/);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
//# sourceMappingURL=onboarding-check-cli.test.js.map