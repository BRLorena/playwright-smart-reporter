"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const quality_gate_evaluator_1 = require("./quality-gate-evaluator");
function createTestResult(overrides = {}) {
    return {
        testId: 'test-1',
        title: 'Test 1',
        file: 'test.spec.ts',
        status: 'passed',
        duration: 1000,
        retry: 0,
        steps: [],
        history: [],
        ...overrides,
    };
}
function createStabilityScore(overrides = {}) {
    return {
        overall: 90,
        flakiness: 95,
        performance: 85,
        reliability: 90,
        grade: 'A',
        needsAttention: false,
        ...overrides,
    };
}
function createRunSummary(overrides = {}) {
    return {
        runId: 'run-1',
        timestamp: new Date().toISOString(),
        total: 10,
        passed: 8,
        failed: 2,
        skipped: 0,
        flaky: 1,
        slow: 1,
        duration: 5000,
        passRate: 80,
        ...overrides,
    };
}
function createComparison(overrides = {}) {
    return {
        baselineRun: createRunSummary({ runId: 'baseline' }),
        currentRun: createRunSummary({ runId: 'current' }),
        changes: {
            newFailures: [],
            fixedTests: [],
            newTests: [],
            regressions: [],
            improvements: [],
        },
        ...overrides,
    };
}
(0, vitest_1.describe)('QualityGateEvaluator', () => {
    const evaluator = new quality_gate_evaluator_1.QualityGateEvaluator();
    // ── No rules configured ──────────────────────────────────────────────
    (0, vitest_1.describe)('no rules configured', () => {
        (0, vitest_1.it)('passes with empty rules array when no config properties set', () => {
            const result = evaluator.evaluate({}, [createTestResult()]);
            (0, vitest_1.expect)(result.passed).toBe(true);
            (0, vitest_1.expect)(result.rules).toEqual([]);
        });
        (0, vitest_1.it)('passes with empty results and no config', () => {
            const result = evaluator.evaluate({}, []);
            (0, vitest_1.expect)(result.passed).toBe(true);
            (0, vitest_1.expect)(result.rules).toEqual([]);
        });
    });
    // ── maxFailures ──────────────────────────────────────────────────────
    (0, vitest_1.describe)('maxFailures', () => {
        (0, vitest_1.it)('passes when failure count is below threshold', () => {
            const results = [
                createTestResult({ status: 'passed', outcome: 'expected' }),
                createTestResult({ testId: 'test-2', status: 'failed', outcome: 'unexpected' }),
            ];
            const result = evaluator.evaluate({ maxFailures: 5 }, results);
            (0, vitest_1.expect)(result.passed).toBe(true);
            const rule = result.rules.find(r => r.rule === 'maxFailures');
            (0, vitest_1.expect)(rule?.passed).toBe(true);
            (0, vitest_1.expect)(rule?.actual).toBe('1');
        });
        (0, vitest_1.it)('passes when failure count equals threshold', () => {
            const results = [
                createTestResult({ status: 'failed', outcome: 'unexpected' }),
                createTestResult({ testId: 'test-2', status: 'timedOut', outcome: 'unexpected' }),
            ];
            const result = evaluator.evaluate({ maxFailures: 2 }, results);
            const rule = result.rules.find(r => r.rule === 'maxFailures');
            (0, vitest_1.expect)(rule?.passed).toBe(true);
        });
        (0, vitest_1.it)('fails when failure count exceeds threshold', () => {
            const results = [
                createTestResult({ status: 'failed', outcome: 'unexpected' }),
                createTestResult({ testId: 'test-2', status: 'failed', outcome: 'unexpected' }),
                createTestResult({ testId: 'test-3', status: 'timedOut', outcome: 'unexpected' }),
            ];
            const result = evaluator.evaluate({ maxFailures: 2 }, results);
            (0, vitest_1.expect)(result.passed).toBe(false);
            const rule = result.rules.find(r => r.rule === 'maxFailures');
            (0, vitest_1.expect)(rule?.passed).toBe(false);
            (0, vitest_1.expect)(rule?.actual).toBe('3');
            (0, vitest_1.expect)(rule?.threshold).toBe('≤ 2');
        });
        (0, vitest_1.it)('passes with 0 threshold when no failures exist', () => {
            const results = [
                createTestResult({ status: 'passed', outcome: 'expected' }),
            ];
            const result = evaluator.evaluate({ maxFailures: 0 }, results);
            const rule = result.rules.find(r => r.rule === 'maxFailures');
            (0, vitest_1.expect)(rule?.passed).toBe(true);
            (0, vitest_1.expect)(rule?.actual).toBe('0');
        });
        (0, vitest_1.it)('fails with 0 threshold when any failure exists', () => {
            const results = [
                createTestResult({ status: 'failed', outcome: 'unexpected' }),
            ];
            const result = evaluator.evaluate({ maxFailures: 0 }, results);
            const rule = result.rules.find(r => r.rule === 'maxFailures');
            (0, vitest_1.expect)(rule?.passed).toBe(false);
        });
        (0, vitest_1.it)('only counts unexpected outcomes with failed or timedOut status', () => {
            const results = [
                createTestResult({ status: 'failed', outcome: 'expected' }), // test.fail() — expected
                createTestResult({ testId: 'test-2', status: 'skipped', outcome: 'skipped' }),
                createTestResult({ testId: 'test-3', status: 'passed', outcome: 'expected' }),
                createTestResult({ testId: 'test-4', status: 'failed', outcome: 'unexpected' }), // real failure
            ];
            const result = evaluator.evaluate({ maxFailures: 1 }, results);
            const rule = result.rules.find(r => r.rule === 'maxFailures');
            (0, vitest_1.expect)(rule?.passed).toBe(true);
            (0, vitest_1.expect)(rule?.actual).toBe('1');
        });
        (0, vitest_1.it)('counts timedOut with unexpected outcome as failure', () => {
            const results = [
                createTestResult({ status: 'timedOut', outcome: 'unexpected' }),
            ];
            const result = evaluator.evaluate({ maxFailures: 0 }, results);
            const rule = result.rules.find(r => r.rule === 'maxFailures');
            (0, vitest_1.expect)(rule?.passed).toBe(false);
            (0, vitest_1.expect)(rule?.actual).toBe('1');
        });
    });
    // ── minPassRate ──────────────────────────────────────────────────────
    (0, vitest_1.describe)('minPassRate', () => {
        (0, vitest_1.it)('passes when pass rate meets threshold', () => {
            const results = Array.from({ length: 10 }, (_, i) => createTestResult({
                testId: `test-${i}`,
                status: i < 9 ? 'passed' : 'failed',
                outcome: i < 9 ? 'expected' : 'unexpected',
            }));
            const result = evaluator.evaluate({ minPassRate: 90 }, results);
            const rule = result.rules.find(r => r.rule === 'minPassRate');
            (0, vitest_1.expect)(rule?.passed).toBe(true);
            (0, vitest_1.expect)(rule?.actual).toBe('90%');
        });
        (0, vitest_1.it)('fails when pass rate is below threshold', () => {
            const results = [
                createTestResult({ status: 'passed', outcome: 'expected' }),
                createTestResult({ testId: 'test-2', status: 'failed', outcome: 'unexpected' }),
            ];
            const result = evaluator.evaluate({ minPassRate: 90 }, results);
            (0, vitest_1.expect)(result.passed).toBe(false);
            const rule = result.rules.find(r => r.rule === 'minPassRate');
            (0, vitest_1.expect)(rule?.passed).toBe(false);
            (0, vitest_1.expect)(rule?.actual).toBe('50%');
        });
        (0, vitest_1.it)('passes with 100% threshold when all pass', () => {
            const results = [
                createTestResult({ status: 'passed', outcome: 'expected' }),
                createTestResult({ testId: 'test-2', status: 'passed', outcome: 'expected' }),
            ];
            const result = evaluator.evaluate({ minPassRate: 100 }, results);
            const rule = result.rules.find(r => r.rule === 'minPassRate');
            (0, vitest_1.expect)(rule?.passed).toBe(true);
            (0, vitest_1.expect)(rule?.actual).toBe('100%');
        });
        (0, vitest_1.it)('passes with 0% threshold regardless of results', () => {
            const results = [
                createTestResult({ status: 'failed', outcome: 'unexpected' }),
            ];
            const result = evaluator.evaluate({ minPassRate: 0 }, results);
            const rule = result.rules.find(r => r.rule === 'minPassRate');
            (0, vitest_1.expect)(rule?.passed).toBe(true);
        });
        (0, vitest_1.it)('counts flaky tests as passed', () => {
            const results = [
                createTestResult({ status: 'passed', outcome: 'flaky' }),
                createTestResult({ testId: 'test-2', status: 'passed', outcome: 'expected' }),
            ];
            const result = evaluator.evaluate({ minPassRate: 100 }, results);
            const rule = result.rules.find(r => r.rule === 'minPassRate');
            (0, vitest_1.expect)(rule?.passed).toBe(true);
            (0, vitest_1.expect)(rule?.actual).toBe('100%');
        });
        (0, vitest_1.it)('handles boundary value exactly at threshold', () => {
            // 75% pass rate (3 of 4 pass)
            const results = [
                createTestResult({ testId: 't1', status: 'passed', outcome: 'expected' }),
                createTestResult({ testId: 't2', status: 'passed', outcome: 'expected' }),
                createTestResult({ testId: 't3', status: 'passed', outcome: 'expected' }),
                createTestResult({ testId: 't4', status: 'failed', outcome: 'unexpected' }),
            ];
            const result = evaluator.evaluate({ minPassRate: 75 }, results);
            const rule = result.rules.find(r => r.rule === 'minPassRate');
            (0, vitest_1.expect)(rule?.passed).toBe(true);
        });
        (0, vitest_1.it)('handles empty results array', () => {
            const result = evaluator.evaluate({ minPassRate: 90 }, []);
            const rule = result.rules.find(r => r.rule === 'minPassRate');
            (0, vitest_1.expect)(rule?.passed).toBe(true);
            (0, vitest_1.expect)(rule?.actual).toBe('0%');
        });
    });
    // ── maxFlakyRate ─────────────────────────────────────────────────────
    (0, vitest_1.describe)('maxFlakyRate', () => {
        (0, vitest_1.it)('passes when no flaky tests exist', () => {
            const results = [
                createTestResult({ status: 'passed', outcome: 'expected' }),
                createTestResult({ testId: 'test-2', status: 'passed', outcome: 'expected' }),
            ];
            const result = evaluator.evaluate({ maxFlakyRate: 5 }, results);
            const rule = result.rules.find(r => r.rule === 'maxFlakyRate');
            (0, vitest_1.expect)(rule?.passed).toBe(true);
            (0, vitest_1.expect)(rule?.actual).toBe('0%');
        });
        (0, vitest_1.it)('fails when flaky rate exceeds threshold', () => {
            const results = [
                createTestResult({ status: 'passed', outcome: 'flaky' }),
                createTestResult({ testId: 'test-2', status: 'passed', outcome: 'expected' }),
            ];
            const result = evaluator.evaluate({ maxFlakyRate: 10 }, results);
            (0, vitest_1.expect)(result.passed).toBe(false);
            const rule = result.rules.find(r => r.rule === 'maxFlakyRate');
            (0, vitest_1.expect)(rule?.passed).toBe(false);
            (0, vitest_1.expect)(rule?.actual).toBe('50%');
        });
        (0, vitest_1.it)('passes when flaky rate equals threshold', () => {
            // 2 of 10 = 20%
            const results = Array.from({ length: 10 }, (_, i) => createTestResult({
                testId: `test-${i}`,
                status: 'passed',
                outcome: i < 2 ? 'flaky' : 'expected',
            }));
            const result = evaluator.evaluate({ maxFlakyRate: 20 }, results);
            const rule = result.rules.find(r => r.rule === 'maxFlakyRate');
            (0, vitest_1.expect)(rule?.passed).toBe(true);
        });
        (0, vitest_1.it)('handles empty results array', () => {
            const result = evaluator.evaluate({ maxFlakyRate: 5 }, []);
            const rule = result.rules.find(r => r.rule === 'maxFlakyRate');
            (0, vitest_1.expect)(rule?.passed).toBe(true);
            (0, vitest_1.expect)(rule?.actual).toBe('0%');
        });
    });
    // ── minStabilityGrade ────────────────────────────────────────────────
    (0, vitest_1.describe)('minStabilityGrade', () => {
        (0, vitest_1.it)('passes when average grade meets A threshold', () => {
            const results = [
                createTestResult({ stabilityScore: createStabilityScore({ grade: 'A' }) }),
                createTestResult({ testId: 'test-2', stabilityScore: createStabilityScore({ grade: 'A' }) }),
            ];
            const result = evaluator.evaluate({ minStabilityGrade: 'A' }, results);
            const rule = result.rules.find(r => r.rule === 'minStabilityGrade');
            (0, vitest_1.expect)(rule?.passed).toBe(true);
            (0, vitest_1.expect)(rule?.actual).toBe('A');
        });
        (0, vitest_1.it)('fails when average grade is below A threshold', () => {
            const results = [
                createTestResult({ stabilityScore: createStabilityScore({ grade: 'A' }) }),
                createTestResult({ testId: 'test-2', stabilityScore: createStabilityScore({ grade: 'C' }) }),
            ];
            const result = evaluator.evaluate({ minStabilityGrade: 'A' }, results);
            const rule = result.rules.find(r => r.rule === 'minStabilityGrade');
            (0, vitest_1.expect)(rule?.passed).toBe(false);
        });
        (0, vitest_1.it)('passes when average grade meets B threshold', () => {
            const results = [
                createTestResult({ stabilityScore: createStabilityScore({ grade: 'A' }) }),
                createTestResult({ testId: 'test-2', stabilityScore: createStabilityScore({ grade: 'B' }) }),
            ];
            const result = evaluator.evaluate({ minStabilityGrade: 'B' }, results);
            const rule = result.rules.find(r => r.rule === 'minStabilityGrade');
            (0, vitest_1.expect)(rule?.passed).toBe(true);
        });
        (0, vitest_1.it)('passes when average grade meets C threshold', () => {
            const results = [
                createTestResult({ stabilityScore: createStabilityScore({ grade: 'C' }) }),
                createTestResult({ testId: 'test-2', stabilityScore: createStabilityScore({ grade: 'D' }) }),
            ];
            // avg of C(3) + D(2) = 2.5, rounds to 3 = C
            const result = evaluator.evaluate({ minStabilityGrade: 'C' }, results);
            const rule = result.rules.find(r => r.rule === 'minStabilityGrade');
            (0, vitest_1.expect)(rule?.passed).toBe(true);
        });
        (0, vitest_1.it)('passes when average grade meets D threshold', () => {
            const results = [
                createTestResult({ stabilityScore: createStabilityScore({ grade: 'D' }) }),
                createTestResult({ testId: 'test-2', stabilityScore: createStabilityScore({ grade: 'D' }) }),
            ];
            const result = evaluator.evaluate({ minStabilityGrade: 'D' }, results);
            const rule = result.rules.find(r => r.rule === 'minStabilityGrade');
            (0, vitest_1.expect)(rule?.passed).toBe(true);
            (0, vitest_1.expect)(rule?.actual).toBe('D');
        });
        (0, vitest_1.it)('fails when average grade is F against D threshold', () => {
            const results = [
                createTestResult({ stabilityScore: createStabilityScore({ grade: 'F' }) }),
                createTestResult({ testId: 'test-2', stabilityScore: createStabilityScore({ grade: 'F' }) }),
            ];
            const result = evaluator.evaluate({ minStabilityGrade: 'D' }, results);
            const rule = result.rules.find(r => r.rule === 'minStabilityGrade');
            (0, vitest_1.expect)(rule?.passed).toBe(false);
            (0, vitest_1.expect)(rule?.actual).toBe('F');
        });
        (0, vitest_1.it)('skips when no tests have stability grades', () => {
            const results = [
                createTestResult(),
                createTestResult({ testId: 'test-2' }),
            ];
            const result = evaluator.evaluate({ minStabilityGrade: 'B' }, results);
            const rule = result.rules.find(r => r.rule === 'minStabilityGrade');
            (0, vitest_1.expect)(rule?.skipped).toBe(true);
            (0, vitest_1.expect)(rule?.passed).toBe(true);
            (0, vitest_1.expect)(rule?.actual).toBe('N/A');
        });
        (0, vitest_1.it)('ignores tests without stability scores in average calculation', () => {
            const results = [
                createTestResult({ stabilityScore: createStabilityScore({ grade: 'A' }) }),
                createTestResult({ testId: 'test-2' }), // no score — ignored
            ];
            const result = evaluator.evaluate({ minStabilityGrade: 'A' }, results);
            const rule = result.rules.find(r => r.rule === 'minStabilityGrade');
            (0, vitest_1.expect)(rule?.passed).toBe(true);
            (0, vitest_1.expect)(rule?.actual).toBe('A');
        });
    });
    // ── noNewFailures ────────────────────────────────────────────────────
    (0, vitest_1.describe)('noNewFailures', () => {
        (0, vitest_1.it)('passes when comparison has no new failures', () => {
            const comparison = createComparison();
            const result = evaluator.evaluate({ noNewFailures: true }, [createTestResult()], comparison);
            const rule = result.rules.find(r => r.rule === 'noNewFailures');
            (0, vitest_1.expect)(rule?.passed).toBe(true);
            (0, vitest_1.expect)(rule?.actual).toBe('0');
        });
        (0, vitest_1.it)('fails when comparison has new failures', () => {
            const comparison = createComparison({
                changes: {
                    newFailures: [createTestResult({ status: 'failed' })],
                    fixedTests: [],
                    newTests: [],
                    regressions: [],
                    improvements: [],
                },
            });
            const result = evaluator.evaluate({ noNewFailures: true }, [createTestResult()], comparison);
            (0, vitest_1.expect)(result.passed).toBe(false);
            const rule = result.rules.find(r => r.rule === 'noNewFailures');
            (0, vitest_1.expect)(rule?.passed).toBe(false);
            (0, vitest_1.expect)(rule?.actual).toBe('1');
        });
        (0, vitest_1.it)('is skipped when no comparison data is provided', () => {
            const result = evaluator.evaluate({ noNewFailures: true }, [createTestResult()]);
            const rule = result.rules.find(r => r.rule === 'noNewFailures');
            (0, vitest_1.expect)(rule?.skipped).toBe(true);
            (0, vitest_1.expect)(rule?.passed).toBe(true);
            (0, vitest_1.expect)(rule?.actual).toBe('N/A');
        });
        (0, vitest_1.it)('is not evaluated when noNewFailures is false', () => {
            const result = evaluator.evaluate({ noNewFailures: false }, [createTestResult()]);
            const rule = result.rules.find(r => r.rule === 'noNewFailures');
            (0, vitest_1.expect)(rule).toBeUndefined();
        });
    });
    // ── Combined rules ──────────────────────────────────────────────────
    (0, vitest_1.describe)('combined rules', () => {
        (0, vitest_1.it)('passes when all rules pass', () => {
            const results = Array.from({ length: 10 }, (_, i) => createTestResult({
                testId: `test-${i}`,
                status: 'passed',
                outcome: 'expected',
                stabilityScore: createStabilityScore({ grade: 'A' }),
            }));
            const comparison = createComparison();
            const config = {
                maxFailures: 0,
                minPassRate: 100,
                maxFlakyRate: 0,
                minStabilityGrade: 'A',
                noNewFailures: true,
            };
            const result = evaluator.evaluate(config, results, comparison);
            (0, vitest_1.expect)(result.passed).toBe(true);
            (0, vitest_1.expect)(result.rules.length).toBe(5);
            (0, vitest_1.expect)(result.rules.every(r => r.passed)).toBe(true);
        });
        (0, vitest_1.it)('fails when some rules fail', () => {
            const results = [
                createTestResult({ status: 'passed', outcome: 'expected' }),
                createTestResult({ testId: 'test-2', status: 'failed', outcome: 'unexpected' }),
                createTestResult({ testId: 'test-3', status: 'passed', outcome: 'flaky' }),
            ];
            const config = {
                maxFailures: 0, // will fail (1 failure)
                minPassRate: 90, // will fail (66%)
                maxFlakyRate: 50, // will pass (33%)
            };
            const result = evaluator.evaluate(config, results);
            (0, vitest_1.expect)(result.passed).toBe(false);
            const failedRules = result.rules.filter(r => !r.passed);
            (0, vitest_1.expect)(failedRules.length).toBe(2);
        });
        (0, vitest_1.it)('passes when some rules are skipped but none fail', () => {
            const results = [
                createTestResult({ status: 'passed', outcome: 'expected' }),
            ];
            const config = {
                maxFailures: 5,
                noNewFailures: true, // will be skipped (no comparison)
                minStabilityGrade: 'C', // will be skipped (no grades)
            };
            const result = evaluator.evaluate(config, results);
            (0, vitest_1.expect)(result.passed).toBe(true);
            const skippedRules = result.rules.filter(r => r.skipped);
            (0, vitest_1.expect)(skippedRules.length).toBe(2);
        });
        (0, vitest_1.it)('reports mixed pass/fail/skip correctly', () => {
            const results = [
                createTestResult({ status: 'passed', outcome: 'expected' }),
                createTestResult({ testId: 'test-2', status: 'failed', outcome: 'unexpected' }),
            ];
            const config = {
                maxFailures: 0, // fail
                minPassRate: 50, // pass
                noNewFailures: true, // skip (no comparison)
            };
            const result = evaluator.evaluate(config, results);
            (0, vitest_1.expect)(result.passed).toBe(false);
            const maxFailRule = result.rules.find(r => r.rule === 'maxFailures');
            const passRateRule = result.rules.find(r => r.rule === 'minPassRate');
            const newFailRule = result.rules.find(r => r.rule === 'noNewFailures');
            (0, vitest_1.expect)(maxFailRule?.passed).toBe(false);
            (0, vitest_1.expect)(passRateRule?.passed).toBe(true);
            (0, vitest_1.expect)(newFailRule?.skipped).toBe(true);
            (0, vitest_1.expect)(newFailRule?.passed).toBe(true);
        });
    });
    // ── Edge cases ──────────────────────────────────────────────────────
    (0, vitest_1.describe)('edge cases', () => {
        (0, vitest_1.it)('handles empty results array with all rules configured', () => {
            const config = {
                maxFailures: 0,
                minPassRate: 90,
                maxFlakyRate: 5,
                minStabilityGrade: 'B',
                noNewFailures: true,
            };
            const result = evaluator.evaluate(config, []);
            (0, vitest_1.expect)(result.passed).toBe(true);
            // maxFailures: 0 failures -> pass
            // minPassRate: 0% but 0 total -> pass (no tests to fail)
            // maxFlakyRate: 0% -> pass
            // minStabilityGrade: no graded tests -> skip
            // noNewFailures: no comparison -> skip
        });
        (0, vitest_1.it)('handles all skipped tests', () => {
            const results = [
                createTestResult({ status: 'skipped', outcome: 'skipped' }),
                createTestResult({ testId: 'test-2', status: 'skipped', outcome: 'skipped' }),
            ];
            const config = {
                maxFailures: 0,
                minPassRate: 90,
            };
            const result = evaluator.evaluate(config, results);
            // maxFailures: 0 unexpected failures -> pass
            const maxFailRule = result.rules.find(r => r.rule === 'maxFailures');
            (0, vitest_1.expect)(maxFailRule?.passed).toBe(true);
        });
        (0, vitest_1.it)('handles results without outcome field', () => {
            const results = [
                createTestResult({ status: 'passed' }),
                createTestResult({ testId: 'test-2', status: 'failed' }),
            ];
            const config = {
                maxFailures: 5,
                minPassRate: 50,
            };
            const result = evaluator.evaluate(config, results);
            // Without outcome, maxFailures should count 0 (needs outcome === 'unexpected')
            const maxFailRule = result.rules.find(r => r.rule === 'maxFailures');
            (0, vitest_1.expect)(maxFailRule?.passed).toBe(true);
            (0, vitest_1.expect)(maxFailRule?.actual).toBe('0');
            // minPassRate: 'passed' status counts
            const passRateRule = result.rules.find(r => r.rule === 'minPassRate');
            (0, vitest_1.expect)(passRateRule?.passed).toBe(true);
            (0, vitest_1.expect)(passRateRule?.actual).toBe('50%');
        });
        (0, vitest_1.it)('computes correct percentages with rounding', () => {
            // 1 of 3 = 33.33...%
            const results = [
                createTestResult({ testId: 't1', status: 'passed', outcome: 'expected' }),
                createTestResult({ testId: 't2', status: 'failed', outcome: 'unexpected' }),
                createTestResult({ testId: 't3', status: 'failed', outcome: 'unexpected' }),
            ];
            const result = evaluator.evaluate({ minPassRate: 34 }, results);
            const rule = result.rules.find(r => r.rule === 'minPassRate');
            (0, vitest_1.expect)(rule?.passed).toBe(false);
            // 33% < 34%
            (0, vitest_1.expect)(rule?.actual).toBe('33%');
        });
    });
});
