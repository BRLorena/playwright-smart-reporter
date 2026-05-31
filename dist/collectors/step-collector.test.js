"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const step_collector_1 = require("./step-collector");
function makeStep(title, duration, category, nestedSteps = []) {
    return {
        title,
        duration,
        category,
        steps: nestedSteps,
        startTime: new Date(),
        location: undefined,
        error: undefined,
        parent: undefined,
        titlePath: () => [title],
        annotations: [],
        attachments: [],
    };
}
function makeTestResult(steps) {
    return {
        steps,
        attachments: [],
        annotations: [],
        status: 'passed',
        duration: 1000,
        startTime: new Date(),
        retry: 0,
        parallelIndex: 0,
        workerIndex: 0,
        errors: [],
        stderr: [],
        stdout: [],
    };
}
(0, vitest_1.describe)('StepCollector', () => {
    (0, vitest_1.describe)('extractSteps', () => {
        (0, vitest_1.it)('extracts basic steps from a test result', () => {
            const result = makeTestResult([
                makeStep('Click button', 50, 'pw:api'),
                makeStep('Fill form', 80, 'pw:api'),
            ]);
            const collector = new step_collector_1.StepCollector();
            const steps = collector.extractSteps(result);
            (0, vitest_1.expect)(steps).toHaveLength(2);
            (0, vitest_1.expect)(steps[0]).toEqual({
                title: 'Click button',
                duration: 50,
                category: 'pw:api',
            });
            (0, vitest_1.expect)(steps[1]).toEqual({
                title: 'Fill form',
                duration: 80,
                category: 'pw:api',
            });
        });
        (0, vitest_1.it)('returns empty array when result has no steps', () => {
            const result = makeTestResult([]);
            const collector = new step_collector_1.StepCollector();
            const steps = collector.extractSteps(result);
            (0, vitest_1.expect)(steps).toEqual([]);
        });
        (0, vitest_1.it)('includes test.step category steps regardless of filter', () => {
            const result = makeTestResult([
                makeStep('Login step', 200, 'test.step'),
                makeStep('page.click', 30, 'pw:api'),
            ]);
            const collector = new step_collector_1.StepCollector({ filterPwApiSteps: true });
            const steps = collector.extractSteps(result);
            (0, vitest_1.expect)(steps).toHaveLength(1);
            (0, vitest_1.expect)(steps[0].title).toBe('Login step');
            (0, vitest_1.expect)(steps[0].category).toBe('test.step');
        });
        (0, vitest_1.it)('includes pw:api steps when filterPwApiSteps is false', () => {
            const result = makeTestResult([
                makeStep('Login step', 200, 'test.step'),
                makeStep('page.click', 30, 'pw:api'),
            ]);
            const collector = new step_collector_1.StepCollector({ filterPwApiSteps: false });
            const steps = collector.extractSteps(result);
            (0, vitest_1.expect)(steps).toHaveLength(2);
        });
        (0, vitest_1.it)('includes pw:api steps by default', () => {
            const result = makeTestResult([
                makeStep('page.goto', 100, 'pw:api'),
            ]);
            const collector = new step_collector_1.StepCollector();
            const steps = collector.extractSteps(result);
            (0, vitest_1.expect)(steps).toHaveLength(1);
        });
        (0, vitest_1.it)('filters out pw:api steps when filterPwApiSteps is true', () => {
            const result = makeTestResult([
                makeStep('page.click', 30, 'pw:api'),
                makeStep('page.fill', 20, 'pw:api'),
                makeStep('Login', 100, 'test.step'),
            ]);
            const collector = new step_collector_1.StepCollector({ filterPwApiSteps: true });
            const steps = collector.extractSteps(result);
            (0, vitest_1.expect)(steps).toHaveLength(1);
            (0, vitest_1.expect)(steps[0].title).toBe('Login');
        });
        (0, vitest_1.it)('skips internal hook steps', () => {
            const result = makeTestResult([
                makeStep('Before Hooks', 10, 'hook'),
                makeStep('page.goto', 50, 'pw:api'),
                makeStep('After Hooks', 5, 'hook'),
            ]);
            const collector = new step_collector_1.StepCollector();
            const steps = collector.extractSteps(result);
            (0, vitest_1.expect)(steps).toHaveLength(1);
            (0, vitest_1.expect)(steps[0].title).toBe('page.goto');
        });
        (0, vitest_1.it)('walks nested steps recursively', () => {
            const nested = makeStep('page.fill', 20, 'pw:api');
            const parent = makeStep('Fill form', 50, 'test.step', [nested]);
            const result = makeTestResult([parent]);
            const collector = new step_collector_1.StepCollector();
            const steps = collector.extractSteps(result);
            (0, vitest_1.expect)(steps).toHaveLength(2);
            (0, vitest_1.expect)(steps[0].title).toBe('Fill form');
            (0, vitest_1.expect)(steps[1].title).toBe('page.fill');
        });
        (0, vitest_1.it)('walks deeply nested steps', () => {
            const deepChild = makeStep('locator.click', 10, 'pw:api');
            const child = makeStep('page.locator', 30, 'pw:api', [deepChild]);
            const parent = makeStep('Interaction', 60, 'test.step', [child]);
            const result = makeTestResult([parent]);
            const collector = new step_collector_1.StepCollector();
            const steps = collector.extractSteps(result);
            (0, vitest_1.expect)(steps).toHaveLength(3);
            (0, vitest_1.expect)(steps[0].title).toBe('Interaction');
            (0, vitest_1.expect)(steps[1].title).toBe('page.locator');
            (0, vitest_1.expect)(steps[2].title).toBe('locator.click');
        });
        (0, vitest_1.it)('marks the slowest step when its duration exceeds 100ms', () => {
            const result = makeTestResult([
                makeStep('Fast step', 50, 'pw:api'),
                makeStep('Slow step', 500, 'pw:api'),
                makeStep('Medium step', 80, 'pw:api'),
            ]);
            const collector = new step_collector_1.StepCollector();
            const steps = collector.extractSteps(result);
            (0, vitest_1.expect)(steps[0].isSlowest).toBeUndefined();
            (0, vitest_1.expect)(steps[1].isSlowest).toBe(true);
            (0, vitest_1.expect)(steps[2].isSlowest).toBeUndefined();
        });
        (0, vitest_1.it)('does not mark slowest step when all steps are under 100ms', () => {
            const result = makeTestResult([
                makeStep('Step A', 30, 'pw:api'),
                makeStep('Step B', 50, 'pw:api'),
                makeStep('Step C', 90, 'pw:api'),
            ]);
            const collector = new step_collector_1.StepCollector();
            const steps = collector.extractSteps(result);
            (0, vitest_1.expect)(steps.every(s => s.isSlowest === undefined)).toBe(true);
        });
        (0, vitest_1.it)('marks slowest step when exactly 101ms', () => {
            const result = makeTestResult([
                makeStep('Step A', 50, 'pw:api'),
                makeStep('Step B', 101, 'pw:api'),
            ]);
            const collector = new step_collector_1.StepCollector();
            const steps = collector.extractSteps(result);
            (0, vitest_1.expect)(steps[1].isSlowest).toBe(true);
        });
        (0, vitest_1.it)('does not mark slowest step at exactly 100ms', () => {
            const result = makeTestResult([
                makeStep('Step A', 50, 'pw:api'),
                makeStep('Step B', 100, 'pw:api'),
            ]);
            const collector = new step_collector_1.StepCollector();
            const steps = collector.extractSteps(result);
            (0, vitest_1.expect)(steps.every(s => s.isSlowest === undefined)).toBe(true);
        });
    });
    (0, vitest_1.describe)('getTotalStepDuration', () => {
        (0, vitest_1.it)('sums all step durations', () => {
            const collector = new step_collector_1.StepCollector();
            const steps = [
                { title: 'A', duration: 100, category: 'pw:api' },
                { title: 'B', duration: 200, category: 'pw:api' },
                { title: 'C', duration: 300, category: 'test.step' },
            ];
            (0, vitest_1.expect)(collector.getTotalStepDuration(steps)).toBe(600);
        });
        (0, vitest_1.it)('returns 0 for empty steps', () => {
            const collector = new step_collector_1.StepCollector();
            (0, vitest_1.expect)(collector.getTotalStepDuration([])).toBe(0);
        });
    });
    (0, vitest_1.describe)('getSlowestStep', () => {
        (0, vitest_1.it)('returns the step marked as slowest', () => {
            const collector = new step_collector_1.StepCollector();
            const steps = [
                { title: 'Fast', duration: 10, category: 'pw:api' },
                { title: 'Slow', duration: 500, category: 'pw:api', isSlowest: true },
            ];
            (0, vitest_1.expect)(collector.getSlowestStep(steps)).toEqual(steps[1]);
        });
        (0, vitest_1.it)('returns null when no steps exist', () => {
            const collector = new step_collector_1.StepCollector();
            (0, vitest_1.expect)(collector.getSlowestStep([])).toBeNull();
        });
        (0, vitest_1.it)('returns null when no step is marked as slowest', () => {
            const collector = new step_collector_1.StepCollector();
            const steps = [
                { title: 'A', duration: 50, category: 'pw:api' },
                { title: 'B', duration: 80, category: 'pw:api' },
            ];
            (0, vitest_1.expect)(collector.getSlowestStep(steps)).toBeNull();
        });
    });
});
