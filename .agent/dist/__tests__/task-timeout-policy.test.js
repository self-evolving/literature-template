"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const task_timeout_policy_js_1 = require("../task-timeout-policy.js");
(0, node_test_1.test)("parseTaskTimeoutPolicy falls back to default minutes when unset", () => {
    const policy = (0, task_timeout_policy_js_1.parseTaskTimeoutPolicy)("");
    node_assert_1.strict.equal(policy.defaultMinutes, task_timeout_policy_js_1.DEFAULT_TASK_TIMEOUT_MINUTES);
    node_assert_1.strict.deepEqual(policy.routeOverrides, {});
    node_assert_1.strict.equal(task_timeout_policy_js_1.DEFAULT_TASK_TIMEOUT_MINUTES, 30);
    node_assert_1.strict.equal(task_timeout_policy_js_1.MAX_TASK_TIMEOUT_MINUTES, 360);
});
(0, node_test_1.test)("parseTaskTimeoutPolicy accepts default_minutes alone", () => {
    const policy = (0, task_timeout_policy_js_1.parseTaskTimeoutPolicy)('{"default_minutes": 45}');
    node_assert_1.strict.equal(policy.defaultMinutes, 45);
    node_assert_1.strict.deepEqual(policy.routeOverrides, {});
});
(0, node_test_1.test)("parseTaskTimeoutPolicy accepts route_overrides alone", () => {
    const policy = (0, task_timeout_policy_js_1.parseTaskTimeoutPolicy)('{"route_overrides": {"review": 45, "fix-pr": 60}}');
    node_assert_1.strict.equal(policy.defaultMinutes, task_timeout_policy_js_1.DEFAULT_TASK_TIMEOUT_MINUTES);
    node_assert_1.strict.equal(policy.routeOverrides.review, 45);
    node_assert_1.strict.equal(policy.routeOverrides["fix-pr"], 60);
});
(0, node_test_1.test)("parseTaskTimeoutPolicy normalizes route keys to lowercase", () => {
    const policy = (0, task_timeout_policy_js_1.parseTaskTimeoutPolicy)('{"route_overrides": {"REVIEW": 40}}');
    node_assert_1.strict.equal(policy.routeOverrides.review, 40);
    node_assert_1.strict.equal(policy.routeOverrides.REVIEW, undefined);
});
(0, node_test_1.test)("parseTaskTimeoutPolicy rejects invalid minute values", () => {
    node_assert_1.strict.throws(() => (0, task_timeout_policy_js_1.parseTaskTimeoutPolicy)('{"default_minutes": 0}'), /default_minutes must be a positive integer/);
    node_assert_1.strict.throws(() => (0, task_timeout_policy_js_1.parseTaskTimeoutPolicy)('{"default_minutes": 1.5}'), /default_minutes must be a positive integer/);
    node_assert_1.strict.throws(() => (0, task_timeout_policy_js_1.parseTaskTimeoutPolicy)('{"route_overrides": {"answer": "30"}}'), /route_overrides\.answer must be a positive integer/);
    node_assert_1.strict.throws(() => (0, task_timeout_policy_js_1.parseTaskTimeoutPolicy)('{"default_minutes": 361}'), /default_minutes must be at most 360/);
    node_assert_1.strict.throws(() => (0, task_timeout_policy_js_1.parseTaskTimeoutPolicy)('{"route_overrides": {"answer": 1000}}'), /route_overrides\.answer must be at most 360/);
});
(0, node_test_1.test)("parseTaskTimeoutPolicy rejects non-object route_overrides", () => {
    node_assert_1.strict.throws(() => (0, task_timeout_policy_js_1.parseTaskTimeoutPolicy)('{"route_overrides": ["answer", "review"]}'), /route_overrides must be an object/);
});
(0, node_test_1.test)("parseTaskTimeoutPolicy rejects invalid route keys", () => {
    node_assert_1.strict.throws(() => (0, task_timeout_policy_js_1.parseTaskTimeoutPolicy)('{"route_overrides": {"!bad": 30}}'), /Invalid route override key/);
});
(0, node_test_1.test)("getTaskTimeoutMinutesForRoute prefers override over default", () => {
    const policy = (0, task_timeout_policy_js_1.parseTaskTimeoutPolicy)('{"default_minutes": 30, "route_overrides": {"implement": 75}}');
    node_assert_1.strict.equal((0, task_timeout_policy_js_1.getTaskTimeoutMinutesForRoute)(policy, "implement"), 75);
    node_assert_1.strict.equal((0, task_timeout_policy_js_1.getTaskTimeoutMinutesForRoute)(policy, "review"), 30);
});
//# sourceMappingURL=task-timeout-policy.test.js.map