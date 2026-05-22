"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORCHESTRATE_DELEGATED_ROUTES = void 0;
exports.initialOrchestrateCapabilityStopReason = initialOrchestrateCapabilityStopReason;
const access_policy_js_1 = require("./access-policy.js");
/**
 * Concrete routes that an initial `/orchestrate` request may launch directly or
 * through issue-level delegation.
 */
exports.ORCHESTRATE_DELEGATED_ROUTES = ["implement", "review", "fix-pr"];
function normalizeToken(value) {
    return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}
/**
 * Returns a user-visible stop reason when an initial `/orchestrate` request
 * lacks delegated route capability. Returns an empty string when the check does
 * not apply or the requester is authorized.
 */
function initialOrchestrateCapabilityStopReason(input) {
    if (normalizeToken(input.sourceAction) !== "orchestrate" ||
        normalizeToken(input.sourceConclusion) !== "requested" ||
        input.currentRound !== 1) {
        return "";
    }
    let policy;
    try {
        policy = (0, access_policy_js_1.parseAccessPolicy)(input.accessPolicy);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return `invalid AGENT_ACCESS_POLICY: ${msg}`;
    }
    const association = (0, access_policy_js_1.isKnownAuthorAssociation)(input.authorAssociation) ? input.authorAssociation : "NONE";
    const delegatedRoutes = input.allowSelfApprove
        ? [...exports.ORCHESTRATE_DELEGATED_ROUTES, "agent-self-approve"]
        : [...exports.ORCHESTRATE_DELEGATED_ROUTES];
    if (input.allowSelfApprove && input.allowSelfMerge) {
        delegatedRoutes.push("agent-self-merge");
    }
    for (const route of delegatedRoutes) {
        if ((0, access_policy_js_1.isAssociationAllowedForRoute)(policy, route, association, input.isPublicRepo)) {
            continue;
        }
        const allowed = (0, access_policy_js_1.getAllowedAssociationsForRoute)(policy, route, input.isPublicRepo);
        return `orchestrate requests require ${route} access; ${route} currently requires ${allowed.join(", ")} access.`;
    }
    return "";
}
//# sourceMappingURL=orchestrator-capabilities.js.map