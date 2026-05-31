"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ai_analyzer_1 = require("./ai-analyzer");
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
function createFailureCluster(overrides = {}) {
    return {
        id: 'cluster-1',
        errorType: 'Timeout Error',
        count: 1,
        tests: [createTestResult({ status: 'failed', error: 'TimeoutError: Waiting for selector' })],
        ...overrides,
    };
}
function createSuiteStats(overrides = {}) {
    return {
        total: 10,
        passed: 9,
        failed: 1,
        skipped: 0,
        flaky: 0,
        slow: 0,
        needsRetry: 0,
        passRate: 90,
        averageStability: 85,
        ...overrides,
    };
}
const mockFetch = vitest_1.vi.fn();
vitest_1.vi.stubGlobal('fetch', mockFetch);
function mockProxyResponse(suggestion, remaining = 50, resetAt = 1700000000) {
    return {
        ok: true,
        status: 200,
        json: async () => ({ suggestion, remaining, resetAt }),
    };
}
(0, vitest_1.describe)('AIAnalyzer', () => {
    let originalEnv;
    (0, vitest_1.beforeEach)(() => {
        // Save original env
        originalEnv = { ...process.env };
        // Clear all AI keys
        delete process.env.ANTHROPIC_API_KEY;
        delete process.env.OPENAI_API_KEY;
        delete process.env.GEMINI_API_KEY;
        delete process.env.GITHUB_TOKEN;
        delete process.env.OLLAMA_BASE_URL;
        delete process.env.OLLAMA_MODEL;
        delete process.env.COPILOT_MODEL;
        // Reset mocks
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.afterEach)(() => {
        // Restore original env
        process.env = originalEnv;
    });
    (0, vitest_1.describe)('isAvailable', () => {
        (0, vitest_1.it)('returns true when ANTHROPIC_API_KEY is set', () => {
            process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            (0, vitest_1.expect)(analyzer.isAvailable()).toBe(true);
        });
        (0, vitest_1.it)('returns true when OPENAI_API_KEY is set', () => {
            process.env.OPENAI_API_KEY = 'test-openai-key';
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            (0, vitest_1.expect)(analyzer.isAvailable()).toBe(true);
        });
        (0, vitest_1.it)('returns true when GEMINI_API_KEY is set', () => {
            process.env.GEMINI_API_KEY = 'test-gemini-key';
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            (0, vitest_1.expect)(analyzer.isAvailable()).toBe(true);
        });
        (0, vitest_1.it)('returns true when GITHUB_TOKEN is set', () => {
            process.env.GITHUB_TOKEN = 'test-github-token';
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            (0, vitest_1.expect)(analyzer.isAvailable()).toBe(true);
        });
        (0, vitest_1.it)('returns true when aiProvider is ollama (no key needed)', () => {
            const analyzer = new ai_analyzer_1.AIAnalyzer({ aiProvider: 'ollama' });
            (0, vitest_1.expect)(analyzer.isAvailable()).toBe(true);
        });
        (0, vitest_1.it)('returns true when aiProvider is copilot and GITHUB_TOKEN is set', () => {
            process.env.GITHUB_TOKEN = 'test-github-token';
            const analyzer = new ai_analyzer_1.AIAnalyzer({ aiProvider: 'copilot' });
            (0, vitest_1.expect)(analyzer.isAvailable()).toBe(true);
        });
        (0, vitest_1.it)('returns false when aiProvider is copilot but no GITHUB_TOKEN', () => {
            const analyzer = new ai_analyzer_1.AIAnalyzer({ aiProvider: 'copilot' });
            (0, vitest_1.expect)(analyzer.isAvailable()).toBe(false);
        });
        (0, vitest_1.it)('returns true when multiple keys are set', () => {
            process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
            process.env.OPENAI_API_KEY = 'test-openai-key';
            process.env.GEMINI_API_KEY = 'test-gemini-key';
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            (0, vitest_1.expect)(analyzer.isAvailable()).toBe(true);
        });
        (0, vitest_1.it)('returns false when no keys or explicit provider are set', () => {
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            (0, vitest_1.expect)(analyzer.isAvailable()).toBe(false);
        });
    });
    (0, vitest_1.describe)('analyzeFailed', () => {
        (0, vitest_1.it)('skips analysis when no failed tests', async () => {
            process.env.ANTHROPIC_API_KEY = 'test-key';
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const results = [
                createTestResult({ status: 'passed' }),
                createTestResult({ status: 'skipped' }),
            ];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(mockFetch).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('prints tip when no AI keys are set', async () => {
            const consoleSpy = vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const results = [
                createTestResult({ status: 'failed', error: 'Test failed' }),
            ];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(consoleSpy).toHaveBeenCalledWith('💡 Tip: Set ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, or GITHUB_TOKEN for AI failure analysis. You can also use a local Ollama instance.');
            (0, vitest_1.expect)(mockFetch).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
        (0, vitest_1.it)('calls Anthropic API with correct URL and body', async () => {
            vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            process.env.ANTHROPIC_API_KEY = 'my-key';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ content: [{ type: 'text', text: 'Check your selector syntax' }] }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const results = [
                createTestResult({ testId: 'test-1', status: 'failed', error: 'Element not found' }),
            ];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledTimes(1);
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', vitest_1.expect.objectContaining({ method: 'POST' }));
            (0, vitest_1.expect)(results[0].aiSuggestion).toBe('Check your selector syntax');
        });
        (0, vitest_1.it)('processes in batches of 3 concurrent requests', async () => {
            vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            process.env.ANTHROPIC_API_KEY = 'test-key';
            for (let i = 0; i < 5; i++) {
                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ content: [{ type: 'text', text: `suggestion-${i}` }] }),
                });
            }
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const results = Array.from({ length: 5 }, (_, i) => createTestResult({ testId: `test-${i}`, status: 'failed', error: `Error ${i}` }));
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledTimes(5);
            results.forEach((r, i) => {
                (0, vitest_1.expect)(r.aiSuggestion).toBe(`suggestion-${i}`);
            });
        });
        (0, vitest_1.it)('handles API error gracefully', async () => {
            vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            const consoleSpy = vitest_1.vi.spyOn(console, 'error').mockImplementation(() => { });
            process.env.ANTHROPIC_API_KEY = 'bad-key';
            mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(consoleSpy).toHaveBeenCalledWith(vitest_1.expect.stringContaining('Failed to get AI suggestion'), vitest_1.expect.any(Error));
            (0, vitest_1.expect)(results[0].aiSuggestion).toBeUndefined();
            consoleSpy.mockRestore();
        });
        (0, vitest_1.it)('uses custom aiPrompt if provided', async () => {
            vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            process.env.ANTHROPIC_API_KEY = 'test-key';
            const customPrompt = 'Custom prompt for analysis';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ content: [{ type: 'text', text: 'Custom suggestion' }] }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const results = [
                createTestResult({ status: 'failed', error: 'Error', aiPrompt: customPrompt }),
            ];
            await analyzer.analyzeFailed(results);
            const body = JSON.parse(mockFetch.mock.calls[0][1].body);
            (0, vitest_1.expect)(body.messages[0].content).toBe(customPrompt);
        });
        (0, vitest_1.it)('analyzes timedOut tests', async () => {
            vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            process.env.ANTHROPIC_API_KEY = 'test-key';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ content: [{ type: 'text', text: 'Test suggestion' }] }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const results = [createTestResult({ status: 'timedOut', error: 'Test timed out' })];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledTimes(1);
            (0, vitest_1.expect)(results[0].aiSuggestion).toBe('Test suggestion');
        });
        (0, vitest_1.it)('handles generic server error gracefully', async () => {
            vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            const consoleSpy = vitest_1.vi.spyOn(console, 'error').mockImplementation(() => { });
            process.env.ANTHROPIC_API_KEY = 'test-key';
            mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(consoleSpy).toHaveBeenCalled();
            (0, vitest_1.expect)(results[0].aiSuggestion).toBeUndefined();
            consoleSpy.mockRestore();
        });
    });
    (0, vitest_1.describe)('analyzeClusters', () => {
        (0, vitest_1.it)('skips analysis when no clusters', async () => {
            process.env.ANTHROPIC_API_KEY = 'test-key';
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            await analyzer.analyzeClusters([]);
            (0, vitest_1.expect)(mockFetch).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('skips analysis when not available', async () => {
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const clusters = [createFailureCluster()];
            await analyzer.analyzeClusters(clusters);
            (0, vitest_1.expect)(mockFetch).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('analyzes clusters via Anthropic API', async () => {
            vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            process.env.ANTHROPIC_API_KEY = 'test-key';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ content: [{ type: 'text', text: 'Cluster suggestion' }] }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const clusters = [createFailureCluster()];
            await analyzer.analyzeClusters(clusters);
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledTimes(1);
            (0, vitest_1.expect)(clusters[0].aiSuggestion).toBe('Cluster suggestion');
        });
    });
    (0, vitest_1.describe)('analyzeSuiteHealth', () => {
        (0, vitest_1.it)('returns undefined when no AI keys set', async () => {
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const stats = createSuiteStats();
            const result = await analyzer.analyzeSuiteHealth([], stats, [], []);
            (0, vitest_1.expect)(result).toBeUndefined();
            (0, vitest_1.expect)(mockFetch).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('calls AI and returns health summary', async () => {
            vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            process.env.ANTHROPIC_API_KEY = 'test-key';
            const expectedSummary = 'Your suite has 3 recurring failures in auth flows.';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ content: [{ type: 'text', text: expectedSummary }] }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const stats = createSuiteStats({ failed: 3, passRate: 70 });
            const clusters = [createFailureCluster({ count: 3, errorType: 'Authentication Error' })];
            const flakyResults = [createTestResult({ flakinessScore: 0.5 })];
            const result = await analyzer.analyzeSuiteHealth(flakyResults, stats, clusters, []);
            (0, vitest_1.expect)(result).toBe(expectedSummary);
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledTimes(1);
            const body = JSON.parse(mockFetch.mock.calls[0][1].body);
            const prompt = body.messages[0].content;
            (0, vitest_1.expect)(prompt).toContain('Pass Rate: 70%');
            (0, vitest_1.expect)(prompt).toContain('Authentication Error');
        });
        (0, vitest_1.it)('includes history trend in prompt when summaries available', async () => {
            vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            process.env.ANTHROPIC_API_KEY = 'test-key';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ content: [{ type: 'text', text: 'Health summary' }] }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const stats = createSuiteStats({ passRate: 85 });
            const historySummaries = [
                { runId: 'r1', timestamp: '2025-01-01', total: 10, passed: 9, failed: 1, skipped: 0, flaky: 0, slow: 0, duration: 1000, passRate: 90 },
                { runId: 'r2', timestamp: '2025-01-02', total: 10, passed: 8, failed: 2, skipped: 0, flaky: 0, slow: 0, duration: 1000, passRate: 80 },
            ];
            await analyzer.analyzeSuiteHealth([], stats, [], historySummaries);
            const body = JSON.parse(mockFetch.mock.calls[0][1].body);
            const prompt = body.messages[0].content;
            (0, vitest_1.expect)(prompt).toContain('90%');
            (0, vitest_1.expect)(prompt).toContain('80%');
            (0, vitest_1.expect)(prompt).toContain('85% (current)');
        });
        (0, vitest_1.it)('returns undefined on API error', async () => {
            vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            vitest_1.vi.spyOn(console, 'error').mockImplementation(() => { });
            process.env.ANTHROPIC_API_KEY = 'test-key';
            mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const stats = createSuiteStats();
            const result = await analyzer.analyzeSuiteHealth([], stats, [], []);
            (0, vitest_1.expect)(result).toBeUndefined();
        });
    });
    (0, vitest_1.describe)('generateRecommendations', () => {
        (0, vitest_1.it)('generates flakiness recommendations for flaky tests', () => {
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const results = [
                createTestResult({ testId: 'test-1', flakinessScore: 0.5 }),
                createTestResult({ testId: 'test-2', flakinessScore: 0.8 }),
            ];
            const stats = createSuiteStats();
            const recommendations = analyzer.generateRecommendations(results, stats);
            const flakinessRec = recommendations.find(r => r.type === 'flakiness');
            (0, vitest_1.expect)(flakinessRec).toBeDefined();
            (0, vitest_1.expect)(flakinessRec?.affectedTests).toContain('test-1');
            (0, vitest_1.expect)(flakinessRec?.affectedTests).toContain('test-2');
            (0, vitest_1.expect)(flakinessRec?.icon).toBe('🔴');
        });
        (0, vitest_1.it)('does not generate flakiness recommendations for stable tests', () => {
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const results = [
                createTestResult({ flakinessScore: 0.1 }),
                createTestResult({ flakinessScore: 0.2 }),
            ];
            const stats = createSuiteStats();
            const recommendations = analyzer.generateRecommendations(results, stats);
            const flakinessRec = recommendations.find(r => r.type === 'flakiness');
            (0, vitest_1.expect)(flakinessRec).toBeUndefined();
        });
        (0, vitest_1.it)('generates retry recommendations for tests needing attention', () => {
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const results = [
                createTestResult({
                    testId: 'test-1',
                    retryInfo: {
                        totalRetries: 3,
                        passedOnRetry: 2,
                        failedRetries: 2,
                        retryPattern: [false, false, true],
                        needsAttention: true,
                    },
                }),
            ];
            const stats = createSuiteStats();
            const recommendations = analyzer.generateRecommendations(results, stats);
            const retryRec = recommendations.find(r => r.type === 'retry');
            (0, vitest_1.expect)(retryRec).toBeDefined();
            (0, vitest_1.expect)(retryRec?.affectedTests).toContain('test-1');
            (0, vitest_1.expect)(retryRec?.icon).toBe('🔄');
        });
        (0, vitest_1.it)('generates performance recommendations for slowing tests', () => {
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const results = [
                createTestResult({ testId: 'test-1', performanceTrend: '↑ 50%' }),
                createTestResult({ testId: 'test-2', performanceTrend: '↓ 10%' }),
            ];
            const stats = createSuiteStats();
            const recommendations = analyzer.generateRecommendations(results, stats);
            const perfRec = recommendations.find(r => r.type === 'performance');
            (0, vitest_1.expect)(perfRec).toBeDefined();
            (0, vitest_1.expect)(perfRec?.affectedTests).toContain('test-1');
            (0, vitest_1.expect)(perfRec?.affectedTests).not.toContain('test-2');
            (0, vitest_1.expect)(perfRec?.icon).toBe('🐢');
        });
        (0, vitest_1.it)('generates suite pass rate recommendation when below 90%', () => {
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const results = [];
            const stats = createSuiteStats({ passRate: 75 });
            const recommendations = analyzer.generateRecommendations(results, stats);
            const suiteRec = recommendations.find(r => r.type === 'suite' && r.title === 'Improve Suite Pass Rate');
            (0, vitest_1.expect)(suiteRec).toBeDefined();
            (0, vitest_1.expect)(suiteRec?.description).toContain('75%');
            (0, vitest_1.expect)(suiteRec?.icon).toBe('📊');
        });
        (0, vitest_1.it)('does not generate pass rate recommendation when at or above 90%', () => {
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const results = [];
            const stats = createSuiteStats({ passRate: 95 });
            const recommendations = analyzer.generateRecommendations(results, stats);
            const passRateRec = recommendations.find(r => r.type === 'suite' && r.title === 'Improve Suite Pass Rate');
            (0, vitest_1.expect)(passRateRec).toBeUndefined();
        });
        (0, vitest_1.it)('generates stability recommendation when below 70', () => {
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const results = [];
            const stats = createSuiteStats({ averageStability: 55 });
            const recommendations = analyzer.generateRecommendations(results, stats);
            const stabilityRec = recommendations.find(r => r.type === 'suite' && r.title === 'Improve Suite Stability');
            (0, vitest_1.expect)(stabilityRec).toBeDefined();
            (0, vitest_1.expect)(stabilityRec?.description).toContain('55');
            (0, vitest_1.expect)(stabilityRec?.icon).toBe('⚠️');
        });
        (0, vitest_1.it)('sorts recommendations by priority (highest first)', () => {
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const results = [
                createTestResult({ testId: 'test-1', flakinessScore: 0.5 }),
                createTestResult({ testId: 'test-2', performanceTrend: '↑ 50%' }),
            ];
            const stats = createSuiteStats({ passRate: 75, averageStability: 55 });
            const recommendations = analyzer.generateRecommendations(results, stats);
            for (let i = 0; i < recommendations.length - 1; i++) {
                (0, vitest_1.expect)(recommendations[i].priority).toBeGreaterThanOrEqual(recommendations[i + 1].priority);
            }
        });
    });
    (0, vitest_1.describe)('AI provider priority (fall-through behavior)', () => {
        (0, vitest_1.it)('prefers Anthropic when all keys are set', async () => {
            process.env.ANTHROPIC_API_KEY = 'anthropic-key';
            process.env.OPENAI_API_KEY = 'openai-key';
            process.env.GEMINI_API_KEY = 'gemini-key';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    content: [{ type: 'text', text: 'Anthropic response' }],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', vitest_1.expect.anything());
        });
        (0, vitest_1.it)('falls back to OpenAI when only OpenAI and Gemini keys are set', async () => {
            process.env.OPENAI_API_KEY = 'openai-key';
            process.env.GEMINI_API_KEY = 'gemini-key';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'OpenAI response' } }],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', vitest_1.expect.anything());
        });
        (0, vitest_1.it)('uses Gemini when only Gemini key is set', async () => {
            process.env.GEMINI_API_KEY = 'gemini-key';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{
                            content: { parts: [{ text: 'Gemini response' }] },
                            role: 'model',
                        }],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledWith('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', vitest_1.expect.anything());
        });
        (0, vitest_1.it)('falls back to Copilot when only GITHUB_TOKEN is set', async () => {
            process.env.GITHUB_TOKEN = 'github-token';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Copilot response' } }],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledWith('https://models.github.com/inference/chat/completions', vitest_1.expect.anything());
        });
        (0, vitest_1.it)('falls back to Ollama when no keys are set but aiProvider is ollama', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Ollama response' } }],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer({ aiProvider: 'ollama' });
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledWith('http://localhost:11434/v1/chat/completions', vitest_1.expect.anything());
        });
    });
    (0, vitest_1.describe)('GitHub Copilot provider', () => {
        (0, vitest_1.it)('sends correct request to GitHub Models API', async () => {
            process.env.GITHUB_TOKEN = 'test-github-token';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Fix the selector' } }],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer({ aiProvider: 'copilot' });
            const results = [
                createTestResult({
                    status: 'failed',
                    error: 'Element not found',
                    title: 'Login test',
                    file: 'login.spec.ts',
                }),
            ];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledWith('https://models.github.com/inference/chat/completions', vitest_1.expect.objectContaining({
                method: 'POST',
                headers: vitest_1.expect.objectContaining({
                    'Authorization': 'Bearer test-github-token',
                    'Content-Type': 'application/json',
                }),
            }));
            (0, vitest_1.expect)(results[0].aiSuggestion).toBe('Fix the selector');
        });
        (0, vitest_1.it)('uses claude-sonnet-4-20250514 as default model', async () => {
            process.env.GITHUB_TOKEN = 'test-github-token';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Response' } }],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer({ aiProvider: 'copilot' });
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            const fetchCall = mockFetch.mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            (0, vitest_1.expect)(body.model).toBe('claude-sonnet-4-20250514');
        });
        (0, vitest_1.it)('allows custom copilot model', async () => {
            process.env.GITHUB_TOKEN = 'test-github-token';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Response' } }],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer({ aiProvider: 'copilot', copilotModel: 'gpt-4o' });
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            const fetchCall = mockFetch.mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            (0, vitest_1.expect)(body.model).toBe('gpt-4o');
        });
        (0, vitest_1.it)('allows copilot model from COPILOT_MODEL env var', async () => {
            process.env.GITHUB_TOKEN = 'test-github-token';
            process.env.COPILOT_MODEL = 'o1-preview';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Response' } }],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer({ aiProvider: 'copilot' });
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            const fetchCall = mockFetch.mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            (0, vitest_1.expect)(body.model).toBe('o1-preview');
        });
        (0, vitest_1.it)('throws on Copilot API error', async () => {
            process.env.GITHUB_TOKEN = 'test-github-token';
            const consoleSpy = vitest_1.vi.spyOn(console, 'error').mockImplementation(() => { });
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer({ aiProvider: 'copilot' });
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(consoleSpy).toHaveBeenCalledWith(vitest_1.expect.stringContaining('Failed to get AI suggestion'), vitest_1.expect.any(Error));
            consoleSpy.mockRestore();
        });
        (0, vitest_1.it)('handles empty choices array', async () => {
            process.env.GITHUB_TOKEN = 'test-github-token';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer({ aiProvider: 'copilot' });
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(results[0].aiSuggestion).toBe('No suggestion available');
        });
        (0, vitest_1.it)('analyzes clusters with Copilot', async () => {
            process.env.GITHUB_TOKEN = 'test-github-token';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Cluster fix' } }],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer({ aiProvider: 'copilot' });
            const clusters = [createFailureCluster()];
            await analyzer.analyzeClusters(clusters);
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledWith('https://models.github.com/inference/chat/completions', vitest_1.expect.anything());
            (0, vitest_1.expect)(clusters[0].aiSuggestion).toBe('Cluster fix');
        });
    });
    (0, vitest_1.describe)('Ollama provider', () => {
        (0, vitest_1.it)('sends correct request to local Ollama server', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Local LLM suggestion' } }],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer({ aiProvider: 'ollama' });
            const results = [
                createTestResult({
                    status: 'failed',
                    error: 'Element not found',
                    title: 'Search test',
                    file: 'search.spec.ts',
                }),
            ];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledWith('http://localhost:11434/v1/chat/completions', vitest_1.expect.objectContaining({
                method: 'POST',
                headers: vitest_1.expect.objectContaining({
                    'Content-Type': 'application/json',
                }),
            }));
            (0, vitest_1.expect)(results[0].aiSuggestion).toBe('Local LLM suggestion');
        });
        (0, vitest_1.it)('uses codellama as default model', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Response' } }],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer({ aiProvider: 'ollama' });
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            const fetchCall = mockFetch.mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            (0, vitest_1.expect)(body.model).toBe('codellama');
        });
        (0, vitest_1.it)('allows custom ollama model', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Response' } }],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer({ aiProvider: 'ollama', ollamaModel: 'llama3.2' });
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            const fetchCall = mockFetch.mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            (0, vitest_1.expect)(body.model).toBe('llama3.2');
        });
        (0, vitest_1.it)('allows custom ollama base URL', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Response' } }],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer({ aiProvider: 'ollama', ollamaBaseUrl: 'http://my-server:8080' });
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledWith('http://my-server:8080/v1/chat/completions', vitest_1.expect.anything());
        });
        (0, vitest_1.it)('reads OLLAMA_BASE_URL and OLLAMA_MODEL from env vars', async () => {
            process.env.OLLAMA_BASE_URL = 'http://remote-ollama:11434';
            process.env.OLLAMA_MODEL = 'mistral';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Response' } }],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer({ aiProvider: 'ollama' });
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledWith('http://remote-ollama:11434/v1/chat/completions', vitest_1.expect.anything());
            const fetchCall = mockFetch.mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            (0, vitest_1.expect)(body.model).toBe('mistral');
        });
        (0, vitest_1.it)('strips trailing slash from base URL', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Response' } }],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer({ aiProvider: 'ollama', ollamaBaseUrl: 'http://localhost:11434/' });
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledWith('http://localhost:11434/v1/chat/completions', vitest_1.expect.anything());
        });
        (0, vitest_1.it)('throws on Ollama API error', async () => {
            const consoleSpy = vitest_1.vi.spyOn(console, 'error').mockImplementation(() => { });
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer({ aiProvider: 'ollama' });
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(consoleSpy).toHaveBeenCalledWith(vitest_1.expect.stringContaining('Failed to get AI suggestion'), vitest_1.expect.any(Error));
            consoleSpy.mockRestore();
        });
        (0, vitest_1.it)('handles empty choices array', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer({ aiProvider: 'ollama' });
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(results[0].aiSuggestion).toBe('No suggestion available');
        });
        (0, vitest_1.it)('analyzes clusters with Ollama', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Local cluster fix' } }],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer({ aiProvider: 'ollama' });
            const clusters = [createFailureCluster()];
            await analyzer.analyzeClusters(clusters);
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledWith('http://localhost:11434/v1/chat/completions', vitest_1.expect.anything());
            (0, vitest_1.expect)(clusters[0].aiSuggestion).toBe('Local cluster fix');
        });
        (0, vitest_1.it)('sends options.num_predict in request body', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Response' } }],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer({ aiProvider: 'ollama' });
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            const fetchCall = mockFetch.mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            (0, vitest_1.expect)(body.options.num_predict).toBe(512);
        });
    });
    (0, vitest_1.describe)('Explicit aiProvider selection', () => {
        (0, vitest_1.it)('uses copilot when aiProvider is set even if anthropic key exists', async () => {
            process.env.ANTHROPIC_API_KEY = 'anthropic-key';
            process.env.GITHUB_TOKEN = 'github-token';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Copilot response' } }],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer({ aiProvider: 'copilot' });
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledWith('https://models.github.com/inference/chat/completions', vitest_1.expect.anything());
        });
        (0, vitest_1.it)('uses ollama when aiProvider is set even if all keys exist', async () => {
            process.env.ANTHROPIC_API_KEY = 'anthropic-key';
            process.env.OPENAI_API_KEY = 'openai-key';
            process.env.GITHUB_TOKEN = 'github-token';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Ollama response' } }],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer({ aiProvider: 'ollama' });
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledWith('http://localhost:11434/v1/chat/completions', vitest_1.expect.anything());
        });
    });
    (0, vitest_1.describe)('getActiveProvider', () => {
        (0, vitest_1.it)('returns explicit provider when set', () => {
            const analyzer = new ai_analyzer_1.AIAnalyzer({ aiProvider: 'copilot' });
            (0, vitest_1.expect)(analyzer.getActiveProvider()).toBe('copilot');
        });
        (0, vitest_1.it)('returns anthropic when ANTHROPIC_API_KEY is set', () => {
            process.env.ANTHROPIC_API_KEY = 'key';
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            (0, vitest_1.expect)(analyzer.getActiveProvider()).toBe('anthropic');
        });
        (0, vitest_1.it)('returns copilot when only GITHUB_TOKEN is set', () => {
            process.env.GITHUB_TOKEN = 'token';
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            (0, vitest_1.expect)(analyzer.getActiveProvider()).toBe('copilot');
        });
        (0, vitest_1.it)('returns ollama as last fallback', () => {
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            (0, vitest_1.expect)(analyzer.getActiveProvider()).toBe('ollama');
        });
    });
    (0, vitest_1.describe)('Gemini API request format', () => {
        (0, vitest_1.it)('sends correct request body format', async () => {
            process.env.GEMINI_API_KEY = 'test-gemini-key';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{
                            content: { parts: [{ text: 'Response' }] },
                            role: 'model',
                        }],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const results = [
                createTestResult({
                    status: 'failed',
                    error: 'Test error',
                    title: 'My Test',
                    file: 'test.spec.ts',
                }),
            ];
            await analyzer.analyzeFailed(results);
            const fetchCall = mockFetch.mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            // Verify contents is an array
            (0, vitest_1.expect)(Array.isArray(body.contents)).toBe(true);
            (0, vitest_1.expect)(body.contents[0].parts).toBeDefined();
            (0, vitest_1.expect)(body.contents[0].parts[0].text).toContain('My Test');
            // Verify generationConfig
            (0, vitest_1.expect)(body.generationConfig.maxOutputTokens).toBe(512);
        });
        (0, vitest_1.it)('handles empty candidates array', async () => {
            process.env.GEMINI_API_KEY = 'test-gemini-key';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(results[0].aiSuggestion).toBe('No suggestion available');
        });
        (0, vitest_1.it)('handles missing parts in response', async () => {
            process.env.GEMINI_API_KEY = 'test-gemini-key';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{
                            content: { parts: [] },
                            role: 'model',
                        }],
                }),
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(results[0].aiSuggestion).toBe('No suggestion available');
        });
        (0, vitest_1.it)('throws on Gemini API error', async () => {
            process.env.GEMINI_API_KEY = 'test-gemini-key';
            const consoleSpy = vitest_1.vi.spyOn(console, 'error').mockImplementation(() => { });
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
            });
            const analyzer = new ai_analyzer_1.AIAnalyzer();
            const results = [createTestResult({ status: 'failed', error: 'Error' })];
            await analyzer.analyzeFailed(results);
            (0, vitest_1.expect)(consoleSpy).toHaveBeenCalledWith(vitest_1.expect.stringContaining('Failed to get AI suggestion'), vitest_1.expect.any(Error));
            consoleSpy.mockRestore();
        });
    });
});
