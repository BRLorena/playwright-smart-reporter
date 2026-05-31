import type { TestResultData, TestRecommendation, FailureCluster, SuiteStats, RunSummary } from '../types';
/** Supported AI provider identifiers */
export type AIProvider = 'anthropic' | 'openai' | 'gemini' | 'copilot' | 'ollama';
/** Options forwarded from SmartReporterOptions that are relevant to the AI layer */
export interface AIAnalyzerOptions {
    aiProvider?: AIProvider;
    ollamaBaseUrl?: string;
    ollamaModel?: string;
    copilotModel?: string;
    geminiModel?: string;
}
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
export declare class AIAnalyzer {
    private anthropicKey?;
    private openaiKey?;
    private geminiKey?;
    private githubToken?;
    private ollamaBaseUrl;
    private ollamaModel;
    private copilotModel;
    private geminiModel;
    private explicitProvider?;
    constructor(options?: AIAnalyzerOptions);
    analyzeFailed(results: TestResultData[]): Promise<void>;
    analyzeClusters(clusters: FailureCluster[]): Promise<void>;
    analyzeSuiteHealth(results: TestResultData[], stats: SuiteStats, failureClusters: FailureCluster[], historySummaries: RunSummary[]): Promise<string | undefined>;
    generateRecommendations(results: TestResultData[], stats: SuiteStats): TestRecommendation[];
    private buildFailurePrompt;
    private buildClusterPrompt;
    /**
     * Call AI API — dispatches to the appropriate provider.
     *
     * If `aiProvider` was set explicitly in the config, only that provider is tried.
     * Otherwise the priority is: Anthropic > OpenAI > Gemini > Copilot > Ollama.
     */
    private callAI;
    private buildSuiteHealthPrompt;
    private callAnthropic;
    /**
     * Call OpenAI API
     */
    private callOpenAI;
    /**
     * Call Gemini API
     */
    private callGemini;
    /**
     * Call GitHub Copilot via the GitHub Models API (OpenAI-compatible)
     * Requires GITHUB_TOKEN env var (from `gh auth token` or a PAT with copilot scope)
     */
    private callCopilot;
    /**
     * Call Ollama local LLM (OpenAI-compatible API)
     * No API key required — Ollama must be running locally (default: http://localhost:11434)
     */
    private callOllama;
    /**
     * Check if AI analysis is available.
     *
     * When an explicit provider is set, checks that the required credentials exist
     * (Ollama always returns true since it needs no key).
     * Otherwise returns true if any credential is available OR if ollama was explicitly selected.
     */
    isAvailable(): boolean;
    /**
     * Get the resolved provider name (for logging / debugging)
     */
    getActiveProvider(): string;
}
