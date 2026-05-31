"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIAnalyzer = void 0;
/**
 * AI-powered analysis for test failures and recommendations.
 *
 * Supported providers (in default priority order):
 *   Anthropic  – ANTHROPIC_API_KEY
 *   OpenAI     – OPENAI_API_KEY
 *   Gemini     – GEMINI_API_KEY
 *   Copilot    – GITHUB_TOKEN  (GitHub Models API)
 *   Ollama     – local server  (no key required)
 */
class AIAnalyzer {
    constructor(options = {}) {
        this.anthropicKey = process.env.ANTHROPIC_API_KEY;
        this.openaiKey = process.env.OPENAI_API_KEY;
        this.geminiKey = process.env.GEMINI_API_KEY;
        this.githubToken = process.env.GITHUB_TOKEN;
        this.explicitProvider = options.aiProvider;
        this.ollamaBaseUrl = options.ollamaBaseUrl ?? process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
        this.ollamaModel = options.ollamaModel ?? process.env.OLLAMA_MODEL ?? 'codellama';
        this.copilotModel = options.copilotModel ?? process.env.COPILOT_MODEL ?? 'claude-sonnet-4-20250514';
        this.geminiModel = options.geminiModel ?? process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
    }
    async analyzeFailed(results) {
        const failedTests = results.filter(r => r.status === 'failed' || r.status === 'timedOut');
        if (failedTests.length === 0)
            return;
        if (!this.isAvailable()) {
            console.log('💡 Tip: Set ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, or GITHUB_TOKEN for AI failure analysis. You can also use a local Ollama instance.');
            return;
        }
        console.log(`\n🤖 Analyzing ${failedTests.length} failure(s) with AI (${this.getActiveProvider()})...`);
        const BATCH_SIZE = 3;
        for (let i = 0; i < failedTests.length; i += BATCH_SIZE) {
            const batch = failedTests.slice(i, i + BATCH_SIZE);
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(failedTests.length / BATCH_SIZE);
            console.log(`   Batch ${batchNum}/${totalBatches} (${batch.length} tests)...`);
            const promises = batch.map(async (test) => {
                try {
                    const prompt = test.aiPrompt ?? this.buildFailurePrompt(test);
                    test.aiSuggestion = await this.callAI(prompt);
                }
                catch (err) {
                    console.error(`Failed to get AI suggestion for "${test.title}":`, err);
                }
            });
            await Promise.all(promises);
        }
        console.log(`   ✅ AI analysis complete`);
    }
    async analyzeClusters(clusters) {
        if (clusters.length === 0)
            return;
        if (!this.isAvailable())
            return;
        console.log(`\n🤖 Analyzing ${clusters.length} failure cluster(s) with AI (${this.getActiveProvider()})...`);
        for (const cluster of clusters) {
            try {
                const prompt = this.buildClusterPrompt(cluster);
                cluster.aiSuggestion = await this.callAI(prompt);
            }
            catch (err) {
                console.error(`Failed to get AI suggestion for cluster "${cluster.errorType}":`, err);
            }
        }
    }
    async analyzeSuiteHealth(results, stats, failureClusters, historySummaries) {
        if (!this.isAvailable())
            return undefined;
        console.log(`\n🤖 Generating AI suite health summary (${this.getActiveProvider()})...`);
        const flakyTests = results.filter(r => r.flakinessScore !== undefined && r.flakinessScore >= 0.3);
        const slowTests = results.filter(r => r.performanceTrend?.startsWith('↑'));
        const retryTests = results.filter(r => r.retryInfo?.needsAttention);
        // Build pass-rate trend from recent history
        const recentRuns = historySummaries.slice(-5);
        const trendLine = recentRuns.length > 0
            ? recentRuns.map(s => `${s.passRate}%`).join(' → ') + ` → ${stats.passRate}% (current)`
            : `${stats.passRate}% (no prior history)`;
        const prompt = this.buildSuiteHealthPrompt(stats, failureClusters, flakyTests, slowTests, retryTests, trendLine);
        try {
            const summary = await this.callAI(prompt);
            console.log('   ✅ Suite health summary generated');
            return summary;
        }
        catch (err) {
            console.error('Failed to generate suite health summary:', err);
            return undefined;
        }
    }
    generateRecommendations(results, stats) {
        const recommendations = [];
        // Flakiness recommendations
        const flakyTests = results.filter(r => r.flakinessScore && r.flakinessScore >= 0.3);
        if (flakyTests.length > 0) {
            recommendations.push({
                type: 'flakiness',
                priority: 90,
                title: 'Fix Flaky Tests',
                description: `${flakyTests.length} test(s) are showing flaky behavior (pass/fail inconsistency)`,
                action: 'Review test isolation, add proper waits, investigate race conditions',
                affectedTests: flakyTests.map(t => t.testId),
                icon: '🔴',
            });
        }
        // Retry recommendations
        const retryTests = results.filter(r => r.retryInfo?.needsAttention);
        if (retryTests.length > 0) {
            recommendations.push({
                type: 'retry',
                priority: 80,
                title: 'Reduce Test Retries',
                description: `${retryTests.length} test(s) frequently require retries to pass`,
                action: 'Identify root cause of instability, improve test robustness',
                affectedTests: retryTests.map(t => t.testId),
                icon: '🔄',
            });
        }
        // Performance recommendations
        const slowTests = results.filter(r => r.performanceTrend?.startsWith('↑'));
        if (slowTests.length > 0) {
            recommendations.push({
                type: 'performance',
                priority: 60,
                title: 'Improve Test Performance',
                description: `${slowTests.length} test(s) have gotten significantly slower`,
                action: 'Profile slow steps, optimize waits, consider test parallelization',
                affectedTests: slowTests.map(t => t.testId),
                icon: '🐢',
            });
        }
        // Suite health recommendations
        if (stats.passRate < 90) {
            recommendations.push({
                type: 'suite',
                priority: 95,
                title: 'Improve Suite Pass Rate',
                description: `Overall pass rate is ${stats.passRate}% (target: 90%+)`,
                action: 'Focus on fixing failed tests before adding new tests',
                affectedTests: [],
                icon: '📊',
            });
        }
        if (stats.averageStability < 70) {
            recommendations.push({
                type: 'suite',
                priority: 85,
                title: 'Improve Suite Stability',
                description: `Average stability score is ${stats.averageStability}/100 (target: 70+)`,
                action: 'Address flakiness, retries, and performance issues systematically',
                affectedTests: [],
                icon: '⚠️',
            });
        }
        // Sort by priority (highest first)
        return recommendations.sort((a, b) => b.priority - a.priority);
    }
    buildFailurePrompt(test) {
        return `Analyze this Playwright test failure and suggest a fix. Be concise (2-3 sentences max).

Test: ${test.title}
File: ${test.file}
Error:
${test.error || 'Unknown error'}

Provide a brief, actionable suggestion to fix this failure.`;
    }
    buildClusterPrompt(cluster) {
        const testTitles = cluster.tests.slice(0, 5).map(t => t.title).join('\n- ');
        const moreTests = cluster.count > 5 ? `\n... and ${cluster.count - 5} more` : '';
        return `Analyze this group of similar test failures and suggest a fix. Be concise (2-3 sentences max).

Error Type: ${cluster.errorType}
Number of Affected Tests: ${cluster.count}
Example Tests:
- ${testTitles}${moreTests}

Example Error:
${cluster.tests[0].error || 'Unknown error'}

Provide a brief, actionable suggestion to fix these failures.`;
    }
    /**
     * Call AI API — dispatches to the appropriate provider.
     *
     * If `aiProvider` was set explicitly in the config, only that provider is tried.
     * Otherwise the priority is: Anthropic > OpenAI > Gemini > Copilot > Ollama.
     */
    async callAI(prompt) {
        // Explicit provider selection
        if (this.explicitProvider) {
            switch (this.explicitProvider) {
                case 'anthropic': return this.callAnthropic(prompt);
                case 'openai': return this.callOpenAI(prompt);
                case 'gemini': return this.callGemini(prompt);
                case 'copilot': return this.callCopilot(prompt);
                case 'ollama': return this.callOllama(prompt);
            }
        }
        // Auto-detect by available credentials
        if (this.anthropicKey) {
            return this.callAnthropic(prompt);
        }
        else if (this.openaiKey) {
            return this.callOpenAI(prompt);
        }
        else if (this.geminiKey) {
            return this.callGemini(prompt);
        }
        else if (this.githubToken) {
            return this.callCopilot(prompt);
        }
        // Ollama doesn't require a key — try it as last resort
        return this.callOllama(prompt);
    }
    buildSuiteHealthPrompt(stats, clusters, flakyTests, slowTests, retryTests, trendLine) {
        const clusterSummary = clusters.length > 0
            ? clusters.slice(0, 5).map(c => `- ${c.errorType} (${c.count} tests)`).join('\n')
            : 'None';
        const flakyList = flakyTests.length > 0
            ? flakyTests.slice(0, 5).map(t => `- ${t.title} (${Math.round((t.flakinessScore ?? 0) * 100)}% failure rate)`).join('\n')
            : 'None';
        const slowList = slowTests.length > 0
            ? slowTests.slice(0, 5).map(t => `- ${t.title} (${t.performanceTrend})`).join('\n')
            : 'None';
        return `You are a test suite health analyst. Write a concise executive summary (2-4 sentences) of this Playwright test suite's health. Use natural language, be specific about numbers, and highlight the most actionable insight. Do not use bullet points or headers — write flowing prose.

Suite Stats:
- Total: ${stats.total} tests
- Passed: ${stats.passed}, Failed: ${stats.failed}, Skipped: ${stats.skipped}
- Flaky: ${stats.flaky}, Slow: ${stats.slow}
- Pass Rate: ${stats.passRate}%
- Average Stability: ${stats.averageStability}/100

Pass Rate Trend: ${trendLine}

Failure Clusters:
${clusterSummary}

Flaky Tests:
${flakyList}

Performance Regressions:
${slowList}

Tests Needing Retries: ${retryTests.length}

Write the summary now.`;
    }
    async callAnthropic(prompt) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.anthropicKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 256,
                messages: [{ role: 'user', content: prompt }],
            }),
        });
        if (!response.ok) {
            throw new Error(`Anthropic API error: ${response.status}`);
        }
        const data = (await response.json());
        return data.content[0]?.text || 'No suggestion available';
    }
    /**
     * Call OpenAI API
     */
    async callOpenAI(prompt) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.openaiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                max_tokens: 256,
                messages: [{ role: 'user', content: prompt }],
            }),
        });
        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }
        const data = (await response.json());
        return data.choices[0]?.message?.content || 'No suggestion available';
    }
    /**
     * Call Gemini API
     */
    async callGemini(prompt) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': this.geminiKey,
            },
            body: JSON.stringify({
                contents: [{
                        parts: [{ text: prompt }],
                    }],
                generationConfig: {
                    maxOutputTokens: 512,
                },
            }),
        });
        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }
        const data = (await response.json());
        return data.candidates[0]?.content?.parts[0]?.text || 'No suggestion available';
    }
    /**
     * Call GitHub Copilot via the GitHub Models API (OpenAI-compatible)
     * Requires GITHUB_TOKEN env var (from `gh auth token` or a PAT with copilot scope)
     */
    async callCopilot(prompt) {
        const token = this.githubToken;
        if (!token) {
            throw new Error('GitHub Copilot requires GITHUB_TOKEN env var (run `gh auth token` or use a PAT with copilot scope)');
        }
        const response = await fetch('https://models.github.com/inference/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                model: this.copilotModel,
                max_tokens: 512,
                messages: [{ role: 'user', content: prompt }],
            }),
        });
        if (!response.ok) {
            throw new Error(`GitHub Copilot API error: ${response.status}`);
        }
        const data = (await response.json());
        return data.choices[0]?.message?.content || 'No suggestion available';
    }
    /**
     * Call Ollama local LLM (OpenAI-compatible API)
     * No API key required — Ollama must be running locally (default: http://localhost:11434)
     */
    async callOllama(prompt) {
        const baseUrl = this.ollamaBaseUrl.replace(/\/+$/, '');
        const response = await fetch(`${baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.ollamaModel,
                messages: [{ role: 'user', content: prompt }],
                options: {
                    num_predict: 512,
                },
            }),
        });
        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`);
        }
        const data = (await response.json());
        return data.choices[0]?.message?.content || 'No suggestion available';
    }
    /**
     * Check if AI analysis is available.
     *
     * When an explicit provider is set, checks that the required credentials exist
     * (Ollama always returns true since it needs no key).
     * Otherwise returns true if any credential is available OR if ollama was explicitly selected.
     */
    isAvailable() {
        if (this.explicitProvider) {
            switch (this.explicitProvider) {
                case 'anthropic': return !!this.anthropicKey;
                case 'openai': return !!this.openaiKey;
                case 'gemini': return !!this.geminiKey;
                case 'copilot': return !!this.githubToken;
                case 'ollama': return true; // No key needed
            }
        }
        return !!(this.anthropicKey || this.openaiKey || this.geminiKey || this.githubToken);
    }
    /**
     * Get the resolved provider name (for logging / debugging)
     */
    getActiveProvider() {
        if (this.explicitProvider)
            return this.explicitProvider;
        if (this.anthropicKey)
            return 'anthropic';
        if (this.openaiKey)
            return 'openai';
        if (this.geminiKey)
            return 'gemini';
        if (this.githubToken)
            return 'copilot';
        return 'ollama';
    }
}
exports.AIAnalyzer = AIAnalyzer;
