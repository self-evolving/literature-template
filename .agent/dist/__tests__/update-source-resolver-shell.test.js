"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_child_process_1 = require("node:child_process");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
function runUpdateSourceResolver(mode, extraEnv = {}) {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "update-source-resolver-"));
    const binDir = (0, node_path_1.join)(tempDir, "bin");
    const outputFile = (0, node_path_1.join)(tempDir, "outputs.txt");
    const callLog = (0, node_path_1.join)(tempDir, "gh-calls.txt");
    const ghPath = (0, node_path_1.join)(binDir, "gh");
    (0, node_fs_1.mkdirSync)(binDir);
    (0, node_fs_1.writeFileSync)(callLog, "");
    (0, node_fs_1.writeFileSync)(ghPath, [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        "printf '%s\\n' \"$*\" >> \"${GH_STUB_CALL_LOG}\"",
        "if [ \"${1:-}\" != \"api\" ]; then",
        "  echo \"unexpected gh invocation: $*\" >&2",
        "  exit 1",
        "fi",
        "case \"${GH_STUB_MODE}:${2:-}\" in",
        "  latest-release:repos/self-evolving/repo/releases?per_page=100)",
        "    printf '%s\\n' '[{\"tag_name\":\"v0.2.0\",\"html_url\":\"https://github.com/self-evolving/repo/releases/tag/v0.2.0\",\"draft\":false,\"prerelease\":false}]'",
        "    ;;",
        "  latest-release:repos/self-evolving/repo/commits/v0.2.0)",
        "    printf '%s\\n' '{\"sha\":\"abc123release\"}'",
        "    ;;",
        "  manual:repos/self-evolving/repo/commits/main)",
        "    printf '%s\\n' '{\"sha\":\"def456manual\"}'",
        "    ;;",
        "  no-release:repos/self-evolving/repo/releases?per_page=100)",
        "    printf '%s\\n' '[]'",
        "    ;;",
        "  no-release:repos/self-evolving/repo/commits/main)",
        "    printf '%s\\n' '{\"sha\":\"fed789fallback\"}'",
        "    ;;",
        "  release-error:repos/self-evolving/repo/releases?per_page=100)",
        "    echo \"server unavailable\" >&2",
        "    exit 1",
        "    ;;",
        "  *)",
        "    echo \"unexpected gh invocation for ${GH_STUB_MODE}: $*\" >&2",
        "    exit 1",
        "    ;;",
        "esac",
    ].join("\n") + "\n");
    (0, node_fs_1.chmodSync)(ghPath, 0o755);
    const result = (0, node_child_process_1.spawnSync)("bash", ["scripts/resolve-update-source.sh"], {
        cwd: process.cwd().endsWith(".agent") ? process.cwd() : (0, node_path_1.join)(process.cwd(), ".agent"),
        env: {
            ...process.env,
            DEFAULT_UPDATE_SOURCE_REF: "main",
            GH_STUB_CALL_LOG: callLog,
            GH_STUB_MODE: mode,
            GH_TOKEN: "test-token",
            GITHUB_OUTPUT: outputFile,
            PATH: `${binDir}:${process.env.PATH || ""}`,
            UPDATE_SOURCE_REPO: "self-evolving/repo",
            UPDATE_SOURCE_REF: "",
            ...extraEnv,
        },
        encoding: "utf8",
    });
    const outputText = result.status === 0 ? (0, node_fs_1.readFileSync)(outputFile, "utf8") : "";
    const calls = (0, node_fs_1.readFileSync)(callLog, "utf8");
    const payload = result.stdout.trim() ? JSON.parse(result.stdout) : null;
    return { calls, outputText, payload, result };
}
(0, node_test_1.test)("update source resolver defaults to the latest stable release tag", () => {
    const { calls, outputText, payload, result } = runUpdateSourceResolver("latest-release");
    node_assert_1.strict.equal(result.status, 0, result.stderr);
    node_assert_1.strict.equal(payload.sourceRef, "v0.2.0");
    node_assert_1.strict.equal(payload.sourceSha, "abc123release");
    node_assert_1.strict.equal(payload.sourceKind, "latest-release");
    node_assert_1.strict.equal(payload.fallback, false);
    node_assert_1.strict.match(calls, /repos\/self-evolving\/repo\/releases\?per_page=100/);
    node_assert_1.strict.match(calls, /repos\/self-evolving\/repo\/commits\/v0\.2\.0/);
    node_assert_1.strict.match(outputText, /source_ref<<[\s\S]*v0\.2\.0/);
    node_assert_1.strict.match(outputText, /source_sha<<[\s\S]*abc123release/);
});
(0, node_test_1.test)("update source resolver preserves manual source_ref overrides", () => {
    const { calls, payload, result } = runUpdateSourceResolver("manual", { UPDATE_SOURCE_REF: "main" });
    node_assert_1.strict.equal(result.status, 0, result.stderr);
    node_assert_1.strict.equal(payload.sourceRef, "main");
    node_assert_1.strict.equal(payload.sourceSha, "def456manual");
    node_assert_1.strict.equal(payload.sourceKind, "manual");
    node_assert_1.strict.equal(payload.fallback, false);
    node_assert_1.strict.doesNotMatch(calls, /releases/);
    node_assert_1.strict.match(calls, /repos\/self-evolving\/repo\/commits\/main/);
});
(0, node_test_1.test)("update source resolver falls back to main when no release exists", () => {
    const { outputText, payload, result } = runUpdateSourceResolver("no-release");
    node_assert_1.strict.equal(result.status, 0, result.stderr);
    node_assert_1.strict.equal(payload.sourceRef, "main");
    node_assert_1.strict.equal(payload.sourceSha, "fed789fallback");
    node_assert_1.strict.equal(payload.sourceKind, "fallback-main");
    node_assert_1.strict.equal(payload.fallback, true);
    node_assert_1.strict.match(payload.reason, /no stable Sepo release found; falling back to main/);
    node_assert_1.strict.match(outputText, /fallback<<[\s\S]*true/);
    node_assert_1.strict.match(outputText, /reason<<[\s\S]*no stable Sepo release found/);
});
(0, node_test_1.test)("update source resolver fails when release listing fails", () => {
    const { calls, payload, result } = runUpdateSourceResolver("release-error");
    node_assert_1.strict.notEqual(result.status, 0);
    node_assert_1.strict.equal(payload, null);
    node_assert_1.strict.match(result.stderr, /could not list stable releases for self-evolving\/repo/);
    node_assert_1.strict.match(calls, /repos\/self-evolving\/repo\/releases\?per_page=100/);
    node_assert_1.strict.doesNotMatch(calls, /repos\/self-evolving\/repo\/commits\/main/);
});
//# sourceMappingURL=update-source-resolver-shell.test.js.map