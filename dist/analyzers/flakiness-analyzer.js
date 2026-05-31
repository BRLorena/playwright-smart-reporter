"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlakinessAnalyzer = void 0;
/**
 * Analyzes test flakiness based on historical pass/fail patterns
 */
class FlakinessAnalyzer {
    constructor(thresholds) {
        this.stableThreshold = thresholds?.flakinessStable ?? 0.1;
        this.unstableThreshold = thresholds?.flakinessUnstable ?? 0.3;
    }
    /**
     * Calculate flakiness score and indicator for a test
     * @param test - The test result to analyze
     * @param history - Historical test results for this test
     */
    analyze(test, history) {
        // For skipped tests, set a special indicator
        if (test.status === 'skipped') {
            test.flakinessIndicator = '⚪ Skipped';
            return;
        }
        if (history.length === 0) {
            test.flakinessIndicator = '⚪ New';
            return;
        }
        // Filter out skipped runs for flakiness calculation
        const relevantHistory = history.filter(e => !e.skipped);
        if (relevantHistory.length === 0) {
            // All history entries were skipped — not actually new
            test.flakinessIndicator = '⚪ Skipped';
            return;
        }
        const failures = relevantHistory.filter(e => !e.passed).length;
        const flakinessScore = Math.round((failures / relevantHistory.length) * 100) / 100; // 2 decimal places
        test.flakinessScore = flakinessScore;
        test.flakinessIndicator = this.getFlakinessIndicator(flakinessScore);
    }
    /**
     * Get human-readable flakiness indicator
     */
    getFlakinessIndicator(score) {
        if (score < this.stableThreshold)
            return '🟢 Stable';
        if (score < this.unstableThreshold)
            return '🟡 Unstable';
        return '🔴 Flaky';
    }
    /**
     * Get flakiness status for filtering
     */
    getStatus(score) {
        if (score === undefined)
            return 'new';
        if (score < this.stableThreshold)
            return 'stable';
        if (score < this.unstableThreshold)
            return 'unstable';
        return 'flaky';
    }
}
exports.FlakinessAnalyzer = FlakinessAnalyzer;
