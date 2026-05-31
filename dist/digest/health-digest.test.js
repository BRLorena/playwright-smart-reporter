"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const health_digest_1 = require("./health-digest");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
function timestamp(daysAgo) {
    return new Date(Date.now() - daysAgo * DAY).toISOString();
}
function createSummary(overrides = {}) {
    return {
        runId: 'run-1',
        timestamp: timestamp(0),
        total: 10,
        passed: 9,
        failed: 1,
        skipped: 0,
        flaky: 0,
        slow: 0,
        duration: 5000,
        passRate: 90,
        ...overrides,
    };
}
function createEntry(overrides = {}) {
    return {
        passed: true,
        duration: 1000,
        timestamp: timestamp(0),
        ...overrides,
    };
}
function createOptions(overrides = {}) {
    return {
        period: 'weekly',
        historyFile: 'test-history.json',
        ...overrides,
    };
}
function emptyHistory() {
    return { runs: [], tests: {}, summaries: [] };
}
(0, vitest_1.describe)('HealthDigest', () => {
    const digest = new health_digest_1.HealthDigest();
    (0, vitest_1.describe)('analyze()', () => {
        (0, vitest_1.it)('returns data with correct period metadata for weekly', () => {
            const history = {
                runs: [],
                tests: {},
                summaries: [
                    createSummary({ runId: 'r1', timestamp: timestamp(5), passRate: 90 }),
                    createSummary({ runId: 'r2', timestamp: timestamp(3), passRate: 92 }),
                    createSummary({ runId: 'r3', timestamp: timestamp(1), passRate: 95 }),
                ],
            };
            const result = digest.analyze(history, createOptions({ period: 'weekly' }));
            (0, vitest_1.expect)(result.period).toBe('weekly');
            (0, vitest_1.expect)(result.runsAnalyzed).toBe(3);
        });
        (0, vitest_1.it)('returns empty digest when no summaries in range', () => {
            const history = {
                runs: [],
                tests: {},
                summaries: [
                    createSummary({ runId: 'r1', timestamp: timestamp(15) }),
                ],
            };
            const result = digest.analyze(history, createOptions({ period: 'weekly' }));
            (0, vitest_1.expect)(result.runsAnalyzed).toBe(0);
            (0, vitest_1.expect)(result.passRateTrend).toBeNull();
            (0, vitest_1.expect)(result.newFlakyTests).toEqual([]);
            (0, vitest_1.expect)(result.recoveredTests).toEqual([]);
            (0, vitest_1.expect)(result.performanceTrends).toEqual([]);
        });
        (0, vitest_1.it)('detects pass rate trending up', () => {
            const history = {
                runs: [],
                tests: {},
                summaries: [
                    createSummary({ runId: 'r1', timestamp: timestamp(6), passRate: 85 }),
                    createSummary({ runId: 'r2', timestamp: timestamp(3), passRate: 90 }),
                    createSummary({ runId: 'r3', timestamp: timestamp(1), passRate: 96 }),
                ],
            };
            const result = digest.analyze(history, createOptions());
            (0, vitest_1.expect)(result.passRateTrend).not.toBeNull();
            (0, vitest_1.expect)(result.passRateTrend.direction).toBe('up');
            (0, vitest_1.expect)(result.passRateTrend.from).toBe(85);
            (0, vitest_1.expect)(result.passRateTrend.to).toBe(96);
        });
        (0, vitest_1.it)('detects pass rate trending down', () => {
            const history = {
                runs: [],
                tests: {},
                summaries: [
                    createSummary({ runId: 'r1', timestamp: timestamp(6), passRate: 96 }),
                    createSummary({ runId: 'r2', timestamp: timestamp(3), passRate: 90 }),
                    createSummary({ runId: 'r3', timestamp: timestamp(1), passRate: 85 }),
                ],
            };
            const result = digest.analyze(history, createOptions());
            (0, vitest_1.expect)(result.passRateTrend).not.toBeNull();
            (0, vitest_1.expect)(result.passRateTrend.direction).toBe('down');
            (0, vitest_1.expect)(result.passRateTrend.from).toBe(96);
            (0, vitest_1.expect)(result.passRateTrend.to).toBe(85);
        });
        (0, vitest_1.it)('detects pass rate stable when change is within 1%', () => {
            const history = {
                runs: [],
                tests: {},
                summaries: [
                    createSummary({ runId: 'r1', timestamp: timestamp(6), passRate: 95 }),
                    createSummary({ runId: 'r2', timestamp: timestamp(3), passRate: 95.5 }),
                    createSummary({ runId: 'r3', timestamp: timestamp(1), passRate: 95.8 }),
                ],
            };
            const result = digest.analyze(history, createOptions());
            (0, vitest_1.expect)(result.passRateTrend).not.toBeNull();
            (0, vitest_1.expect)(result.passRateTrend.direction).toBe('stable');
        });
        (0, vitest_1.it)('detects new flaky tests (was stable, now flaky)', () => {
            const history = {
                runs: [],
                tests: {
                    'test-flaky': [
                        // Before period: stable
                        createEntry({ passed: true, timestamp: timestamp(14) }),
                        createEntry({ passed: true, timestamp: timestamp(12) }),
                        createEntry({ passed: true, timestamp: timestamp(10) }),
                        // In period: flaky (3 of 5 fail = 0.6 score)
                        createEntry({ passed: false, timestamp: timestamp(6) }),
                        createEntry({ passed: true, timestamp: timestamp(5) }),
                        createEntry({ passed: false, timestamp: timestamp(4) }),
                        createEntry({ passed: false, timestamp: timestamp(3) }),
                        createEntry({ passed: true, timestamp: timestamp(2) }),
                    ],
                },
                summaries: [
                    createSummary({ runId: 'r1', timestamp: timestamp(6) }),
                    createSummary({ runId: 'r2', timestamp: timestamp(3) }),
                ],
            };
            const result = digest.analyze(history, createOptions());
            (0, vitest_1.expect)(result.newFlakyTests.length).toBe(1);
            (0, vitest_1.expect)(result.newFlakyTests[0].testId).toBe('test-flaky');
            (0, vitest_1.expect)(result.newFlakyTests[0].flakinessScore).toBeGreaterThanOrEqual(0.3);
        });
        (0, vitest_1.it)('detects recovered tests (was flaky, now stable for 3+ runs)', () => {
            const history = {
                runs: [],
                tests: {
                    'test-recovered': [
                        // Before period: flaky
                        createEntry({ passed: false, timestamp: timestamp(14) }),
                        createEntry({ passed: true, timestamp: timestamp(13) }),
                        createEntry({ passed: false, timestamp: timestamp(12) }),
                        createEntry({ passed: true, timestamp: timestamp(11) }),
                        createEntry({ passed: false, timestamp: timestamp(10) }),
                        // In period: stable (all pass, 4 consecutive)
                        createEntry({ passed: true, timestamp: timestamp(6), runId: 'r1' }),
                        createEntry({ passed: true, timestamp: timestamp(5), runId: 'r2' }),
                        createEntry({ passed: true, timestamp: timestamp(4), runId: 'r3' }),
                        createEntry({ passed: true, timestamp: timestamp(3), runId: 'r4' }),
                    ],
                },
                summaries: [
                    createSummary({ runId: 'r1', timestamp: timestamp(6) }),
                    createSummary({ runId: 'r2', timestamp: timestamp(3) }),
                ],
            };
            const result = digest.analyze(history, createOptions());
            (0, vitest_1.expect)(result.recoveredTests.length).toBe(1);
            (0, vitest_1.expect)(result.recoveredTests[0].testId).toBe('test-recovered');
            (0, vitest_1.expect)(result.recoveredTests[0].stableForRuns).toBeGreaterThanOrEqual(3);
        });
        (0, vitest_1.it)('detects performance regression (>20% slower)', () => {
            const history = {
                runs: [],
                tests: {
                    'test-slow': [
                        // Before period: ~1000ms
                        createEntry({ passed: true, duration: 1000, timestamp: timestamp(14) }),
                        createEntry({ passed: true, duration: 1000, timestamp: timestamp(12) }),
                        createEntry({ passed: true, duration: 1000, timestamp: timestamp(10) }),
                        // In period: ~1500ms (50% slower)
                        createEntry({ passed: true, duration: 1500, timestamp: timestamp(6) }),
                        createEntry({ passed: true, duration: 1500, timestamp: timestamp(4) }),
                        createEntry({ passed: true, duration: 1500, timestamp: timestamp(2) }),
                    ],
                },
                summaries: [
                    createSummary({ runId: 'r1', timestamp: timestamp(6) }),
                    createSummary({ runId: 'r2', timestamp: timestamp(2) }),
                ],
            };
            const result = digest.analyze(history, createOptions());
            (0, vitest_1.expect)(result.performanceTrends.length).toBe(1);
            (0, vitest_1.expect)(result.performanceTrends[0].testId).toBe('test-slow');
            (0, vitest_1.expect)(result.performanceTrends[0].percentChange).toBeGreaterThan(20);
        });
        (0, vitest_1.it)('handles empty history', () => {
            const result = digest.analyze(emptyHistory(), createOptions());
            (0, vitest_1.expect)(result.runsAnalyzed).toBe(0);
            (0, vitest_1.expect)(result.passRateTrend).toBeNull();
            (0, vitest_1.expect)(result.newFlakyTests).toEqual([]);
            (0, vitest_1.expect)(result.recoveredTests).toEqual([]);
            (0, vitest_1.expect)(result.performanceTrends).toEqual([]);
        });
        (0, vitest_1.it)('handles history with no test entries', () => {
            const history = {
                runs: [],
                tests: {},
                summaries: [
                    createSummary({ runId: 'r1', timestamp: timestamp(3), passRate: 90 }),
                    createSummary({ runId: 'r2', timestamp: timestamp(1), passRate: 92 }),
                ],
            };
            const result = digest.analyze(history, createOptions());
            (0, vitest_1.expect)(result.runsAnalyzed).toBe(2);
            (0, vitest_1.expect)(result.newFlakyTests).toEqual([]);
            (0, vitest_1.expect)(result.recoveredTests).toEqual([]);
            (0, vitest_1.expect)(result.performanceTrends).toEqual([]);
        });
        (0, vitest_1.it)('filters to daily period (24h window)', () => {
            const history = {
                runs: [],
                tests: {},
                summaries: [
                    createSummary({ runId: 'r-old', timestamp: timestamp(3), passRate: 80 }),
                    createSummary({ runId: 'r-recent', timestamp: timestamp(0.5), passRate: 95 }),
                ],
            };
            const result = digest.analyze(history, createOptions({ period: 'daily' }));
            (0, vitest_1.expect)(result.period).toBe('daily');
            (0, vitest_1.expect)(result.runsAnalyzed).toBe(1);
        });
        (0, vitest_1.it)('filters to monthly period', () => {
            const history = {
                runs: [],
                tests: {},
                summaries: [
                    createSummary({ runId: 'r-old', timestamp: timestamp(45), passRate: 80 }),
                    createSummary({ runId: 'r1', timestamp: timestamp(25), passRate: 85 }),
                    createSummary({ runId: 'r2', timestamp: timestamp(15), passRate: 90 }),
                    createSummary({ runId: 'r3', timestamp: timestamp(5), passRate: 95 }),
                ],
            };
            const result = digest.analyze(history, createOptions({ period: 'monthly' }));
            (0, vitest_1.expect)(result.period).toBe('monthly');
            (0, vitest_1.expect)(result.runsAnalyzed).toBe(3);
        });
        (0, vitest_1.it)('handles only skipped entries in period', () => {
            const history = {
                runs: [],
                tests: {
                    'test-skipped': [
                        createEntry({ passed: false, skipped: true, timestamp: timestamp(3) }),
                        createEntry({ passed: false, skipped: true, timestamp: timestamp(2) }),
                    ],
                },
                summaries: [
                    createSummary({ runId: 'r1', timestamp: timestamp(3) }),
                ],
            };
            const result = digest.analyze(history, createOptions());
            (0, vitest_1.expect)(result.newFlakyTests).toEqual([]);
            (0, vitest_1.expect)(result.recoveredTests).toEqual([]);
        });
        (0, vitest_1.it)('handles single run in period (no trend for pass rate with one summary)', () => {
            const history = {
                runs: [],
                tests: {},
                summaries: [
                    createSummary({ runId: 'r1', timestamp: timestamp(2), passRate: 90 }),
                ],
            };
            const result = digest.analyze(history, createOptions());
            (0, vitest_1.expect)(result.runsAnalyzed).toBe(1);
            // With a single summary, from and to are the same so direction is stable
            (0, vitest_1.expect)(result.passRateTrend).not.toBeNull();
            (0, vitest_1.expect)(result.passRateTrend.direction).toBe('stable');
        });
        (0, vitest_1.it)('does not report flaky test as new if it was already flaky before period', () => {
            const history = {
                runs: [],
                tests: {
                    'test-already-flaky': [
                        // Before period: already flaky
                        createEntry({ passed: false, timestamp: timestamp(14) }),
                        createEntry({ passed: true, timestamp: timestamp(13) }),
                        createEntry({ passed: false, timestamp: timestamp(12) }),
                        // In period: still flaky
                        createEntry({ passed: false, timestamp: timestamp(5) }),
                        createEntry({ passed: true, timestamp: timestamp(4) }),
                        createEntry({ passed: false, timestamp: timestamp(3) }),
                    ],
                },
                summaries: [
                    createSummary({ runId: 'r1', timestamp: timestamp(5) }),
                ],
            };
            const result = digest.analyze(history, createOptions());
            (0, vitest_1.expect)(result.newFlakyTests).toEqual([]);
        });
        (0, vitest_1.it)('reports flaky test as new if no entries before period', () => {
            const history = {
                runs: [],
                tests: {
                    'test-new-flaky': [
                        // Only in period
                        createEntry({ passed: false, timestamp: timestamp(5) }),
                        createEntry({ passed: true, timestamp: timestamp(4) }),
                        createEntry({ passed: false, timestamp: timestamp(3) }),
                    ],
                },
                summaries: [
                    createSummary({ runId: 'r1', timestamp: timestamp(5) }),
                ],
            };
            const result = digest.analyze(history, createOptions());
            (0, vitest_1.expect)(result.newFlakyTests.length).toBe(1);
            (0, vitest_1.expect)(result.newFlakyTests[0].testId).toBe('test-new-flaky');
        });
        (0, vitest_1.it)('does not report performance change under 20% threshold', () => {
            const history = {
                runs: [],
                tests: {
                    'test-ok': [
                        createEntry({ passed: true, duration: 1000, timestamp: timestamp(14) }),
                        createEntry({ passed: true, duration: 1000, timestamp: timestamp(12) }),
                        // In period: only 10% slower
                        createEntry({ passed: true, duration: 1100, timestamp: timestamp(5) }),
                        createEntry({ passed: true, duration: 1100, timestamp: timestamp(3) }),
                    ],
                },
                summaries: [
                    createSummary({ runId: 'r1', timestamp: timestamp(5) }),
                ],
            };
            const result = digest.analyze(history, createOptions());
            (0, vitest_1.expect)(result.performanceTrends).toEqual([]);
        });
        (0, vitest_1.it)('generates correct summary text', () => {
            const history = {
                runs: [],
                tests: {},
                summaries: [
                    createSummary({ runId: 'r1', timestamp: timestamp(6), passRate: 85 }),
                    createSummary({ runId: 'r2', timestamp: timestamp(3), passRate: 90 }),
                    createSummary({ runId: 'r3', timestamp: timestamp(1), passRate: 96 }),
                ],
            };
            const result = digest.analyze(history, createOptions());
            (0, vitest_1.expect)(result.summary).toContain('3 runs analyzed');
            (0, vitest_1.expect)(result.summary).toContain('up');
        });
        (0, vitest_1.it)('handles undefined summaries array', () => {
            const history = {
                runs: [],
                tests: {},
            };
            const result = digest.analyze(history, createOptions());
            (0, vitest_1.expect)(result.runsAnalyzed).toBe(0);
            (0, vitest_1.expect)(result.passRateTrend).toBeNull();
        });
    });
    (0, vitest_1.describe)('generateMarkdown()', () => {
        (0, vitest_1.it)('formats correctly with data', () => {
            const data = digest.analyze({
                runs: [],
                tests: {
                    'test-flaky': [
                        createEntry({ passed: true, timestamp: timestamp(14) }),
                        createEntry({ passed: true, timestamp: timestamp(12) }),
                        createEntry({ passed: false, timestamp: timestamp(5) }),
                        createEntry({ passed: true, timestamp: timestamp(4) }),
                        createEntry({ passed: false, timestamp: timestamp(3) }),
                    ],
                },
                summaries: [
                    createSummary({ runId: 'r1', timestamp: timestamp(6), passRate: 85 }),
                    createSummary({ runId: 'r2', timestamp: timestamp(1), passRate: 95 }),
                ],
            }, createOptions());
            const md = digest.generateMarkdown(data);
            (0, vitest_1.expect)(md).toContain('# Test Health Digest');
            (0, vitest_1.expect)(md).toContain('## Summary');
            (0, vitest_1.expect)(md).toContain('## New Flaky Tests');
            (0, vitest_1.expect)(md).toContain('`test-flaky`');
        });
        (0, vitest_1.it)('handles empty sections', () => {
            const data = digest.analyze({
                runs: [],
                tests: {},
                summaries: [
                    createSummary({ runId: 'r1', timestamp: timestamp(3), passRate: 95 }),
                ],
            }, createOptions());
            const md = digest.generateMarkdown(data);
            (0, vitest_1.expect)(md).toContain('# Test Health Digest');
            (0, vitest_1.expect)(md).toContain('None');
        });
    });
    (0, vitest_1.describe)('generateText()', () => {
        (0, vitest_1.it)('produces plain text without markdown markers', () => {
            const data = digest.analyze({
                runs: [],
                tests: {
                    'test-flaky': [
                        createEntry({ passed: true, timestamp: timestamp(14) }),
                        createEntry({ passed: false, timestamp: timestamp(5) }),
                        createEntry({ passed: true, timestamp: timestamp(4) }),
                        createEntry({ passed: false, timestamp: timestamp(3) }),
                    ],
                },
                summaries: [
                    createSummary({ runId: 'r1', timestamp: timestamp(6), passRate: 85 }),
                    createSummary({ runId: 'r2', timestamp: timestamp(1), passRate: 95 }),
                ],
            }, createOptions());
            const text = digest.generateText(data);
            (0, vitest_1.expect)(text).not.toContain('#');
            (0, vitest_1.expect)(text).not.toContain('`');
            (0, vitest_1.expect)(text).toContain('Test Health Digest');
            (0, vitest_1.expect)(text).toContain('test-flaky');
        });
    });
});
