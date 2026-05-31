"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ci_detector_1 = require("./ci-detector");
(0, vitest_1.describe)('detectCIInfo', () => {
    const originalEnv = process.env;
    (0, vitest_1.beforeEach)(() => {
        process.env = { ...originalEnv };
        // Clear all CI-related env vars
        delete process.env.GITHUB_ACTIONS;
        delete process.env.GITHUB_HEAD_REF;
        delete process.env.GITHUB_REF_NAME;
        delete process.env.GITHUB_REF;
        delete process.env.GITHUB_SHA;
        delete process.env.GITHUB_RUN_ID;
        delete process.env.GITLAB_CI;
        delete process.env.CI_COMMIT_REF_NAME;
        delete process.env.CI_COMMIT_SHORT_SHA;
        delete process.env.CI_COMMIT_SHA;
        delete process.env.CI_PIPELINE_ID;
        delete process.env.CIRCLECI;
        delete process.env.CIRCLE_BRANCH;
        delete process.env.CIRCLE_SHA1;
        delete process.env.CIRCLE_BUILD_NUM;
        delete process.env.JENKINS_URL;
        delete process.env.GIT_BRANCH;
        delete process.env.BRANCH_NAME;
        delete process.env.GIT_COMMIT;
        delete process.env.BUILD_NUMBER;
        delete process.env.TF_BUILD;
        delete process.env.BUILD_SOURCEBRANCH;
        delete process.env.BUILD_SOURCEVERSION;
        delete process.env.BUILD_BUILDID;
        delete process.env.BUILDKITE;
        delete process.env.BUILDKITE_BRANCH;
        delete process.env.BUILDKITE_COMMIT;
        delete process.env.BUILDKITE_BUILD_NUMBER;
        delete process.env.CI;
        delete process.env.CI_BRANCH;
        delete process.env.BRANCH;
        delete process.env.CI_COMMIT;
        delete process.env.COMMIT;
        delete process.env.CI_BUILD_ID;
        delete process.env.BUILD_ID;
    });
    (0, vitest_1.afterEach)(() => {
        process.env = originalEnv;
    });
    (0, vitest_1.it)('returns undefined when no CI environment is detected', () => {
        (0, vitest_1.expect)((0, ci_detector_1.detectCIInfo)()).toBeUndefined();
    });
    (0, vitest_1.describe)('GitHub Actions', () => {
        (0, vitest_1.it)('detects GitHub Actions with GITHUB_HEAD_REF', () => {
            process.env.GITHUB_ACTIONS = 'true';
            process.env.GITHUB_HEAD_REF = 'feature/my-branch';
            process.env.GITHUB_SHA = 'abc12345deadbeef';
            process.env.GITHUB_RUN_ID = '12345';
            const info = (0, ci_detector_1.detectCIInfo)();
            (0, vitest_1.expect)(info).toEqual({
                provider: 'github',
                branch: 'feature/my-branch',
                commit: 'abc12345',
                buildId: '12345',
            });
        });
        (0, vitest_1.it)('falls back to GITHUB_REF_NAME when GITHUB_HEAD_REF is empty', () => {
            process.env.GITHUB_ACTIONS = 'true';
            process.env.GITHUB_HEAD_REF = '';
            process.env.GITHUB_REF_NAME = 'main';
            process.env.GITHUB_SHA = 'deadbeef12345678';
            const info = (0, ci_detector_1.detectCIInfo)();
            (0, vitest_1.expect)(info?.branch).toBe('main');
        });
        (0, vitest_1.it)('falls back to GITHUB_REF with refs/heads/ prefix stripped', () => {
            process.env.GITHUB_ACTIONS = 'true';
            process.env.GITHUB_REF = 'refs/heads/develop';
            process.env.GITHUB_SHA = 'aabbccdd11223344';
            const info = (0, ci_detector_1.detectCIInfo)();
            (0, vitest_1.expect)(info?.branch).toBe('develop');
        });
        (0, vitest_1.it)('truncates commit SHA to 8 characters', () => {
            process.env.GITHUB_ACTIONS = 'true';
            process.env.GITHUB_SHA = 'abc123456789abcd';
            const info = (0, ci_detector_1.detectCIInfo)();
            (0, vitest_1.expect)(info?.commit).toBe('abc12345');
        });
    });
    (0, vitest_1.describe)('GitLab CI', () => {
        (0, vitest_1.it)('detects GitLab CI', () => {
            process.env.GITLAB_CI = 'true';
            process.env.CI_COMMIT_REF_NAME = 'feature/gitlab-branch';
            process.env.CI_COMMIT_SHORT_SHA = 'abcd1234';
            process.env.CI_PIPELINE_ID = '98765';
            const info = (0, ci_detector_1.detectCIInfo)();
            (0, vitest_1.expect)(info).toEqual({
                provider: 'gitlab',
                branch: 'feature/gitlab-branch',
                commit: 'abcd1234',
                buildId: '98765',
            });
        });
        (0, vitest_1.it)('falls back to CI_COMMIT_SHA when CI_COMMIT_SHORT_SHA is absent', () => {
            process.env.GITLAB_CI = 'true';
            process.env.CI_COMMIT_SHA = 'deadbeefcafebabe';
            const info = (0, ci_detector_1.detectCIInfo)();
            (0, vitest_1.expect)(info?.commit).toBe('deadbeef');
        });
    });
    (0, vitest_1.describe)('CircleCI', () => {
        (0, vitest_1.it)('detects CircleCI', () => {
            process.env.CIRCLECI = 'true';
            process.env.CIRCLE_BRANCH = 'circle-branch';
            process.env.CIRCLE_SHA1 = '1234567890abcdef';
            process.env.CIRCLE_BUILD_NUM = '42';
            const info = (0, ci_detector_1.detectCIInfo)();
            (0, vitest_1.expect)(info).toEqual({
                provider: 'circleci',
                branch: 'circle-branch',
                commit: '12345678',
                buildId: '42',
            });
        });
    });
    (0, vitest_1.describe)('Jenkins', () => {
        (0, vitest_1.it)('detects Jenkins with GIT_BRANCH', () => {
            process.env.JENKINS_URL = 'https://jenkins.example.com';
            process.env.GIT_BRANCH = 'origin/main';
            process.env.GIT_COMMIT = 'aabbccdd00112233';
            process.env.BUILD_NUMBER = '100';
            const info = (0, ci_detector_1.detectCIInfo)();
            (0, vitest_1.expect)(info).toEqual({
                provider: 'jenkins',
                branch: 'origin/main',
                commit: 'aabbccdd',
                buildId: '100',
            });
        });
        (0, vitest_1.it)('falls back to BRANCH_NAME when GIT_BRANCH is absent', () => {
            process.env.JENKINS_URL = 'https://jenkins.example.com';
            process.env.BRANCH_NAME = 'develop';
            const info = (0, ci_detector_1.detectCIInfo)();
            (0, vitest_1.expect)(info?.branch).toBe('develop');
        });
    });
    (0, vitest_1.describe)('Azure DevOps', () => {
        (0, vitest_1.it)('detects Azure DevOps and strips refs/heads/ prefix', () => {
            process.env.TF_BUILD = 'True';
            process.env.BUILD_SOURCEBRANCH = 'refs/heads/release/v1';
            process.env.BUILD_SOURCEVERSION = 'fedcba9876543210';
            process.env.BUILD_BUILDID = '555';
            const info = (0, ci_detector_1.detectCIInfo)();
            (0, vitest_1.expect)(info).toEqual({
                provider: 'azure',
                branch: 'release/v1',
                commit: 'fedcba98',
                buildId: '555',
            });
        });
    });
    (0, vitest_1.describe)('Buildkite', () => {
        (0, vitest_1.it)('detects Buildkite', () => {
            process.env.BUILDKITE = 'true';
            process.env.BUILDKITE_BRANCH = 'bk-branch';
            process.env.BUILDKITE_COMMIT = 'aabb112233445566';
            process.env.BUILDKITE_BUILD_NUMBER = '77';
            const info = (0, ci_detector_1.detectCIInfo)();
            (0, vitest_1.expect)(info).toEqual({
                provider: 'buildkite',
                branch: 'bk-branch',
                commit: 'aabb1122',
                buildId: '77',
            });
        });
    });
    (0, vitest_1.describe)('Generic CI', () => {
        (0, vitest_1.it)('detects generic CI with CI env var', () => {
            process.env.CI = 'true';
            process.env.CI_BRANCH = 'generic-branch';
            process.env.CI_COMMIT = 'generic-commit';
            process.env.CI_BUILD_ID = 'gen-123';
            const info = (0, ci_detector_1.detectCIInfo)();
            (0, vitest_1.expect)(info).toEqual({
                provider: 'unknown',
                branch: 'generic-branch',
                commit: 'generic-commit',
                buildId: 'gen-123',
            });
        });
        (0, vitest_1.it)('falls back to BRANCH and COMMIT env vars', () => {
            process.env.CI = 'true';
            process.env.BRANCH = 'alt-branch';
            process.env.COMMIT = 'alt-commit';
            process.env.BUILD_ID = 'alt-123';
            const info = (0, ci_detector_1.detectCIInfo)();
            (0, vitest_1.expect)(info).toEqual({
                provider: 'unknown',
                branch: 'alt-branch',
                commit: 'alt-commit',
                buildId: 'alt-123',
            });
        });
    });
    (0, vitest_1.describe)('provider priority', () => {
        (0, vitest_1.it)('GitHub Actions takes priority over generic CI', () => {
            process.env.GITHUB_ACTIONS = 'true';
            process.env.CI = 'true';
            process.env.GITHUB_REF_NAME = 'gh-branch';
            const info = (0, ci_detector_1.detectCIInfo)();
            (0, vitest_1.expect)(info?.provider).toBe('github');
        });
        (0, vitest_1.it)('GitLab takes priority over generic CI', () => {
            process.env.GITLAB_CI = 'true';
            process.env.CI = 'true';
            process.env.CI_COMMIT_REF_NAME = 'gl-branch';
            const info = (0, ci_detector_1.detectCIInfo)();
            (0, vitest_1.expect)(info?.provider).toBe('gitlab');
        });
    });
});
