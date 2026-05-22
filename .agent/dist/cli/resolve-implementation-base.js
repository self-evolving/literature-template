"use strict";
// CLI: resolve the base branch for agent-implement.yml.
// Env: BASE_BRANCH, BASE_PR, DEFAULT_BRANCH, GITHUB_REPOSITORY
// Outputs/env: base_branch/BASE_BRANCH
Object.defineProperty(exports, "__esModule", { value: true });
const implementation_base_js_1 = require("../implementation-base.js");
try {
    const result = (0, implementation_base_js_1.resolveImplementationBase)({
        baseBranch: process.env.BASE_BRANCH,
        basePr: process.env.BASE_PR,
        defaultBranch: process.env.DEFAULT_BRANCH || "",
        repo: process.env.GITHUB_REPOSITORY || "",
    });
    (0, implementation_base_js_1.exportImplementationBase)(result);
    console.log(`Resolved implementation base branch ${result.baseBranch} from ${result.source}`);
}
catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 2;
}
//# sourceMappingURL=resolve-implementation-base.js.map