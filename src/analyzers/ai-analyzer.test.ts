import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIAnalyzer } from './ai-analyzer';
import type { TestResultData, FailureCluster, SuiteStats } from '../types';

function createTestResult(overrides: Partial<TestResultData> = {}): TestResultData {
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

function createFailureCluster(overrides: Partial<FailureCluster> = {}): FailureCluster {
  return {
    id: 'cluster-1',
    errorType: 'Timeout Error',
    count: 1,
    tests: [createTestResult({ status: 'failed', error: 'TimeoutError: Waiting for selector' })],
    ...overrides,
  };
}

function createSuiteStats(overrides: Partial<SuiteStats> = {}): SuiteStats {
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

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockProxyResponse(suggestion: string, remaining = 50, resetAt = 1700000000) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ suggestion, remaining, resetAt }),
  };
}

describe('AIAnalyzer', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
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
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('isAvailable', () => {
    it('returns true when ANTHROPIC_API_KEY is set', () => {
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
      const analyzer = new AIAnalyzer();
      expect(analyzer.isAvailable()).toBe(true);
    });

    it('returns true when OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';
      const analyzer = new AIAnalyzer();
      expect(analyzer.isAvailable()).toBe(true);
    });

    it('returns true when GEMINI_API_KEY is set', () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key';
      const analyzer = new AIAnalyzer();
      expect(analyzer.isAvailable()).toBe(true);
    });

    it('returns true when GITHUB_TOKEN is set', () => {
      process.env.GITHUB_TOKEN = 'test-github-token';
      const analyzer = new AIAnalyzer();
      expect(analyzer.isAvailable()).toBe(true);
    });

    it('returns true when aiProvider is ollama (no key needed)', () => {
      const analyzer = new AIAnalyzer({ aiProvider: 'ollama' });
      expect(analyzer.isAvailable()).toBe(true);
    });

    it('returns true when aiProvider is copilot and GITHUB_TOKEN is set', () => {
      process.env.GITHUB_TOKEN = 'test-github-token';
      const analyzer = new AIAnalyzer({ aiProvider: 'copilot' });
      expect(analyzer.isAvailable()).toBe(true);
    });

    it('returns false when aiProvider is copilot but no GITHUB_TOKEN', () => {
      const analyzer = new AIAnalyzer({ aiProvider: 'copilot' });
      expect(analyzer.isAvailable()).toBe(false);
    });

    it('returns true when multiple keys are set', () => {
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
      process.env.OPENAI_API_KEY = 'test-openai-key';
      process.env.GEMINI_API_KEY = 'test-gemini-key';
      const analyzer = new AIAnalyzer();
      expect(analyzer.isAvailable()).toBe(true);
    });

    it('returns false when no keys or explicit provider are set', () => {
      const analyzer = new AIAnalyzer();
      expect(analyzer.isAvailable()).toBe(false);
    });
  });

  describe('analyzeFailed', () => {
    it('skips analysis when no failed tests', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      const analyzer = new AIAnalyzer();
      const results = [
        createTestResult({ status: 'passed' }),
        createTestResult({ status: 'skipped' }),
      ];

      await analyzer.analyzeFailed(results);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('prints tip when no AI keys are set', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const analyzer = new AIAnalyzer();
      const results = [
        createTestResult({ status: 'failed', error: 'Test failed' }),
      ];

      await analyzer.analyzeFailed(results);

      expect(consoleSpy).toHaveBeenCalledWith(
        '💡 Tip: Set ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, or GITHUB_TOKEN for AI failure analysis. You can also use a local Ollama instance.'
      );
      expect(mockFetch).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('calls Anthropic API with correct URL and body', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      process.env.ANTHROPIC_API_KEY = 'my-key';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: [{ type: 'text', text: 'Check your selector syntax' }] }),
      });

      const analyzer = new AIAnalyzer();
      const results = [
        createTestResult({ testId: 'test-1', status: 'failed', error: 'Element not found' }),
      ];

      await analyzer.analyzeFailed(results);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({ method: 'POST' })
      );
      expect(results[0].aiSuggestion).toBe('Check your selector syntax');
    });

    it('processes in batches of 3 concurrent requests', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      process.env.ANTHROPIC_API_KEY = 'test-key';
      for (let i = 0; i < 5; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ content: [{ type: 'text', text: `suggestion-${i}` }] }),
        });
      }

      const analyzer = new AIAnalyzer();
      const results = Array.from({ length: 5 }, (_, i) =>
        createTestResult({ testId: `test-${i}`, status: 'failed', error: `Error ${i}` })
      );

      await analyzer.analyzeFailed(results);

      expect(mockFetch).toHaveBeenCalledTimes(5);
      results.forEach((r, i) => {
        expect(r.aiSuggestion).toBe(`suggestion-${i}`);
      });
    });

    it('handles API error gracefully', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      process.env.ANTHROPIC_API_KEY = 'bad-key';
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      const analyzer = new AIAnalyzer();
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get AI suggestion'),
        expect.any(Error)
      );
      expect(results[0].aiSuggestion).toBeUndefined();

      consoleSpy.mockRestore();
    });

    it('uses custom aiPrompt if provided', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      process.env.ANTHROPIC_API_KEY = 'test-key';
      const customPrompt = 'Custom prompt for analysis';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: [{ type: 'text', text: 'Custom suggestion' }] }),
      });

      const analyzer = new AIAnalyzer();
      const results = [
        createTestResult({ status: 'failed', error: 'Error', aiPrompt: customPrompt }),
      ];

      await analyzer.analyzeFailed(results);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.messages[0].content).toBe(customPrompt);
    });

    it('analyzes timedOut tests', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      process.env.ANTHROPIC_API_KEY = 'test-key';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: [{ type: 'text', text: 'Test suggestion' }] }),
      });

      const analyzer = new AIAnalyzer();
      const results = [createTestResult({ status: 'timedOut', error: 'Test timed out' })];

      await analyzer.analyzeFailed(results);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(results[0].aiSuggestion).toBe('Test suggestion');
    });

    it('handles generic server error gracefully', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      process.env.ANTHROPIC_API_KEY = 'test-key';
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const analyzer = new AIAnalyzer();
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      expect(consoleSpy).toHaveBeenCalled();
      expect(results[0].aiSuggestion).toBeUndefined();

      consoleSpy.mockRestore();
    });
  });

  describe('analyzeClusters', () => {
    it('skips analysis when no clusters', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      const analyzer = new AIAnalyzer();

      await analyzer.analyzeClusters([]);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('skips analysis when not available', async () => {
      const analyzer = new AIAnalyzer();
      const clusters = [createFailureCluster()];

      await analyzer.analyzeClusters(clusters);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('analyzes clusters via Anthropic API', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      process.env.ANTHROPIC_API_KEY = 'test-key';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: [{ type: 'text', text: 'Cluster suggestion' }] }),
      });

      const analyzer = new AIAnalyzer();
      const clusters = [createFailureCluster()];

      await analyzer.analyzeClusters(clusters);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(clusters[0].aiSuggestion).toBe('Cluster suggestion');
    });
  });

  describe('analyzeSuiteHealth', () => {
    it('returns undefined when no AI keys set', async () => {
      const analyzer = new AIAnalyzer();
      const stats = createSuiteStats();

      const result = await analyzer.analyzeSuiteHealth([], stats, [], []);

      expect(result).toBeUndefined();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('calls AI and returns health summary', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      process.env.ANTHROPIC_API_KEY = 'test-key';
      const expectedSummary = 'Your suite has 3 recurring failures in auth flows.';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: [{ type: 'text', text: expectedSummary }] }),
      });

      const analyzer = new AIAnalyzer();
      const stats = createSuiteStats({ failed: 3, passRate: 70 });
      const clusters = [createFailureCluster({ count: 3, errorType: 'Authentication Error' })];
      const flakyResults = [createTestResult({ flakinessScore: 0.5 })];

      const result = await analyzer.analyzeSuiteHealth(flakyResults, stats, clusters, []);

      expect(result).toBe(expectedSummary);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const prompt = body.messages[0].content;
      expect(prompt).toContain('Pass Rate: 70%');
      expect(prompt).toContain('Authentication Error');
    });

    it('includes history trend in prompt when summaries available', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      process.env.ANTHROPIC_API_KEY = 'test-key';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: [{ type: 'text', text: 'Health summary' }] }),
      });

      const analyzer = new AIAnalyzer();
      const stats = createSuiteStats({ passRate: 85 });
      const historySummaries = [
        { runId: 'r1', timestamp: '2025-01-01', total: 10, passed: 9, failed: 1, skipped: 0, flaky: 0, slow: 0, duration: 1000, passRate: 90 },
        { runId: 'r2', timestamp: '2025-01-02', total: 10, passed: 8, failed: 2, skipped: 0, flaky: 0, slow: 0, duration: 1000, passRate: 80 },
      ];

      await analyzer.analyzeSuiteHealth([], stats, [], historySummaries);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const prompt = body.messages[0].content;
      expect(prompt).toContain('90%');
      expect(prompt).toContain('80%');
      expect(prompt).toContain('85% (current)');
    });

    it('returns undefined on API error', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});
      process.env.ANTHROPIC_API_KEY = 'test-key';
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const analyzer = new AIAnalyzer();
      const stats = createSuiteStats();

      const result = await analyzer.analyzeSuiteHealth([], stats, [], []);

      expect(result).toBeUndefined();
    });
  });

  describe('generateRecommendations', () => {
    it('generates flakiness recommendations for flaky tests', () => {
      const analyzer = new AIAnalyzer();
      const results = [
        createTestResult({ testId: 'test-1', flakinessScore: 0.5 }),
        createTestResult({ testId: 'test-2', flakinessScore: 0.8 }),
      ];
      const stats = createSuiteStats();

      const recommendations = analyzer.generateRecommendations(results, stats);

      const flakinessRec = recommendations.find(r => r.type === 'flakiness');
      expect(flakinessRec).toBeDefined();
      expect(flakinessRec?.affectedTests).toContain('test-1');
      expect(flakinessRec?.affectedTests).toContain('test-2');
      expect(flakinessRec?.icon).toBe('🔴');
    });

    it('does not generate flakiness recommendations for stable tests', () => {
      const analyzer = new AIAnalyzer();
      const results = [
        createTestResult({ flakinessScore: 0.1 }),
        createTestResult({ flakinessScore: 0.2 }),
      ];
      const stats = createSuiteStats();

      const recommendations = analyzer.generateRecommendations(results, stats);

      const flakinessRec = recommendations.find(r => r.type === 'flakiness');
      expect(flakinessRec).toBeUndefined();
    });

    it('generates retry recommendations for tests needing attention', () => {
      const analyzer = new AIAnalyzer();
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
      expect(retryRec).toBeDefined();
      expect(retryRec?.affectedTests).toContain('test-1');
      expect(retryRec?.icon).toBe('🔄');
    });

    it('generates performance recommendations for slowing tests', () => {
      const analyzer = new AIAnalyzer();
      const results = [
        createTestResult({ testId: 'test-1', performanceTrend: '↑ 50%' }),
        createTestResult({ testId: 'test-2', performanceTrend: '↓ 10%' }),
      ];
      const stats = createSuiteStats();

      const recommendations = analyzer.generateRecommendations(results, stats);

      const perfRec = recommendations.find(r => r.type === 'performance');
      expect(perfRec).toBeDefined();
      expect(perfRec?.affectedTests).toContain('test-1');
      expect(perfRec?.affectedTests).not.toContain('test-2');
      expect(perfRec?.icon).toBe('🐢');
    });

    it('generates suite pass rate recommendation when below 90%', () => {
      const analyzer = new AIAnalyzer();
      const results: TestResultData[] = [];
      const stats = createSuiteStats({ passRate: 75 });

      const recommendations = analyzer.generateRecommendations(results, stats);

      const suiteRec = recommendations.find(
        r => r.type === 'suite' && r.title === 'Improve Suite Pass Rate'
      );
      expect(suiteRec).toBeDefined();
      expect(suiteRec?.description).toContain('75%');
      expect(suiteRec?.icon).toBe('📊');
    });

    it('does not generate pass rate recommendation when at or above 90%', () => {
      const analyzer = new AIAnalyzer();
      const results: TestResultData[] = [];
      const stats = createSuiteStats({ passRate: 95 });

      const recommendations = analyzer.generateRecommendations(results, stats);

      const passRateRec = recommendations.find(
        r => r.type === 'suite' && r.title === 'Improve Suite Pass Rate'
      );
      expect(passRateRec).toBeUndefined();
    });

    it('generates stability recommendation when below 70', () => {
      const analyzer = new AIAnalyzer();
      const results: TestResultData[] = [];
      const stats = createSuiteStats({ averageStability: 55 });

      const recommendations = analyzer.generateRecommendations(results, stats);

      const stabilityRec = recommendations.find(
        r => r.type === 'suite' && r.title === 'Improve Suite Stability'
      );
      expect(stabilityRec).toBeDefined();
      expect(stabilityRec?.description).toContain('55');
      expect(stabilityRec?.icon).toBe('⚠️');
    });

    it('sorts recommendations by priority (highest first)', () => {
      const analyzer = new AIAnalyzer();
      const results = [
        createTestResult({ testId: 'test-1', flakinessScore: 0.5 }),
        createTestResult({ testId: 'test-2', performanceTrend: '↑ 50%' }),
      ];
      const stats = createSuiteStats({ passRate: 75, averageStability: 55 });

      const recommendations = analyzer.generateRecommendations(results, stats);

      for (let i = 0; i < recommendations.length - 1; i++) {
        expect(recommendations[i].priority).toBeGreaterThanOrEqual(
          recommendations[i + 1].priority
        );
      }
    });
  });

  describe('AI provider priority (fall-through behavior)', () => {
    it('prefers Anthropic when all keys are set', async () => {
      process.env.ANTHROPIC_API_KEY = 'anthropic-key';
      process.env.OPENAI_API_KEY = 'openai-key';
      process.env.GEMINI_API_KEY = 'gemini-key';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'Anthropic response' }],
        }),
      });

      const analyzer = new AIAnalyzer();
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.anything()
      );
    });

    it('falls back to OpenAI when only OpenAI and Gemini keys are set', async () => {
      process.env.OPENAI_API_KEY = 'openai-key';
      process.env.GEMINI_API_KEY = 'gemini-key';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'OpenAI response' } }],
        }),
      });

      const analyzer = new AIAnalyzer();
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.anything()
      );
    });

    it('uses Gemini when only Gemini key is set', async () => {
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

      const analyzer = new AIAnalyzer();
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        expect.anything()
      );
    });

    it('falls back to Copilot when only GITHUB_TOKEN is set', async () => {
      process.env.GITHUB_TOKEN = 'github-token';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Copilot response' } }],
        }),
      });

      const analyzer = new AIAnalyzer();
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://models.github.com/inference/chat/completions',
        expect.anything()
      );
    });

    it('falls back to Ollama when no keys are set but aiProvider is ollama', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Ollama response' } }],
        }),
      });

      const analyzer = new AIAnalyzer({ aiProvider: 'ollama' });
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/v1/chat/completions',
        expect.anything()
      );
    });
  });

  describe('GitHub Copilot provider', () => {
    it('sends correct request to GitHub Models API', async () => {
      process.env.GITHUB_TOKEN = 'test-github-token';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Fix the selector' } }],
        }),
      });

      const analyzer = new AIAnalyzer({ aiProvider: 'copilot' });
      const results = [
        createTestResult({
          status: 'failed',
          error: 'Element not found',
          title: 'Login test',
          file: 'login.spec.ts',
        }),
      ];

      await analyzer.analyzeFailed(results);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://models.github.com/inference/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-github-token',
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(results[0].aiSuggestion).toBe('Fix the selector');
    });

    it('uses claude-sonnet-4-20250514 as default model', async () => {
      process.env.GITHUB_TOKEN = 'test-github-token';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      const analyzer = new AIAnalyzer({ aiProvider: 'copilot' });
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.model).toBe('claude-sonnet-4-20250514');
    });

    it('allows custom copilot model', async () => {
      process.env.GITHUB_TOKEN = 'test-github-token';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      const analyzer = new AIAnalyzer({ aiProvider: 'copilot', copilotModel: 'gpt-4o' });
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.model).toBe('gpt-4o');
    });

    it('allows copilot model from COPILOT_MODEL env var', async () => {
      process.env.GITHUB_TOKEN = 'test-github-token';
      process.env.COPILOT_MODEL = 'o1-preview';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      const analyzer = new AIAnalyzer({ aiProvider: 'copilot' });
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.model).toBe('o1-preview');
    });

    it('throws on Copilot API error', async () => {
      process.env.GITHUB_TOKEN = 'test-github-token';
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const analyzer = new AIAnalyzer({ aiProvider: 'copilot' });
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get AI suggestion'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('handles empty choices array', async () => {
      process.env.GITHUB_TOKEN = 'test-github-token';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [],
        }),
      });

      const analyzer = new AIAnalyzer({ aiProvider: 'copilot' });
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      expect(results[0].aiSuggestion).toBe('No suggestion available');
    });

    it('analyzes clusters with Copilot', async () => {
      process.env.GITHUB_TOKEN = 'test-github-token';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Cluster fix' } }],
        }),
      });

      const analyzer = new AIAnalyzer({ aiProvider: 'copilot' });
      const clusters = [createFailureCluster()];

      await analyzer.analyzeClusters(clusters);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://models.github.com/inference/chat/completions',
        expect.anything()
      );
      expect(clusters[0].aiSuggestion).toBe('Cluster fix');
    });
  });

  describe('Ollama provider', () => {
    it('sends correct request to local Ollama server', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Local LLM suggestion' } }],
        }),
      });

      const analyzer = new AIAnalyzer({ aiProvider: 'ollama' });
      const results = [
        createTestResult({
          status: 'failed',
          error: 'Element not found',
          title: 'Search test',
          file: 'search.spec.ts',
        }),
      ];

      await analyzer.analyzeFailed(results);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(results[0].aiSuggestion).toBe('Local LLM suggestion');
    });

    it('uses codellama as default model', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      const analyzer = new AIAnalyzer({ aiProvider: 'ollama' });
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.model).toBe('codellama');
    });

    it('allows custom ollama model', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      const analyzer = new AIAnalyzer({ aiProvider: 'ollama', ollamaModel: 'llama3.2' });
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.model).toBe('llama3.2');
    });

    it('allows custom ollama base URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      const analyzer = new AIAnalyzer({ aiProvider: 'ollama', ollamaBaseUrl: 'http://my-server:8080' });
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://my-server:8080/v1/chat/completions',
        expect.anything()
      );
    });

    it('reads OLLAMA_BASE_URL and OLLAMA_MODEL from env vars', async () => {
      process.env.OLLAMA_BASE_URL = 'http://remote-ollama:11434';
      process.env.OLLAMA_MODEL = 'mistral';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      const analyzer = new AIAnalyzer({ aiProvider: 'ollama' });
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://remote-ollama:11434/v1/chat/completions',
        expect.anything()
      );

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.model).toBe('mistral');
    });

    it('strips trailing slash from base URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      const analyzer = new AIAnalyzer({ aiProvider: 'ollama', ollamaBaseUrl: 'http://localhost:11434/' });
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/v1/chat/completions',
        expect.anything()
      );
    });

    it('throws on Ollama API error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const analyzer = new AIAnalyzer({ aiProvider: 'ollama' });
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get AI suggestion'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('handles empty choices array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [],
        }),
      });

      const analyzer = new AIAnalyzer({ aiProvider: 'ollama' });
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      expect(results[0].aiSuggestion).toBe('No suggestion available');
    });

    it('analyzes clusters with Ollama', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Local cluster fix' } }],
        }),
      });

      const analyzer = new AIAnalyzer({ aiProvider: 'ollama' });
      const clusters = [createFailureCluster()];

      await analyzer.analyzeClusters(clusters);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/v1/chat/completions',
        expect.anything()
      );
      expect(clusters[0].aiSuggestion).toBe('Local cluster fix');
    });

    it('sends options.num_predict in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      const analyzer = new AIAnalyzer({ aiProvider: 'ollama' });
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.options.num_predict).toBe(512);
    });
  });

  describe('Explicit aiProvider selection', () => {
    it('uses copilot when aiProvider is set even if anthropic key exists', async () => {
      process.env.ANTHROPIC_API_KEY = 'anthropic-key';
      process.env.GITHUB_TOKEN = 'github-token';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Copilot response' } }],
        }),
      });

      const analyzer = new AIAnalyzer({ aiProvider: 'copilot' });
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://models.github.com/inference/chat/completions',
        expect.anything()
      );
    });

    it('uses ollama when aiProvider is set even if all keys exist', async () => {
      process.env.ANTHROPIC_API_KEY = 'anthropic-key';
      process.env.OPENAI_API_KEY = 'openai-key';
      process.env.GITHUB_TOKEN = 'github-token';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Ollama response' } }],
        }),
      });

      const analyzer = new AIAnalyzer({ aiProvider: 'ollama' });
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/v1/chat/completions',
        expect.anything()
      );
    });
  });

  describe('getActiveProvider', () => {
    it('returns explicit provider when set', () => {
      const analyzer = new AIAnalyzer({ aiProvider: 'copilot' });
      expect(analyzer.getActiveProvider()).toBe('copilot');
    });

    it('returns anthropic when ANTHROPIC_API_KEY is set', () => {
      process.env.ANTHROPIC_API_KEY = 'key';
      const analyzer = new AIAnalyzer();
      expect(analyzer.getActiveProvider()).toBe('anthropic');
    });

    it('returns copilot when only GITHUB_TOKEN is set', () => {
      process.env.GITHUB_TOKEN = 'token';
      const analyzer = new AIAnalyzer();
      expect(analyzer.getActiveProvider()).toBe('copilot');
    });

    it('returns ollama as last fallback', () => {
      const analyzer = new AIAnalyzer();
      expect(analyzer.getActiveProvider()).toBe('ollama');
    });
  });

  describe('Gemini API request format', () => {
    it('sends correct request body format', async () => {
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

      const analyzer = new AIAnalyzer();
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
      expect(Array.isArray(body.contents)).toBe(true);
      expect(body.contents[0].parts).toBeDefined();
      expect(body.contents[0].parts[0].text).toContain('My Test');

      // Verify generationConfig
      expect(body.generationConfig.maxOutputTokens).toBe(512);
    });

    it('handles empty candidates array', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [],
        }),
      });

      const analyzer = new AIAnalyzer();
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      expect(results[0].aiSuggestion).toBe('No suggestion available');
    });

    it('handles missing parts in response', async () => {
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

      const analyzer = new AIAnalyzer();
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      expect(results[0].aiSuggestion).toBe('No suggestion available');
    });

    it('throws on Gemini API error', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key';
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const analyzer = new AIAnalyzer();
      const results = [createTestResult({ status: 'failed', error: 'Error' })];

      await analyzer.analyzeFailed(results);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get AI suggestion'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
