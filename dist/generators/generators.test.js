"use strict";
/**
 * Smoke tests for generators
 * Verifies that generators don't crash with various inputs
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const html_generator_1 = require("./html-generator");
const card_generator_1 = require("./card-generator");
const chart_generator_1 = require("./chart-generator");
const gallery_generator_1 = require("./gallery-generator");
const comparison_generator_1 = require("./comparison-generator");
// Test fixtures
const createMinimalTestResult = (overrides = {}) => ({
    testId: 'test-1',
    title: 'Test One',
    file: 'tests/example.spec.ts',
    status: 'passed',
    duration: 1000,
    retry: 0,
    steps: [],
    history: [],
    ...overrides,
});
const createTestHistory = () => ({
    runs: [],
    tests: {},
    summaries: [],
});
const createRunSummary = (overrides = {}) => ({
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
});
(0, vitest_1.describe)('html-generator', () => {
    (0, vitest_1.describe)('generateHtml', () => {
        (0, vitest_1.it)('returns HTML string with minimal data', () => {
            const data = {
                results: [],
                history: createTestHistory(),
                startTime: Date.now(),
                options: {},
            };
            const { html } = (0, html_generator_1.generateHtml)(data);
            (0, vitest_1.expect)(typeof html).toBe('string');
            (0, vitest_1.expect)(html).toContain('<!DOCTYPE html>');
            (0, vitest_1.expect)(html).toContain('</html>');
        });
        (0, vitest_1.it)('handles single passed test', () => {
            const data = {
                results: [createMinimalTestResult()],
                history: createTestHistory(),
                startTime: Date.now(),
                options: {},
            };
            const { html } = (0, html_generator_1.generateHtml)(data);
            (0, vitest_1.expect)(html).toContain('Test One');
            (0, vitest_1.expect)(html).toContain('passed');
        });
        (0, vitest_1.it)('handles mixed test results', () => {
            const data = {
                results: [
                    createMinimalTestResult({ testId: '1', status: 'passed' }),
                    createMinimalTestResult({ testId: '2', status: 'failed', error: 'Test error' }),
                    createMinimalTestResult({ testId: '3', status: 'skipped' }),
                ],
                history: createTestHistory(),
                startTime: Date.now(),
                options: {},
            };
            const { html } = (0, html_generator_1.generateHtml)(data);
            (0, vitest_1.expect)(html).toContain('passed');
            (0, vitest_1.expect)(html).toContain('failed');
            (0, vitest_1.expect)(html).toContain('skipped');
        });
        (0, vitest_1.it)('handles test with history entries', () => {
            const data = {
                results: [
                    createMinimalTestResult({
                        history: [
                            { passed: true, duration: 900, timestamp: '2024-01-01T00:00:00Z' },
                            { passed: false, duration: 1100, timestamp: '2024-01-02T00:00:00Z' },
                        ],
                    }),
                ],
                history: {
                    runs: [],
                    tests: { 'test-1': [{ passed: true, duration: 900, timestamp: '2024-01-01T00:00:00Z' }] },
                    summaries: [createRunSummary()],
                },
                startTime: Date.now(),
                options: {},
            };
            const { html } = (0, html_generator_1.generateHtml)(data);
            (0, vitest_1.expect)(html).toContain('Test One');
        });
        (0, vitest_1.it)('handles flaky tests', () => {
            const data = {
                results: [
                    createMinimalTestResult({
                        flakinessScore: 0.5,
                        flakinessIndicator: 'Flaky',
                    }),
                ],
                history: createTestHistory(),
                startTime: Date.now(),
                options: {},
            };
            const { html } = (0, html_generator_1.generateHtml)(data);
            (0, vitest_1.expect)(html).toContain('Flaky');
        });
        (0, vitest_1.it)('handles tests with screenshots', () => {
            const data = {
                results: [
                    createMinimalTestResult({
                        status: 'failed',
                        screenshot: 'data:image/png;base64,abc123',
                    }),
                ],
                history: createTestHistory(),
                startTime: Date.now(),
                options: {},
            };
            const { html } = (0, html_generator_1.generateHtml)(data);
            (0, vitest_1.expect)(html).toContain('data:image/png;base64,abc123');
        });
        (0, vitest_1.it)('handles comparison data', () => {
            const comparison = {
                baselineRun: createRunSummary({ runId: 'baseline', passRate: 70 }),
                currentRun: createRunSummary({ runId: 'current', passRate: 80 }),
                changes: {
                    newFailures: [],
                    fixedTests: [],
                    newTests: [],
                    regressions: [],
                    improvements: [],
                },
            };
            const data = {
                results: [createMinimalTestResult()],
                history: createTestHistory(),
                startTime: Date.now(),
                options: {},
                comparison,
            };
            const { html } = (0, html_generator_1.generateHtml)(data);
            (0, vitest_1.expect)(html).toContain('Test One');
        });
        (0, vitest_1.it)('escapes HTML in test titles', () => {
            const data = {
                results: [
                    createMinimalTestResult({
                        title: '<script>alert("xss")</script>',
                    }),
                ],
                history: createTestHistory(),
                startTime: Date.now(),
                options: {},
            };
            const { html } = (0, html_generator_1.generateHtml)(data);
            (0, vitest_1.expect)(html).not.toContain('<script>alert("xss")</script>');
            (0, vitest_1.expect)(html).toContain('&lt;script&gt;');
        });
        // Issue #19: Large test suites should not crash with RangeError
        (0, vitest_1.it)('strips large base64 data from embedded JSON to prevent RangeError', () => {
            // Create a large base64 string (simulating a screenshot)
            const largeBase64 = 'data:image/png;base64,' + 'A'.repeat(100000);
            const data = {
                results: [
                    createMinimalTestResult({
                        screenshot: largeBase64,
                        traceData: 'base64-trace-data-here',
                        attachments: {
                            screenshots: [largeBase64, largeBase64],
                            videos: ['/path/to/video.webm'],
                            traces: ['/path/to/trace.zip'],
                            custom: [{ name: 'custom', contentType: 'text/plain', body: 'base64body' }],
                        },
                    }),
                ],
                history: createTestHistory(),
                startTime: Date.now(),
                options: {},
            };
            const { html } = (0, html_generator_1.generateHtml)(data);
            // The HTML should be generated successfully
            (0, vitest_1.expect)(html).toContain('<!DOCTYPE html>');
            (0, vitest_1.expect)(html).toContain('</html>');
            // Extract the JavaScript section that contains "const tests = "
            const jsMatch = html.match(/const tests = (\[[\s\S]*?\]);/);
            (0, vitest_1.expect)(jsMatch).toBeTruthy();
            const testsJson = jsMatch[1];
            // The embedded JSON should NOT contain the large base64 data
            (0, vitest_1.expect)(testsJson).not.toContain('AAAAAAAAAAAAAAAAA'); // Large base64 content
            (0, vitest_1.expect)(testsJson).toContain('[base64-screenshot]'); // Placeholder
            (0, vitest_1.expect)(testsJson).toContain('[base64-content]'); // Placeholder for custom attachment body
            // But file paths should be preserved in JSON
            (0, vitest_1.expect)(testsJson).toContain('/path/to/video.webm');
            (0, vitest_1.expect)(testsJson).toContain('/path/to/trace.zip');
            // Note: The full base64 may still appear in HTML cards for rendering
            // That's intentional - we only strip from JSON to reduce size
        });
        (0, vitest_1.it)('handles many tests without exceeding string limits', () => {
            // Create 100 tests with screenshots (simulating a medium-sized suite)
            const results = Array.from({ length: 100 }, (_, i) => createMinimalTestResult({
                testId: `test-${i}`,
                title: `Test ${i}`,
                screenshot: 'data:image/png;base64,' + 'B'.repeat(10000),
            }));
            const data = {
                results,
                history: createTestHistory(),
                startTime: Date.now(),
                options: {},
            };
            // Should not throw RangeError
            const { html } = (0, html_generator_1.generateHtml)(data);
            (0, vitest_1.expect)(html).toContain('<!DOCTYPE html>');
            (0, vitest_1.expect)(html).toContain('Test 0');
            (0, vitest_1.expect)(html).toContain('Test 99');
            // Extract the JavaScript section that contains "const tests = "
            const jsMatch = html.match(/const tests = (\[[\s\S]*?\]);/);
            (0, vitest_1.expect)(jsMatch).toBeTruthy();
            const testsJson = jsMatch[1];
            // Large base64 data should be stripped from embedded JSON
            (0, vitest_1.expect)(testsJson).not.toContain('BBBBBBBBBBBBBBBBB');
            // Should use placeholder instead
            (0, vitest_1.expect)(testsJson).toContain('[base64-screenshot]');
        });
        (0, vitest_1.it)('renders AI suite health summary when provided', () => {
            const data = {
                results: [createMinimalTestResult()],
                history: createTestHistory(),
                startTime: Date.now(),
                options: {},
                licenseTier: 'pro',
                aiSuiteHealthSummary: 'Your suite is healthy with a 90% pass rate.',
            };
            const { html } = (0, html_generator_1.generateHtml)(data);
            (0, vitest_1.expect)(html).toContain('AI Health Summary');
            (0, vitest_1.expect)(html).toContain('Your suite is healthy with a 90% pass rate.');
            (0, vitest_1.expect)(html).toContain('ai-health-card');
            (0, vitest_1.expect)(html).toContain('>Starter</span>');
        });
        (0, vitest_1.it)('renders AI suite health summary for starter tier', () => {
            const data = {
                results: [createMinimalTestResult()],
                history: createTestHistory(),
                startTime: Date.now(),
                options: {},
                licenseTier: 'starter',
                aiSuiteHealthSummary: 'Suite looks good.',
            };
            const { html } = (0, html_generator_1.generateHtml)(data);
            (0, vitest_1.expect)(html).toContain('AI Health Summary');
            (0, vitest_1.expect)(html).toContain('Suite looks good.');
            (0, vitest_1.expect)(html).toContain('>Starter</span>');
        });
        (0, vitest_1.it)('shows placeholder for community tier without AI summary', () => {
            const data = {
                results: [createMinimalTestResult()],
                history: createTestHistory(),
                startTime: Date.now(),
                options: {},
                licenseTier: 'community',
            };
            const { html } = (0, html_generator_1.generateHtml)(data);
            (0, vitest_1.expect)(html).toContain('ai-health-card pro-feature-placeholder');
            (0, vitest_1.expect)(html).toContain('AI-powered executive summary');
        });
        (0, vitest_1.it)('does not render AI health section for pro tier without summary', () => {
            const data = {
                results: [createMinimalTestResult()],
                history: createTestHistory(),
                startTime: Date.now(),
                options: {},
                licenseTier: 'pro',
            };
            const { html } = (0, html_generator_1.generateHtml)(data);
            // CSS will have the class names, but the overview content should not have the card
            (0, vitest_1.expect)(html).not.toContain('AI Health Summary</span>');
            (0, vitest_1.expect)(html).not.toContain('AI-powered executive summary');
        });
    });
});
(0, vitest_1.describe)('CSP-safe mode', () => {
    (0, vitest_1.it)('returns GeneratedReport with css and js fields when cspSafe is true', () => {
        const data = {
            results: [createMinimalTestResult()],
            history: createTestHistory(),
            startTime: Date.now(),
            options: { cspSafe: true },
            outputBasename: 'test-report',
        };
        const report = (0, html_generator_1.generateHtml)(data);
        (0, vitest_1.expect)(report.html).toContain('<!DOCTYPE html>');
        (0, vitest_1.expect)(report.css).toBeDefined();
        (0, vitest_1.expect)(typeof report.css).toBe('string');
        (0, vitest_1.expect)(report.css.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(report.js).toBeDefined();
        (0, vitest_1.expect)(typeof report.js).toBe('string');
        (0, vitest_1.expect)(report.js.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('CSP-safe HTML uses external stylesheet link instead of inline style', () => {
        const data = {
            results: [createMinimalTestResult()],
            history: createTestHistory(),
            startTime: Date.now(),
            options: { cspSafe: true, enableTraceViewer: false },
            outputBasename: 'test-report',
        };
        const { html } = (0, html_generator_1.generateHtml)(data);
        (0, vitest_1.expect)(html).toContain('<link rel="stylesheet" href="test-report.css">');
        (0, vitest_1.expect)(html).not.toMatch(/<style>[^<]/);
    });
    (0, vitest_1.it)('CSP-safe HTML uses external script src instead of inline script', () => {
        const data = {
            results: [createMinimalTestResult()],
            history: createTestHistory(),
            startTime: Date.now(),
            options: { cspSafe: true },
            outputBasename: 'test-report',
        };
        const { html } = (0, html_generator_1.generateHtml)(data);
        (0, vitest_1.expect)(html).toContain('<script src="test-report.js" defer></script>');
        (0, vitest_1.expect)(html).toContain('<script type="application/json" id="report-data-tests">');
        (0, vitest_1.expect)(html).toContain('<script type="application/json" id="report-data-stats">');
    });
    (0, vitest_1.it)('CSP-safe JS reads data from DOM JSON tags and does not contain inline data', () => {
        const data = {
            results: [createMinimalTestResult()],
            history: createTestHistory(),
            startTime: Date.now(),
            options: { cspSafe: true },
            outputBasename: 'test-report',
        };
        const report = (0, html_generator_1.generateHtml)(data);
        (0, vitest_1.expect)(report.js).toContain("document.getElementById('report-data-tests')");
        (0, vitest_1.expect)(report.js).toContain("document.getElementById('report-data-stats')");
        // Verify inline data declarations were stripped (not just prepended)
        (0, vitest_1.expect)(report.js).not.toMatch(/const tests = \[/);
    });
    (0, vitest_1.it)('non-CSP mode returns undefined css and js', () => {
        const data = {
            results: [createMinimalTestResult()],
            history: createTestHistory(),
            startTime: Date.now(),
            options: {},
        };
        const report = (0, html_generator_1.generateHtml)(data);
        (0, vitest_1.expect)(report.html).toContain('<!DOCTYPE html>');
        (0, vitest_1.expect)(report.css).toBeUndefined();
        (0, vitest_1.expect)(report.js).toBeUndefined();
    });
    (0, vitest_1.it)('CSP-safe mode strips base64 data from embedded JSON', () => {
        const largeBase64 = 'data:image/png;base64,' + 'A'.repeat(50000);
        const data = {
            results: [createMinimalTestResult({ screenshot: largeBase64 })],
            history: createTestHistory(),
            startTime: Date.now(),
            options: { cspSafe: true },
            outputBasename: 'test-report',
        };
        const report = (0, html_generator_1.generateHtml)(data);
        // Extract the JSON script tag content — should use placeholder, not large base64
        const jsonMatch = report.html.match(/<script type="application\/json" id="report-data-tests">([\s\S]*?)<\/script>/);
        (0, vitest_1.expect)(jsonMatch).toBeTruthy();
        (0, vitest_1.expect)(jsonMatch[1]).toContain('[base64-screenshot]');
        (0, vitest_1.expect)(jsonMatch[1]).not.toContain('AAAAAAAAAAAAAAAAA');
    });
    (0, vitest_1.it)('non-CSP mode has inline style and script tags', () => {
        const data = {
            results: [createMinimalTestResult()],
            history: createTestHistory(),
            startTime: Date.now(),
            options: {},
        };
        const { html } = (0, html_generator_1.generateHtml)(data);
        (0, vitest_1.expect)(html).toContain('<style>');
        (0, vitest_1.expect)(html).not.toContain('<link rel="stylesheet"');
    });
});
(0, vitest_1.describe)('flaky filter', () => {
    (0, vitest_1.it)('marks test as flaky when outcome is flaky even without high flakinessScore', () => {
        const data = {
            results: [createMinimalTestResult({ outcome: 'flaky', flakinessScore: 0.1 })],
            history: createTestHistory(),
            startTime: Date.now(),
            options: {},
        };
        const { html } = (0, html_generator_1.generateHtml)(data);
        (0, vitest_1.expect)(html).toContain('data-flaky="true"');
    });
    (0, vitest_1.it)('marks test as flaky when flakinessScore is high even without flaky outcome', () => {
        const data = {
            results: [createMinimalTestResult({ flakinessScore: 0.5 })],
            history: createTestHistory(),
            startTime: Date.now(),
            options: {},
        };
        const { html } = (0, html_generator_1.generateHtml)(data);
        (0, vitest_1.expect)(html).toContain('data-flaky="true"');
    });
    (0, vitest_1.it)('does not mark test as flaky when neither outcome nor score qualifies', () => {
        const data = {
            results: [createMinimalTestResult({ flakinessScore: 0.1, outcome: 'expected' })],
            history: createTestHistory(),
            startTime: Date.now(),
            options: {},
        };
        const { html } = (0, html_generator_1.generateHtml)(data);
        (0, vitest_1.expect)(html).toContain('data-flaky="false"');
    });
    (0, vitest_1.describe)('live section tier gating', () => {
        (0, vitest_1.it)('adds live-section-gated class to section for community tier', () => {
            const data = {
                results: [],
                history: createTestHistory(),
                startTime: Date.now(),
                options: { live: { enabled: true } },
                licenseTier: 'community',
            };
            const { html } = (0, html_generator_1.generateHtml)(data);
            (0, vitest_1.expect)(html).toContain('view-panel live-section-gated');
            (0, vitest_1.expect)(html).toContain('Starter');
        });
        (0, vitest_1.it)('does not add live-section-gated to section for starter tier', () => {
            const data = {
                results: [],
                history: createTestHistory(),
                startTime: Date.now(),
                options: { live: { enabled: true } },
                licenseTier: 'starter',
            };
            const { html } = (0, html_generator_1.generateHtml)(data);
            // The section element should not have the gated class (CSS definition will still contain the string)
            (0, vitest_1.expect)(html).not.toContain('view-panel live-section-gated');
        });
        (0, vitest_1.it)('renders live section with gated class when live is not configured', () => {
            const data = {
                results: [],
                history: createTestHistory(),
                startTime: Date.now(),
                options: {},
                licenseTier: 'community',
            };
            const { html } = (0, html_generator_1.generateHtml)(data);
            (0, vitest_1.expect)(html).toContain('view-live');
            (0, vitest_1.expect)(html).toContain('live-section-gated');
        });
        (0, vitest_1.it)('does not render live section when live is explicitly disabled', () => {
            const data = {
                results: [],
                history: createTestHistory(),
                startTime: Date.now(),
                options: { live: { enabled: false } },
                licenseTier: 'community',
            };
            const { html } = (0, html_generator_1.generateHtml)(data);
            (0, vitest_1.expect)(html).not.toContain('view-live');
        });
        (0, vitest_1.it)('renders Starter badge on nav tab for community tier', () => {
            const data = {
                results: [],
                history: createTestHistory(),
                startTime: Date.now(),
                options: { live: { enabled: true } },
                licenseTier: 'community',
            };
            const { html } = (0, html_generator_1.generateHtml)(data);
            // The nav button for Live should contain the Starter badge
            const navMatch = html.match(/data-view="live"[\s\S]*?<\/button>/);
            (0, vitest_1.expect)(navMatch).toBeTruthy();
            (0, vitest_1.expect)(navMatch[0]).toContain('Starter');
        });
        (0, vitest_1.it)('does not render Starter badge on nav tab for pro tier', () => {
            const data = {
                results: [],
                history: createTestHistory(),
                startTime: Date.now(),
                options: { live: { enabled: true } },
                licenseTier: 'pro',
            };
            const { html } = (0, html_generator_1.generateHtml)(data);
            const navMatch = html.match(/data-view="live"[\s\S]*?<\/button>/);
            (0, vitest_1.expect)(navMatch).toBeTruthy();
            (0, vitest_1.expect)(navMatch[0]).not.toContain('Starter');
        });
    });
});
(0, vitest_1.describe)('card-generator', () => {
    (0, vitest_1.describe)('generateTestCard', () => {
        (0, vitest_1.it)('generates card for passed test', () => {
            const test = createMinimalTestResult();
            const card = (0, card_generator_1.generateTestCard)(test, false);
            (0, vitest_1.expect)(card).toContain('test-card');
            (0, vitest_1.expect)(card).toContain('Test One');
            (0, vitest_1.expect)(card).toContain('passed');
        });
        (0, vitest_1.it)('generates card for failed test with error', () => {
            const test = createMinimalTestResult({
                status: 'failed',
                error: 'Expected true but got false',
            });
            const card = (0, card_generator_1.generateTestCard)(test, false);
            (0, vitest_1.expect)(card).toContain('failed');
            (0, vitest_1.expect)(card).toContain('expand-icon');
        });
        (0, vitest_1.it)('handles test with stability score', () => {
            const test = createMinimalTestResult({
                stabilityScore: {
                    overall: 85,
                    flakiness: 90,
                    performance: 80,
                    reliability: 85,
                    grade: 'B',
                    needsAttention: false,
                },
            });
            const card = (0, card_generator_1.generateTestCard)(test, false);
            (0, vitest_1.expect)(card).toContain('stability');
            (0, vitest_1.expect)(card).toContain('B');
        });
        (0, vitest_1.it)('handles test with performance trend', () => {
            const test = createMinimalTestResult({
                performanceTrend: '↑ 25% slower',
            });
            const card = (0, card_generator_1.generateTestCard)(test, false);
            (0, vitest_1.expect)(card).toContain('slower');
        });
    });
    (0, vitest_1.describe)('generateTestDetails', () => {
        (0, vitest_1.it)('generates details with steps', () => {
            const test = createMinimalTestResult({
                steps: [
                    { title: 'Click button', duration: 100, category: 'action' },
                    { title: 'Wait for element', duration: 500, category: 'wait', isSlowest: true },
                ],
            });
            const details = (0, card_generator_1.generateTestDetails)(test, 'card-1', false);
            (0, vitest_1.expect)(details).toContain('Click button');
            (0, vitest_1.expect)(details).toContain('Wait for element');
            (0, vitest_1.expect)(details).toContain('Slowest');
        });
        (0, vitest_1.it)('generates details with error', () => {
            const test = createMinimalTestResult({
                status: 'failed',
                error: 'Element not found: button.submit',
            });
            const details = (0, card_generator_1.generateTestDetails)(test, 'card-1', false);
            (0, vitest_1.expect)(details).toContain('Error');
            (0, vitest_1.expect)(details).toContain('Element not found');
        });
        (0, vitest_1.it)('generates details with AI suggestion', () => {
            const test = createMinimalTestResult({
                aiSuggestion: 'Try adding a wait before clicking',
            });
            const details = (0, card_generator_1.generateTestDetails)(test, 'card-1', false);
            (0, vitest_1.expect)(details).toContain('AI Suggestion');
            (0, vitest_1.expect)(details).toContain('wait before clicking');
        });
        (0, vitest_1.it)('generates history section when history exists', () => {
            const test = createMinimalTestResult({
                history: [
                    { passed: true, duration: 900, timestamp: '2024-01-01T00:00:00Z' },
                    { passed: false, duration: 1100, timestamp: '2024-01-02T00:00:00Z' },
                ],
            });
            const details = (0, card_generator_1.generateTestDetails)(test, 'card-1', false);
            (0, vitest_1.expect)(details).toContain('Run History');
            (0, vitest_1.expect)(details).toContain('Pass rate');
        });
    });
    (0, vitest_1.describe)('generateGroupedTests', () => {
        (0, vitest_1.it)('groups tests by file', () => {
            const results = [
                createMinimalTestResult({ testId: '1', file: 'tests/auth.spec.ts' }),
                createMinimalTestResult({ testId: '2', file: 'tests/auth.spec.ts' }),
                createMinimalTestResult({ testId: '3', file: 'tests/home.spec.ts' }),
            ];
            const attention = { newFailures: new Set(), regressions: new Set(), fixed: new Set() };
            const grouped = (0, card_generator_1.generateGroupedTests)(results, false, attention);
            (0, vitest_1.expect)(grouped).toContain('auth.spec.ts');
            (0, vitest_1.expect)(grouped).toContain('home.spec.ts');
            (0, vitest_1.expect)(grouped).toContain('file-group');
        });
        (0, vitest_1.it)('handles attention states', () => {
            const results = [createMinimalTestResult({ testId: 'test-1' })];
            const attention = {
                newFailures: new Set(['test-1']),
                regressions: new Set(),
                fixed: new Set(),
            };
            const grouped = (0, card_generator_1.generateGroupedTests)(results, false, attention);
            (0, vitest_1.expect)(grouped).toContain('new-failure');
        });
    });
});
(0, vitest_1.describe)('chart-generator', () => {
    (0, vitest_1.describe)('generateTrendChart', () => {
        (0, vitest_1.it)('returns message when no history', () => {
            const data = {
                results: [createMinimalTestResult()],
                history: createTestHistory(),
                startTime: Date.now(),
            };
            const chart = (0, chart_generator_1.generateTrendChart)(data);
            (0, vitest_1.expect)(chart).toContain('Trends will appear');
        });
        (0, vitest_1.it)('generates chart with history data', () => {
            const data = {
                results: [createMinimalTestResult()],
                history: {
                    runs: [],
                    tests: {},
                    summaries: [
                        createRunSummary({ runId: 'run-1', passRate: 80 }),
                        createRunSummary({ runId: 'run-2', passRate: 90 }),
                    ],
                },
                startTime: Date.now(),
            };
            const chart = (0, chart_generator_1.generateTrendChart)(data);
            (0, vitest_1.expect)(chart).toContain('trend-section');
            (0, vitest_1.expect)(chart).toContain('Pass Rate');
            (0, vitest_1.expect)(chart).toContain('Duration');
        });
    });
});
(0, vitest_1.describe)('gallery-generator', () => {
    (0, vitest_1.describe)('generateGallery', () => {
        (0, vitest_1.it)('returns empty string when no attachments', () => {
            const results = [createMinimalTestResult()];
            const gallery = (0, gallery_generator_1.generateGallery)(results);
            (0, vitest_1.expect)(gallery).toBe('');
        });
        (0, vitest_1.it)('generates gallery with screenshots', () => {
            const results = [
                createMinimalTestResult({
                    screenshot: 'data:image/png;base64,abc123',
                }),
            ];
            const gallery = (0, gallery_generator_1.generateGallery)(results);
            (0, vitest_1.expect)(gallery).toContain('gallery');
            (0, vitest_1.expect)(gallery).toContain('Screenshots');
        });
        (0, vitest_1.it)('generates gallery with attachments object', () => {
            const results = [
                createMinimalTestResult({
                    attachments: {
                        screenshots: ['data:image/png;base64,abc'],
                        videos: ['/path/to/video.webm'],
                        traces: ['/path/to/trace.zip'],
                        custom: [],
                    },
                }),
            ];
            const gallery = (0, gallery_generator_1.generateGallery)(results);
            (0, vitest_1.expect)(gallery).toContain('Screenshots');
            (0, vitest_1.expect)(gallery).toContain('Videos');
            (0, vitest_1.expect)(gallery).toContain('Traces');
        });
    });
    (0, vitest_1.describe)('generateGalleryScript', () => {
        (0, vitest_1.it)('returns JavaScript code', () => {
            const script = (0, gallery_generator_1.generateGalleryScript)();
            (0, vitest_1.expect)(script).toContain('function filterGallery');
            (0, vitest_1.expect)(script).toContain('function openLightbox');
            (0, vitest_1.expect)(script).toContain('function closeLightbox');
        });
    });
});
(0, vitest_1.describe)('comparison-generator', () => {
    (0, vitest_1.describe)('generateComparison', () => {
        (0, vitest_1.it)('generates comparison view', () => {
            const comparison = {
                baselineRun: createRunSummary({ passRate: 70, duration: 5000 }),
                currentRun: createRunSummary({ passRate: 80, duration: 4000 }),
                changes: {
                    newFailures: [],
                    fixedTests: [],
                    newTests: [],
                    regressions: [],
                    improvements: [],
                },
            };
            const html = (0, comparison_generator_1.generateComparison)(comparison);
            (0, vitest_1.expect)(html).toContain('Run Comparison');
            (0, vitest_1.expect)(html).toContain('Pass Rate');
            (0, vitest_1.expect)(html).toContain('Duration');
        });
        (0, vitest_1.it)('shows new failures', () => {
            const comparison = {
                baselineRun: createRunSummary(),
                currentRun: createRunSummary(),
                changes: {
                    newFailures: [createMinimalTestResult({ status: 'failed', error: 'Oops' })],
                    fixedTests: [],
                    newTests: [],
                    regressions: [],
                    improvements: [],
                },
            };
            const html = (0, comparison_generator_1.generateComparison)(comparison);
            (0, vitest_1.expect)(html).toContain('New Failures');
        });
        (0, vitest_1.it)('shows fixed tests', () => {
            const comparison = {
                baselineRun: createRunSummary(),
                currentRun: createRunSummary(),
                changes: {
                    newFailures: [],
                    fixedTests: [createMinimalTestResult()],
                    newTests: [],
                    regressions: [],
                    improvements: [],
                },
            };
            const html = (0, comparison_generator_1.generateComparison)(comparison);
            (0, vitest_1.expect)(html).toContain('Fixed Tests');
        });
    });
    (0, vitest_1.describe)('generateComparisonScript', () => {
        (0, vitest_1.it)('returns JavaScript code', () => {
            const script = (0, comparison_generator_1.generateComparisonScript)();
            (0, vitest_1.expect)(script).toContain('toggleComparisonSection');
        });
    });
    (0, vitest_1.describe)('buildComparison', () => {
        (0, vitest_1.it)('builds comparison from test results', () => {
            const currentTests = [
                createMinimalTestResult({ testId: '1', status: 'passed' }),
                createMinimalTestResult({ testId: '2', status: 'failed' }),
                createMinimalTestResult({ testId: '3', status: 'passed', duration: 2000 }),
            ];
            const currentSummary = createRunSummary();
            const baselineSummary = createRunSummary();
            const baselineTests = new Map([
                ['1', createMinimalTestResult({ testId: '1', status: 'failed' })],
                ['2', createMinimalTestResult({ testId: '2', status: 'passed' })],
                ['3', createMinimalTestResult({ testId: '3', status: 'passed', duration: 1000 })],
            ]);
            const comparison = (0, comparison_generator_1.buildComparison)(currentTests, currentSummary, baselineSummary, baselineTests);
            (0, vitest_1.expect)(comparison.changes.fixedTests).toHaveLength(1);
            (0, vitest_1.expect)(comparison.changes.fixedTests[0].testId).toBe('1');
            (0, vitest_1.expect)(comparison.changes.newFailures).toHaveLength(1);
            (0, vitest_1.expect)(comparison.changes.newFailures[0].testId).toBe('2');
            (0, vitest_1.expect)(comparison.changes.regressions).toHaveLength(1);
            (0, vitest_1.expect)(comparison.changes.regressions[0].testId).toBe('3');
        });
        (0, vitest_1.it)('identifies new tests', () => {
            const currentTests = [createMinimalTestResult({ testId: 'new-test' })];
            const currentSummary = createRunSummary();
            const baselineSummary = createRunSummary();
            const baselineTests = new Map();
            const comparison = (0, comparison_generator_1.buildComparison)(currentTests, currentSummary, baselineSummary, baselineTests);
            (0, vitest_1.expect)(comparison.changes.newTests).toHaveLength(1);
            (0, vitest_1.expect)(comparison.changes.newTests[0].testId).toBe('new-test');
        });
    });
});
