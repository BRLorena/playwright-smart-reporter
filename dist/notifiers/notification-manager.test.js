"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const notification_manager_1 = require("./notification-manager");
vitest_1.vi.mock('./slack-notifier', () => ({
    SlackNotifier: vitest_1.vi.fn().mockImplementation(() => ({
        sendMessage: vitest_1.vi.fn().mockResolvedValue(undefined),
    })),
}));
vitest_1.vi.mock('./teams-notifier', () => ({
    TeamsNotifier: vitest_1.vi.fn().mockImplementation(() => ({
        sendMessage: vitest_1.vi.fn().mockResolvedValue(undefined),
    })),
}));
vitest_1.vi.mock('./pagerduty-notifier', () => ({
    PagerDutyNotifier: vitest_1.vi.fn().mockImplementation(() => ({
        trigger: vitest_1.vi.fn().mockResolvedValue(undefined),
    })),
}));
vitest_1.vi.mock('./email-notifier', () => ({
    EmailNotifier: vitest_1.vi.fn().mockImplementation(() => ({
        send: vitest_1.vi.fn().mockResolvedValue(undefined),
    })),
}));
vitest_1.vi.mock('./custom-webhook-notifier', () => ({
    CustomWebhookNotifier: vitest_1.vi.fn().mockImplementation(() => ({
        send: vitest_1.vi.fn().mockResolvedValue(undefined),
    })),
}));
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
function createRunSummary(overrides = {}) {
    return {
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
    };
}
(0, vitest_1.describe)('NotificationManager', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.describe)('conditions', () => {
        (0, vitest_1.it)('minFailures: does not notify when failures below threshold', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const config = {
                channel: 'slack',
                config: { webhookUrl: 'https://hooks.slack.com/test' },
                conditions: { minFailures: 5 },
            };
            const manager = new notification_manager_1.NotificationManager([config]);
            const results = [
                createTestResult({ status: 'failed', outcome: 'unexpected' }),
                createTestResult({ testId: '2', status: 'failed', outcome: 'unexpected' }),
            ];
            await manager.notify(results, Date.now());
            (0, vitest_1.expect)(SlackNotifier).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('minFailures: notifies when failures meet threshold', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const mockSendMessage = vitest_1.vi.fn().mockResolvedValue(undefined);
            vitest_1.vi.mocked(SlackNotifier).mockImplementationOnce(() => ({
                sendMessage: mockSendMessage,
            }));
            const config = {
                channel: 'slack',
                config: { webhookUrl: 'https://hooks.slack.com/test' },
                conditions: { minFailures: 1 },
            };
            const manager = new notification_manager_1.NotificationManager([config]);
            const results = [
                createTestResult({ status: 'failed', outcome: 'unexpected' }),
            ];
            await manager.notify(results, Date.now());
            (0, vitest_1.expect)(SlackNotifier).toHaveBeenCalled();
            (0, vitest_1.expect)(mockSendMessage).toHaveBeenCalledOnce();
            (0, vitest_1.expect)(mockSendMessage).toHaveBeenCalledWith(vitest_1.expect.stringContaining('1 failures'));
        });
        (0, vitest_1.it)('maxPassRate: does not notify when pass rate above threshold', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const config = {
                channel: 'slack',
                config: { webhookUrl: 'https://hooks.slack.com/test' },
                conditions: { maxPassRate: 50 },
            };
            const manager = new notification_manager_1.NotificationManager([config]);
            const results = [
                createTestResult({ status: 'passed' }),
                createTestResult({ testId: '2', status: 'passed' }),
            ];
            await manager.notify(results, Date.now());
            (0, vitest_1.expect)(SlackNotifier).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('tags: only notifies when tagged tests fail', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const mockSendMessage = vitest_1.vi.fn().mockResolvedValue(undefined);
            vitest_1.vi.mocked(SlackNotifier).mockImplementationOnce(() => ({
                sendMessage: mockSendMessage,
            }));
            const config = {
                channel: 'slack',
                config: { webhookUrl: 'https://hooks.slack.com/test' },
                conditions: { tags: ['@critical'] },
            };
            const manager = new notification_manager_1.NotificationManager([config]);
            const results = [
                createTestResult({
                    status: 'failed',
                    outcome: 'unexpected',
                    tags: ['@critical'],
                }),
            ];
            await manager.notify(results, Date.now());
            (0, vitest_1.expect)(SlackNotifier).toHaveBeenCalled();
            (0, vitest_1.expect)(mockSendMessage).toHaveBeenCalledOnce();
        });
        (0, vitest_1.it)('tags: does not notify when only non-tagged tests fail', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const config = {
                channel: 'slack',
                config: { webhookUrl: 'https://hooks.slack.com/test' },
                conditions: { tags: ['@critical'] },
            };
            const manager = new notification_manager_1.NotificationManager([config]);
            const results = [
                createTestResult({
                    status: 'failed',
                    outcome: 'unexpected',
                    tags: ['@smoke'],
                }),
            ];
            await manager.notify(results, Date.now());
            (0, vitest_1.expect)(SlackNotifier).not.toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('stabilityGradeDrop', () => {
        (0, vitest_1.it)('notifies when stability grade has dropped', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const mockSendMessage = vitest_1.vi.fn().mockResolvedValue(undefined);
            vitest_1.vi.mocked(SlackNotifier).mockImplementationOnce(() => ({
                sendMessage: mockSendMessage,
            }));
            const config = {
                channel: 'slack',
                config: { webhookUrl: 'https://hooks.slack.com/test' },
                conditions: { stabilityGradeDrop: true },
            };
            const manager = new notification_manager_1.NotificationManager([config]);
            const results = [
                createTestResult({
                    stabilityScore: { overall: 60, flakiness: 60, performance: 60, reliability: 60, grade: 'D', needsAttention: true },
                }),
            ];
            const comparison = {
                baselineRun: createRunSummary({ passRate: 90 }),
                currentRun: createRunSummary({ passRate: 60 }),
                changes: { newFailures: [], fixedTests: [], newTests: [], regressions: [], improvements: [] },
            };
            await manager.notify(results, Date.now(), comparison);
            (0, vitest_1.expect)(SlackNotifier).toHaveBeenCalled();
            (0, vitest_1.expect)(mockSendMessage).toHaveBeenCalledOnce();
        });
        (0, vitest_1.it)('does not notify when stability grade has improved', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const config = {
                channel: 'slack',
                config: { webhookUrl: 'https://hooks.slack.com/test' },
                conditions: { stabilityGradeDrop: true },
            };
            const manager = new notification_manager_1.NotificationManager([config]);
            const results = [
                createTestResult({
                    stabilityScore: { overall: 95, flakiness: 95, performance: 95, reliability: 95, grade: 'A', needsAttention: false },
                }),
            ];
            const comparison = {
                baselineRun: createRunSummary({ passRate: 60 }),
                currentRun: createRunSummary({ passRate: 95 }),
                changes: { newFailures: [], fixedTests: [], newTests: [], regressions: [], improvements: [] },
            };
            await manager.notify(results, Date.now(), comparison);
            (0, vitest_1.expect)(SlackNotifier).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('does not notify when stabilityGradeDrop is true but no comparison data', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const config = {
                channel: 'slack',
                config: { webhookUrl: 'https://hooks.slack.com/test' },
                conditions: { stabilityGradeDrop: true },
            };
            const manager = new notification_manager_1.NotificationManager([config]);
            const results = [
                createTestResult({
                    stabilityScore: { overall: 60, flakiness: 60, performance: 60, reliability: 60, grade: 'D', needsAttention: true },
                }),
            ];
            await manager.notify(results, Date.now());
            (0, vitest_1.expect)(SlackNotifier).not.toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('template rendering', () => {
        (0, vitest_1.it)('renders template with all variables', async () => {
            const sendMessageSpy = vitest_1.vi.fn().mockResolvedValue(undefined);
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            vitest_1.vi.mocked(SlackNotifier).mockImplementationOnce(() => ({
                sendMessage: sendMessageSpy,
            }));
            const config = {
                channel: 'slack',
                config: { webhookUrl: 'https://hooks.slack.com/test' },
                template: '{{total}} tests, {{passed}} passed, {{failed}} failed, {{skipped}} skipped, {{flaky}} flaky, {{passRate}}% pass rate, {{duration}}s, grade {{grade}}, failures: {{failedTests}}',
            };
            const manager = new notification_manager_1.NotificationManager([config]);
            const results = [
                createTestResult({ status: 'passed' }),
                createTestResult({ testId: '2', title: 'Failing Test', status: 'failed', outcome: 'unexpected' }),
            ];
            await manager.notify(results, Date.now());
            (0, vitest_1.expect)(sendMessageSpy).toHaveBeenCalledTimes(1);
            const message = sendMessageSpy.mock.calls[0][0];
            (0, vitest_1.expect)(message).toContain('2 tests');
            (0, vitest_1.expect)(message).toContain('1 passed');
            (0, vitest_1.expect)(message).toContain('1 failed');
            (0, vitest_1.expect)(message).toContain('0 skipped');
            (0, vitest_1.expect)(message).toContain('0 flaky');
            (0, vitest_1.expect)(message).toContain('50%');
            (0, vitest_1.expect)(message).toContain('Failing Test');
        });
    });
    (0, vitest_1.describe)('channel dispatch', () => {
        (0, vitest_1.it)('dispatches to slack', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const mockSendMessage = vitest_1.vi.fn().mockResolvedValue(undefined);
            vitest_1.vi.mocked(SlackNotifier).mockImplementationOnce(() => ({
                sendMessage: mockSendMessage,
            }));
            const config = {
                channel: 'slack',
                config: { webhookUrl: 'https://hooks.slack.com/test' },
            };
            const manager = new notification_manager_1.NotificationManager([config]);
            await manager.notify([createTestResult()], Date.now());
            (0, vitest_1.expect)(SlackNotifier).toHaveBeenCalledWith('https://hooks.slack.com/test');
            (0, vitest_1.expect)(mockSendMessage).toHaveBeenCalledOnce();
        });
        (0, vitest_1.it)('dispatches to teams', async () => {
            const { TeamsNotifier } = await Promise.resolve().then(() => __importStar(require('./teams-notifier')));
            const mockSendMessage = vitest_1.vi.fn().mockResolvedValue(undefined);
            vitest_1.vi.mocked(TeamsNotifier).mockImplementationOnce(() => ({ sendMessage: mockSendMessage }));
            const config = {
                channel: 'teams',
                config: { webhookUrl: 'https://teams.webhook/test' },
            };
            const manager = new notification_manager_1.NotificationManager([config]);
            await manager.notify([createTestResult()], Date.now());
            (0, vitest_1.expect)(TeamsNotifier).toHaveBeenCalledWith('https://teams.webhook/test');
            (0, vitest_1.expect)(mockSendMessage).toHaveBeenCalledOnce();
        });
        (0, vitest_1.it)('dispatches to pagerduty', async () => {
            const { PagerDutyNotifier } = await Promise.resolve().then(() => __importStar(require('./pagerduty-notifier')));
            const mockTrigger = vitest_1.vi.fn().mockResolvedValue(undefined);
            vitest_1.vi.mocked(PagerDutyNotifier).mockImplementationOnce(() => ({ trigger: mockTrigger }));
            const config = {
                channel: 'pagerduty',
                config: { routingKey: 'test-routing-key' },
            };
            const manager = new notification_manager_1.NotificationManager([config]);
            await manager.notify([createTestResult()], Date.now());
            (0, vitest_1.expect)(PagerDutyNotifier).toHaveBeenCalledWith('test-routing-key');
            (0, vitest_1.expect)(mockTrigger).toHaveBeenCalledOnce();
        });
        (0, vitest_1.it)('dispatches to email', async () => {
            const { EmailNotifier } = await Promise.resolve().then(() => __importStar(require('./email-notifier')));
            const mockSend = vitest_1.vi.fn().mockResolvedValue(undefined);
            vitest_1.vi.mocked(EmailNotifier).mockImplementationOnce(() => ({ send: mockSend }));
            const config = {
                channel: 'email',
                config: { to: 'test@example.com', from: 'noreply@example.com' },
            };
            const manager = new notification_manager_1.NotificationManager([config]);
            await manager.notify([createTestResult()], Date.now());
            (0, vitest_1.expect)(EmailNotifier).toHaveBeenCalledWith({ to: 'test@example.com', from: 'noreply@example.com' });
            (0, vitest_1.expect)(mockSend).toHaveBeenCalledOnce();
        });
        (0, vitest_1.it)('dispatches to custom webhook', async () => {
            const { CustomWebhookNotifier } = await Promise.resolve().then(() => __importStar(require('./custom-webhook-notifier')));
            const mockSend = vitest_1.vi.fn().mockResolvedValue(undefined);
            vitest_1.vi.mocked(CustomWebhookNotifier).mockImplementationOnce(() => ({ send: mockSend }));
            const config = {
                channel: 'webhook',
                config: { url: 'https://custom.webhook/endpoint' },
            };
            const manager = new notification_manager_1.NotificationManager([config]);
            await manager.notify([createTestResult()], Date.now());
            (0, vitest_1.expect)(CustomWebhookNotifier).toHaveBeenCalledWith('https://custom.webhook/endpoint');
            (0, vitest_1.expect)(mockSend).toHaveBeenCalledOnce();
        });
    });
    (0, vitest_1.describe)('error handling', () => {
        (0, vitest_1.it)('failed notifier does not crash others', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const { TeamsNotifier } = await Promise.resolve().then(() => __importStar(require('./teams-notifier')));
            // Make slack throw
            vitest_1.vi.mocked(SlackNotifier).mockImplementationOnce(() => ({
                sendMessage: vitest_1.vi.fn().mockRejectedValue(new Error('Slack error')),
            }));
            const consoleSpy = vitest_1.vi.spyOn(console, 'error').mockImplementation(() => { });
            const configs = [
                { channel: 'slack', config: { webhookUrl: 'https://hooks.slack.com/test' } },
                { channel: 'teams', config: { webhookUrl: 'https://teams.webhook/test' } },
            ];
            const manager = new notification_manager_1.NotificationManager(configs);
            await manager.notify([createTestResult()], Date.now());
            (0, vitest_1.expect)(consoleSpy).toHaveBeenCalledWith(vitest_1.expect.stringContaining('Failed to send slack notification'));
            (0, vitest_1.expect)(TeamsNotifier).toHaveBeenCalled();
        });
    });
});
