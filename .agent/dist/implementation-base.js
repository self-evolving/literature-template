"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBaseBranch = validateBaseBranch;
exports.resolveImplementationBase = resolveImplementationBase;
exports.exportImplementationBase = exportImplementationBase;
const node_fs_1 = require("node:fs");
const node_crypto_1 = require("node:crypto");
const github_js_1 = require("./github.js");
const output_js_1 = require("./output.js");
function normalizeInput(value) {
    return String(value || "").trim();
}
function validateBaseBranch(value) {
    const branch = normalizeInput(value);
    if (!branch) {
        throw new Error("base branch is required");
    }
    if (branch.startsWith("-")) {
        throw new Error("base branch must not start with '-'");
    }
    if (branch.startsWith("/") ||
        branch.endsWith("/") ||
        branch.includes("..") ||
        branch.includes("//") ||
        branch.endsWith(".") ||
        branch === "@" ||
        branch.includes("@{") ||
        /(^|\/)\./.test(branch) ||
        /(^|\/)[^/]+\.lock(\/|$)/.test(branch) ||
        /[\s~^:?*[\]\\\x00-\x1f\x7f]/.test(branch)) {
        throw new Error(`invalid base branch: ${branch}`);
    }
    return branch;
}
function parseBasePr(value) {
    if (!/^[1-9][0-9]*$/.test(value)) {
        throw new Error("base_pr must be a positive integer");
    }
    return Number.parseInt(value, 10);
}
function resolveImplementationBase(opts) {
    const explicitBranch = normalizeInput(opts.baseBranch);
    const explicitPr = normalizeInput(opts.basePr);
    const defaultBranch = validateBaseBranch(opts.defaultBranch);
    if (explicitBranch && explicitPr) {
        throw new Error("set only one of base_branch or base_pr");
    }
    if (explicitBranch) {
        return {
            baseBranch: validateBaseBranch(explicitBranch),
            source: "base_branch",
        };
    }
    if (explicitPr) {
        const basePr = parseBasePr(explicitPr);
        const meta = (0, github_js_1.fetchPrMeta)(basePr, opts.repo);
        if (meta.isCrossRepository) {
            throw new Error(`base_pr #${basePr} is from a fork; only same-repository PR heads are supported`);
        }
        if (meta.state.toUpperCase() !== "OPEN") {
            throw new Error(`base_pr #${basePr} must be open`);
        }
        return {
            baseBranch: validateBaseBranch(meta.headRef),
            source: "base_pr",
            basePr,
        };
    }
    return {
        baseBranch: defaultBranch,
        source: "default_branch",
    };
}
function appendGithubEnv(name, value) {
    const envFile = process.env.GITHUB_ENV;
    if (!envFile)
        return;
    const delim = `DELIM_${(0, node_crypto_1.randomBytes)(8).toString("hex")}`;
    (0, node_fs_1.appendFileSync)(envFile, `${name}<<${delim}\n${value}\n${delim}\n`);
}
function exportImplementationBase(result) {
    appendGithubEnv("BASE_BRANCH", result.baseBranch);
    (0, output_js_1.setOutput)("base_branch", result.baseBranch);
    (0, output_js_1.setOutput)("source", result.source);
    (0, output_js_1.setOutput)("base_pr", result.basePr ? String(result.basePr) : "");
}
//# sourceMappingURL=implementation-base.js.map