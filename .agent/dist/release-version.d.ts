export interface ReleaseVersion {
    version: string;
    tag: string;
    major: number;
    minor: number;
    patch: number;
    prereleaseLabel: string;
}
export declare function parseReleaseVersion(value: string): ReleaseVersion;
//# sourceMappingURL=release-version.d.ts.map