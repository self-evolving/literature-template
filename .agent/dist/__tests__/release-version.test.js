"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const release_version_js_1 = require("../release-version.js");
(0, node_test_1.test)("parseReleaseVersion accepts plain SemVer and optional v prefix", () => {
    node_assert_1.strict.deepEqual((0, release_version_js_1.parseReleaseVersion)("0.2.0"), {
        version: "0.2.0",
        tag: "v0.2.0",
        major: 0,
        minor: 2,
        patch: 0,
        prereleaseLabel: "",
    });
    node_assert_1.strict.equal((0, release_version_js_1.parseReleaseVersion)("v1.0.0-rc.1").version, "1.0.0-rc.1");
});
(0, node_test_1.test)("parseReleaseVersion rejects build metadata and leading zero prerelease numbers", () => {
    node_assert_1.strict.throws(() => (0, release_version_js_1.parseReleaseVersion)("1.0.0+build.1"), /version must be SemVer/);
    node_assert_1.strict.throws(() => (0, release_version_js_1.parseReleaseVersion)("1.0.0-rc.01"), /version must be SemVer/);
});
//# sourceMappingURL=release-version.test.js.map