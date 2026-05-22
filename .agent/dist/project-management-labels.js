"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseManagedLabelPlan = parseManagedLabelPlan;
exports.ensureManagedLabels = ensureManagedLabels;
exports.applyManagedLabelChange = applyManagedLabelChange;
exports.countManagedLabelOperations = countManagedLabelOperations;
const github_js_1 = require("./github.js");
const LABEL_DEFINITIONS = [
    { name: "priority/p0", color: "b60205", description: "Project management: highest priority" },
    { name: "priority/p1", color: "d93f0b", description: "Project management: high priority" },
    { name: "priority/p2", color: "fbca04", description: "Project management: medium priority" },
    { name: "priority/p3", color: "c2e0c6", description: "Project management: low priority" },
    { name: "effort/low", color: "c2e0c6", description: "Project management: low effort" },
    { name: "effort/medium", color: "fbca04", description: "Project management: medium effort" },
    { name: "effort/high", color: "d73a4a", description: "Project management: high effort" },
];
const MANAGED_LABELS = new Set(LABEL_DEFINITIONS.map((label) => label.name));
function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function stringArray(value) {
    if (!Array.isArray(value))
        return [];
    return value.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}
function normalizeKind(value) {
    if (value === "issue" || value === "pull_request")
        return value;
    return null;
}
function uniqueManagedLabels(labels) {
    return [...new Set(labels)].filter((label) => MANAGED_LABELS.has(label));
}
function parseManagedLabelPlan(markdown) {
    const fence = markdown.match(/```json\s*([\s\S]*?)```/i);
    if (!fence)
        return { label_changes: [], valid: false };
    let parsed;
    try {
        parsed = JSON.parse(fence[1]);
    }
    catch {
        return { label_changes: [], valid: false };
    }
    const root = asRecord(parsed);
    if (!root || !Array.isArray(root.label_changes)) {
        return { label_changes: [], valid: false };
    }
    const label_changes = [];
    for (const rawChange of root.label_changes) {
        const change = asRecord(rawChange);
        if (!change)
            continue;
        const kind = normalizeKind(change.kind);
        const number = typeof change.number === "number" && Number.isInteger(change.number) && change.number > 0
            ? change.number
            : null;
        if (!kind || !number)
            continue;
        label_changes.push({
            kind,
            number,
            add: uniqueManagedLabels(stringArray(change.add)),
            remove: uniqueManagedLabels(stringArray(change.remove)),
        });
    }
    return { label_changes, valid: true };
}
function ensureManagedLabels(repo) {
    for (const label of LABEL_DEFINITIONS) {
        (0, github_js_1.ensureLabel)({ ...label, repo });
    }
}
function applyManagedLabelChange(change, repo) {
    for (const label of change.remove) {
        if (change.kind === "issue")
            (0, github_js_1.removeIssueLabel)(change.number, label, repo);
        else
            (0, github_js_1.removePrLabel)(change.number, label, repo);
    }
    for (const label of change.add) {
        if (change.kind === "issue")
            (0, github_js_1.addIssueLabel)(change.number, label, repo);
        else
            (0, github_js_1.addPrLabel)(change.number, label, repo);
    }
}
function countManagedLabelOperations(changes) {
    return changes.reduce((total, change) => total + change.add.length + change.remove.length, 0);
}
//# sourceMappingURL=project-management-labels.js.map