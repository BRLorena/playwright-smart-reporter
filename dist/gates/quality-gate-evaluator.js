"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QualityGateEvaluator = void 0;
const gradeMap = { A: 5, B: 4, C: 3, D: 2, F: 1 };
const reverseGradeMap = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'F' };
class QualityGateEvaluator {
    evaluate(config, results, comparison) {
        const rules = [];
        if (config.maxFailures !== undefined) {
            rules.push(this.evaluateMaxFailures(config.maxFailures, results));
        }
        if (config.minPassRate !== undefined) {
            rules.push(this.evaluateMinPassRate(config.minPassRate, results));
        }
        if (config.maxFlakyRate !== undefined) {
            rules.push(this.evaluateMaxFlakyRate(config.maxFlakyRate, results));
        }
        if (config.minStabilityGrade !== undefined) {
            rules.push(this.evaluateMinStabilityGrade(config.minStabilityGrade, results));
        }
        if (config.noNewFailures === true) {
            rules.push(this.evaluateNoNewFailures(comparison));
        }
        const passed = rules.every(r => r.passed);
        return { passed, rules };
    }
    evaluateMaxFailures(threshold, results) {
        const failures = results.filter(r => r.outcome === 'unexpected' && (r.status === 'failed' || r.status === 'timedOut')).length;
        return {
            rule: 'maxFailures',
            passed: failures <= threshold,
            actual: String(failures),
            threshold: `≤ ${threshold}`,
        };
    }
    evaluateMinPassRate(threshold, results) {
        const total = results.length;
        if (total === 0) {
            return {
                rule: 'minPassRate',
                passed: true,
                actual: '0%',
                threshold: `≥ ${threshold}%`,
            };
        }
        const passed = results.filter(r => r.status === 'passed' || r.outcome === 'expected' || r.outcome === 'flaky').length;
        const rate = Math.round((passed / total) * 100);
        return {
            rule: 'minPassRate',
            passed: rate >= threshold,
            actual: `${rate}%`,
            threshold: `≥ ${threshold}%`,
        };
    }
    evaluateMaxFlakyRate(threshold, results) {
        const total = results.length;
        if (total === 0) {
            return {
                rule: 'maxFlakyRate',
                passed: true,
                actual: '0%',
                threshold: `≤ ${threshold}%`,
            };
        }
        const flaky = results.filter(r => r.outcome === 'flaky').length;
        const rate = Math.round((flaky / total) * 100);
        return {
            rule: 'maxFlakyRate',
            passed: rate <= threshold,
            actual: `${rate}%`,
            threshold: `≤ ${threshold}%`,
        };
    }
    evaluateMinStabilityGrade(threshold, results) {
        const gradedTests = results.filter(r => r.stabilityScore?.grade);
        if (gradedTests.length === 0) {
            return {
                rule: 'minStabilityGrade',
                passed: true,
                actual: 'N/A',
                threshold: `≥ ${threshold}`,
                skipped: true,
            };
        }
        const sum = gradedTests.reduce((acc, r) => acc + (gradeMap[r.stabilityScore.grade] || 0), 0);
        const avgNumeric = Math.round(sum / gradedTests.length);
        const avgGrade = reverseGradeMap[avgNumeric] || 'F';
        const thresholdNumeric = gradeMap[threshold];
        const actualNumeric = gradeMap[avgGrade] || 0;
        return {
            rule: 'minStabilityGrade',
            passed: actualNumeric >= thresholdNumeric,
            actual: avgGrade,
            threshold: `≥ ${threshold}`,
        };
    }
    evaluateNoNewFailures(comparison) {
        if (!comparison) {
            return {
                rule: 'noNewFailures',
                passed: true,
                actual: 'N/A',
                threshold: 'new failures',
                skipped: true,
            };
        }
        const newFailureCount = comparison.changes.newFailures.length;
        return {
            rule: 'noNewFailures',
            passed: newFailureCount === 0,
            actual: String(newFailureCount),
            threshold: 'new failures',
        };
    }
}
exports.QualityGateEvaluator = QualityGateEvaluator;
