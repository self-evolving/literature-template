"use strict";
// Memory branch layout helpers.
//
// The agent writes prose into PROJECT.md / MEMORY.md / daily/ through the
// memory-update CLI. The deterministic sync mirror under github/<owner>/<repo>/
// is dumped as raw `gh --json` output — one JSON file per item, type encoded
// in the filename. No custom markdown rendering.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEMORY_README = exports.DAILY_DIR = exports.GITHUB_DIR = void 0;
exports.ensureMemoryStructure = ensureMemoryStructure;
exports.githubArtifactDir = githubArtifactDir;
exports.issueArtifactPath = issueArtifactPath;
exports.pullRequestArtifactPath = pullRequestArtifactPath;
exports.discussionArtifactPath = discussionArtifactPath;
exports.writeFileIfChanged = writeFileIfChanged;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
exports.GITHUB_DIR = "github";
exports.DAILY_DIR = "daily";
exports.MEMORY_README = [
    "# Agent memory",
    "",
    "This branch stores durable context for Sepo agents. It is separate from `main` so memory updates do not mix with product code.",
    "",
    "## Layout",
    "",
    "- `PROJECT.md` holds slow-changing project context: goals, constraints, and open questions.",
    "- `MEMORY.md` holds durable conventions and lessons the agent should carry forward.",
    "- `daily/YYYY-MM-DD.md` holds append-only daily activity bullets.",
    "- `github/<owner>/<repo>/*.json` mirrors repository issues, pull requests, and discussions for lookup.",
    "- Mirrored artifacts can be cited in notes as backlink-style paths, for example `[[github/<owner>/<repo>/issue-1.json]]`.",
    "",
    "These files are the starting structure. Agents may add other notes when that keeps durable context easier to use.",
    "",
    "## Tools",
    "",
    "Memory-related CLI tools live on the `main` branch under `.agent/dist/cli/memory/` after the agent package is built. Useful tools include:",
    "",
    "- `search.js` for searching markdown and JSON memory files.",
    "- `update.js` for adding, replacing, removing, or appending standard memory bullets.",
    "",
].join("\n");
function ensureDirectory(path) {
    (0, node_fs_1.mkdirSync)(path, { recursive: true });
}
function ensureFile(path, content, createdFiles) {
    if ((0, node_fs_1.existsSync)(path))
        return;
    ensureDirectory((0, node_path_1.dirname)(path));
    (0, node_fs_1.writeFileSync)(path, content, "utf8");
    createdFiles.push(path);
}
function splitRepoSlug(repoSlug) {
    const parts = repoSlug.split("/");
    if (parts.length !== 2
        || !parts[0]
        || !parts[1]
        || parts.some((part) => part === "." || part === ".." || part.includes("\\"))) {
        throw new Error(`Invalid repository slug: ${repoSlug || "empty"}`);
    }
    return [parts[0], parts[1]];
}
/**
 * Creates the memory branch layout and seeds README.md, PROJECT.md, and
 * MEMORY.md if missing. Idempotent.
 */
function ensureMemoryStructure(rootDir, repoSlug) {
    const createdFiles = [];
    splitRepoSlug(repoSlug);
    ensureDirectory((0, node_path_1.join)(rootDir, exports.DAILY_DIR));
    ensureDirectory((0, node_path_1.join)(rootDir, exports.GITHUB_DIR));
    ensureDirectory(githubArtifactDir(rootDir, repoSlug));
    ensureFile((0, node_path_1.join)(rootDir, exports.DAILY_DIR, ".gitkeep"), "", createdFiles);
    ensureFile((0, node_path_1.join)(rootDir, exports.GITHUB_DIR, ".gitkeep"), "", createdFiles);
    ensureFile((0, node_path_1.join)(githubArtifactDir(rootDir, repoSlug), ".gitkeep"), "", createdFiles);
    ensureFile((0, node_path_1.join)(rootDir, "PROJECT.md"), "", createdFiles);
    ensureFile((0, node_path_1.join)(rootDir, "MEMORY.md"), "", createdFiles);
    ensureFile((0, node_path_1.join)(rootDir, "README.md"), exports.MEMORY_README, createdFiles);
    return { createdFiles };
}
// Repo-aware layout: each repository gets its own namespace under github/.
// Type is encoded in the filename, so issue #209, PR #209, and discussion #209
// never collide inside the same repo namespace.
function githubArtifactDir(rootDir, repoSlug) {
    const [owner, repo] = splitRepoSlug(repoSlug);
    return (0, node_path_1.join)(rootDir, exports.GITHUB_DIR, owner, repo);
}
function issueArtifactPath(rootDir, repoSlug, number) {
    return (0, node_path_1.join)(githubArtifactDir(rootDir, repoSlug), `issue-${number}.json`);
}
function pullRequestArtifactPath(rootDir, repoSlug, number) {
    return (0, node_path_1.join)(githubArtifactDir(rootDir, repoSlug), `pull-${number}.json`);
}
function discussionArtifactPath(rootDir, repoSlug, number) {
    return (0, node_path_1.join)(githubArtifactDir(rootDir, repoSlug), `discussion-${number}.json`);
}
/**
 * Writes `content` to `path` iff it would change the file. Returns whether
 * an on-disk write happened.
 */
function writeFileIfChanged(path, content) {
    ensureDirectory((0, node_path_1.dirname)(path));
    if ((0, node_fs_1.existsSync)(path) && (0, node_fs_1.readFileSync)(path, "utf8") === content)
        return false;
    (0, node_fs_1.writeFileSync)(path, content, "utf8");
    return true;
}
//# sourceMappingURL=memory-artifacts.js.map