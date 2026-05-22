"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const repoRoot = (0, node_path_1.resolve)(__dirname, "../../..");
function parseGithubOutput(raw) {
    const outputs = new Map();
    const blocks = raw.matchAll(/^([^<\n]+)<<([^\n]+)\n([\s\S]*?)\n\2$/gm);
    for (const [, name, , value] of blocks) {
        outputs.set(name, value);
    }
    return outputs;
}
function writeFakeGh(tempDir, headOid, opts = {}) {
    const prAuthorLogin = opts.prAuthorLogin || "lolipopshock";
    const viewerLogin = opts.viewerLogin || "sepo-agent-app";
    const synthesisAuthorLogin = opts.synthesisAuthorLogin || "sepo-agent-app";
    const logPath = (0, node_path_1.join)(tempDir, "gh.log");
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(tempDir, "gh"), `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
if [ "$1" = "pr" ] && [ "$2" = "view" ]; then
  if [ "${opts.failPrView ? "true" : "false"}" = "true" ]; then
    printf 'pr metadata unavailable\\n' >&2
    exit 1
  fi
  printf '{"author":{"login":"${prAuthorLogin}"},"headRefName":"agent/test","headRefOid":"${headOid}","isCrossRepository":false,"state":"OPEN"}\\n'
  exit 0
fi
if [ "$1" = "api" ] && [ "$2" = "--paginate" ] && [ "$3" = "--slurp" ]; then
  printf '[[{"id":123,"body":"## AI Review Synthesis <!-- sepo-agent-review-synthesis --> <!-- sepo-agent-review-synthesis-head: abc123 --> ## Final Verdict SHIP","created_at":"2026-05-07T10:00:00Z","user":{"login":"${synthesisAuthorLogin}"}}]]\\n'
  exit 0
fi
if [ "$1" = "api" ] && [ "$2" = "graphql" ]; then
  printf '{"data":{"viewer":{"login":"${viewerLogin}"}}}\\n'
  exit 0
fi
if [ "$1" = "api" ] && [ "$2" = "--method" ] && [ "$3" = "POST" ]; then
  if [ "${opts.failApprovalSubmission ? "true" : "false"}" = "true" ]; then
    printf 'review API unavailable\\n' >&2
    exit 1
  fi
  exit 0
fi
printf 'unexpected gh args: %s\\n' "$*" >&2
exit 1
`, { encoding: "utf8", mode: 0o755 });
    return logPath;
}
function runResolveSelfApprove(tempDir, responseBody) {
    const responseFile = (0, node_path_1.join)(tempDir, "response.md");
    const outputFile = (0, node_path_1.join)(tempDir, "github-output");
    (0, node_fs_1.writeFileSync)(responseFile, responseBody, "utf8");
    (0, node_fs_1.writeFileSync)(outputFile, "", "utf8");
    const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/resolve-self-approve.js"], {
        cwd: repoRoot,
        env: {
            ...process.env,
            PATH: `${tempDir}:${process.env.PATH || ""}`,
            AGENT_ALLOW_SELF_APPROVE: "true",
            EXPECTED_HEAD_SHA: "abc123",
            FAKE_GH_LOG: (0, node_path_1.join)(tempDir, "gh.log"),
            GITHUB_OUTPUT: outputFile,
            GITHUB_REPOSITORY: "self-evolving/repo",
            RESPONSE_FILE: responseFile,
            TARGET_KIND: "pull_request",
            TARGET_NUMBER: "42",
        },
        encoding: "utf8",
    });
    return {
        status: result.status,
        stdout: result.stdout,
        stderr: result.stderr,
        output: (0, node_fs_1.readFileSync)(outputFile, "utf8"),
        log: (0, node_fs_1.readFileSync)((0, node_path_1.join)(tempDir, "gh.log"), "utf8"),
    };
}
(0, node_test_1.test)("resolve-self-approve submits approval only for matching trusted head", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-self-approve-cli-"));
    try {
        (0, node_fs_1.mkdirSync)(tempDir, { recursive: true });
        writeFakeGh(tempDir, "abc123");
        const result = runResolveSelfApprove(tempDir, JSON.stringify({
            verdict: "APPROVE",
            reason: "Aligned.",
            inspected_head_sha: "abc123",
        }));
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.match(result.output, /approved<<[^\n]+\ntrue/);
        node_assert_1.strict.match(result.output, /conclusion<<[^\n]+\napproved/);
        node_assert_1.strict.match(result.log, /^api --method POST repos\/self-evolving\/repo\/pulls\/42\/reviews /m);
        node_assert_1.strict.match(result.log, /commit_id=abc123/);
        node_assert_1.strict.match(result.log, /event=APPROVE/);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("resolve-self-approve blocks approval by the pull request author", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-self-approve-cli-"));
    try {
        writeFakeGh(tempDir, "abc123", {
            prAuthorLogin: "app/sepo-agent-app",
            viewerLogin: "sepo-agent-app[bot]",
        });
        const result = runResolveSelfApprove(tempDir, JSON.stringify({
            verdict: "APPROVE",
            reason: "Aligned.",
            inspected_head_sha: "abc123",
        }));
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.match(result.output, /approved<<[^\n]+\nfalse/);
        node_assert_1.strict.match(result.output, /conclusion<<[^\n]+\nblocked/);
        node_assert_1.strict.match(result.output, /approval actor matches the pull request author/);
        node_assert_1.strict.doesNotMatch(result.log, /^api --method POST repos\/self-evolving\/repo\/pulls\/42\/reviews /m);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("resolve-self-approve does not submit approval after head changes", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-self-approve-cli-"));
    try {
        writeFakeGh(tempDir, "def456");
        const result = runResolveSelfApprove(tempDir, JSON.stringify({
            verdict: "APPROVE",
            reason: "Aligned.",
            inspected_head_sha: "abc123",
        }));
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        node_assert_1.strict.match(result.output, /approved<<[^\n]+\nfalse/);
        node_assert_1.strict.match(result.output, /conclusion<<[^\n]+\nblocked/);
        node_assert_1.strict.match(result.output, /pull request head changed/);
        node_assert_1.strict.doesNotMatch(result.log, /^api --method POST repos\/self-evolving\/repo\/pulls\/42\/reviews /m);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("resolve-self-approve writes failed status body when metadata cannot be read", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-self-approve-cli-"));
    try {
        writeFakeGh(tempDir, "abc123", { failPrView: true });
        const result = runResolveSelfApprove(tempDir, JSON.stringify({
            verdict: "APPROVE",
            reason: "Aligned.",
            inspected_head_sha: "abc123",
        }));
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        const outputs = parseGithubOutput(result.output);
        node_assert_1.strict.equal(outputs.get("approved"), "false");
        node_assert_1.strict.equal(outputs.get("conclusion"), "failed");
        node_assert_1.strict.match(outputs.get("reason") || "", /could not read pull request metadata/);
        const body = (0, node_fs_1.readFileSync)(outputs.get("body_file") || "", "utf8");
        node_assert_1.strict.match(body, /\| Failed \| `failed` \|/);
        node_assert_1.strict.match(body, /could not read pull request metadata/);
        node_assert_1.strict.match(body, /<!-- sepo-agent-self-approval -->/);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("resolve-self-approve writes failed status body for parser failures", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-self-approve-cli-"));
    try {
        writeFakeGh(tempDir, "abc123");
        const result = runResolveSelfApprove(tempDir, "The agent did not return JSON.");
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        const outputs = parseGithubOutput(result.output);
        node_assert_1.strict.equal(outputs.get("approved"), "false");
        node_assert_1.strict.equal(outputs.get("conclusion"), "failed");
        node_assert_1.strict.match(outputs.get("reason") || "", /missing a valid JSON decision/);
        const body = (0, node_fs_1.readFileSync)(outputs.get("body_file") || "", "utf8");
        node_assert_1.strict.match(body, /\| Failed \| `failed` \|/);
        node_assert_1.strict.match(body, /missing a valid JSON decision/);
        node_assert_1.strict.doesNotMatch(result.log, /^api --method POST repos\/self-evolving\/repo\/pulls\/42\/reviews /m);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("resolve-self-approve writes failed status body when approval API fails", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-self-approve-cli-"));
    try {
        writeFakeGh(tempDir, "abc123", { failApprovalSubmission: true });
        const result = runResolveSelfApprove(tempDir, JSON.stringify({
            verdict: "APPROVE",
            reason: "Aligned.",
            inspected_head_sha: "abc123",
        }));
        node_assert_1.strict.equal(result.status, 0, result.stderr);
        const outputs = parseGithubOutput(result.output);
        node_assert_1.strict.equal(outputs.get("approved"), "false");
        node_assert_1.strict.equal(outputs.get("conclusion"), "failed");
        node_assert_1.strict.match(outputs.get("reason") || "", /approval submission failed/);
        const body = (0, node_fs_1.readFileSync)(outputs.get("body_file") || "", "utf8");
        node_assert_1.strict.match(body, /\| Failed \| `failed` \|/);
        node_assert_1.strict.match(body, /approval submission failed/);
        node_assert_1.strict.match(result.log, /^api --method POST repos\/self-evolving\/repo\/pulls\/42\/reviews /m);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
//# sourceMappingURL=resolve-self-approve-cli.test.js.map