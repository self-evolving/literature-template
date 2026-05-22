"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const project_management_labels_js_1 = require("../project-management-labels.js");
(0, node_test_1.test)("managed label plan keeps only allowed project-management labels", () => {
    const plan = (0, project_management_labels_js_1.parseManagedLabelPlan)(`
## Project Management Summary

\`\`\`json
{
  "label_changes": [
    {
      "kind": "issue",
      "number": 34,
      "add": ["priority/p1", "bug", "effort/high"],
      "remove": ["priority/p3", "external"]
    },
    {
      "kind": "discussion",
      "number": 7,
      "add": ["priority/p0"],
      "remove": []
    }
  ],
  "comments": [{"body": "not allowed"}]
}
\`\`\`
`);
    node_assert_1.strict.deepEqual(plan, {
        valid: true,
        label_changes: [
            {
                kind: "issue",
                number: 34,
                add: ["priority/p1", "effort/high"],
                remove: ["priority/p3"],
            },
        ],
    });
});
(0, node_test_1.test)("managed label plan distinguishes malformed and missing json plans", () => {
    node_assert_1.strict.deepEqual((0, project_management_labels_js_1.parseManagedLabelPlan)("## Summary\n\nNo structured plan."), {
        label_changes: [],
        valid: false,
    });
    node_assert_1.strict.deepEqual((0, project_management_labels_js_1.parseManagedLabelPlan)("```json\nnot-json\n```"), {
        label_changes: [],
        valid: false,
    });
    node_assert_1.strict.deepEqual((0, project_management_labels_js_1.parseManagedLabelPlan)("```json\n{\"label_changes\":[]}\n```"), {
        label_changes: [],
        valid: true,
    });
});
//# sourceMappingURL=project-management-labels.test.js.map