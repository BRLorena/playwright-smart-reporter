import type { TestResult } from '@playwright/test/reporter';
import type { StepData } from '../types';
/**
 * Options for step collection
 */
export interface StepCollectorOptions {
    /**
     * When true, filters out pw:api steps and only shows test.step entries.
     * Useful when you have custom test.step descriptions and don't want the
     * verbose Playwright API calls cluttering the step list.
     * Default: false (show all steps)
     */
    filterPwApiSteps?: boolean;
}
/**
 * Extracts and processes step timing data from test results
 */
export declare class StepCollector {
    private options;
    constructor(options?: StepCollectorOptions);
    /**
     * Extract step timings from a test result
     * @param result - Playwright TestResult
     * @returns Array of step data with durations and categories
     */
    extractSteps(result: TestResult): StepData[];
    /**
     * Calculate total duration of all steps
     * @param steps - Array of step data
     * @returns Total duration in milliseconds
     */
    getTotalStepDuration(steps: StepData[]): number;
    /**
     * Get slowest step
     * @param steps - Array of step data
     * @returns Slowest step or null if no steps
     */
    getSlowestStep(steps: StepData[]): StepData | null;
}
