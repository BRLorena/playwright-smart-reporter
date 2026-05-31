import type { TestResultData, StabilityScore, SuiteStats, ThresholdConfig } from '../types';
/**
 * Calculates comprehensive stability scores for tests and test suites
 */
export declare class StabilityScorer {
    private stabilityThreshold;
    private weightFlakiness;
    private weightPerformance;
    private weightReliability;
    private gradeA;
    private gradeB;
    private gradeC;
    private gradeD;
    constructor(stabilityThreshold?: number, thresholds?: ThresholdConfig);
    /**
     * Calculate stability score for a single test
     */
    scoreTest(test: TestResultData): void;
    /**
     * Calculate flakiness component (0-100, higher is better)
     */
    private calculateFlakinessScore;
    /**
     * Calculate performance component (0-100, higher is better)
     */
    private calculatePerformanceScore;
    /**
     * Calculate reliability component (0-100, higher is better)
     */
    private calculateReliabilityScore;
    /**
     * Convert numeric score to letter grade
     */
    private getGrade;
    /**
     * Calculate suite-wide statistics
     */
    calculateSuiteStats(results: TestResultData[]): SuiteStats;
    /**
     * Get tests that need attention based on stability score
     */
    getProblematicTests(results: TestResultData[]): TestResultData[];
    /**
     * Get stability summary string
     */
    getSummary(score: StabilityScore): string;
}
