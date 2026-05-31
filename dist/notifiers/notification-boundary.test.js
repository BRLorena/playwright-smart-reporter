"use strict";
/**
 * Notification Condition Boundary Tests
 *
 * These tests target the exact threshold edges that the existing
 * notification-manager.test.ts does not cover:
 *
 *   - minFailures: exactly at threshold (notify) vs one below (no notify)
 *   - maxPassRate: exactly at threshold (notify) vs one above (no notify)
 *   - empty results array: no crash, no notification
 *   - all-skipped results: 0% pass rate, 0 failures — should not notify on minFailures
 *   - combined conditions: both minFailures AND maxPassRate must be satisfied
 *   - zero minFailures threshold: always fires (edge: 0 failures still >= 0)
 *   - maxPassRate = 100: only fires when ALL tests pass
 *   - maxPassRate = 0: fires only when pass rate is 0% (i.e. only at exactly 0%)
 */
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
// ---------------------------------------------------------------------------
// Mock all notifier implementations so we don't make real network calls
// ---------------------------------------------------------------------------
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
// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------
function makeResult(overrides = {}) {
    return {
        testId: `test-${Math.random()}`,
        title: 'A test',
        file: 'spec.ts',
        status: 'passed',
        duration: 500,
        retry: 0,
        steps: [],
        history: [],
        ...overrides,
    };
}
function makeFailure(overrides = {}) {
    return makeResult({ status: 'failed', outcome: 'unexpected', ...overrides });
}
function makePass() {
    return makeResult({ status: 'passed', outcome: 'expected' });
}
function makeSkipped() {
    return makeResult({ status: 'skipped', outcome: 'skipped' });
}
function slackConfig(conditions) {
    return {
        channel: 'slack',
        config: { webhookUrl: 'https://hooks.slack.com/test' },
        conditions,
    };
}
// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
(0, vitest_1.describe)('Notification boundary conditions', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    // =========================================================================
    // minFailures threshold
    // =========================================================================
    (0, vitest_1.describe)('minFailures boundary', () => {
        (0, vitest_1.it)('notifies when failures equal minFailures threshold (exactly 3)', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const mockSendMessage = vitest_1.vi.fn().mockResolvedValue(undefined);
            vitest_1.vi.mocked(SlackNotifier).mockImplementationOnce(() => ({
                sendMessage: mockSendMessage,
            }));
            const manager = new notification_manager_1.NotificationManager([slackConfig({ minFailures: 3 })]);
            const results = [makeFailure(), makeFailure(), makeFailure()];
            await manager.notify(results, Date.now());
            (0, vitest_1.expect)(SlackNotifier).toHaveBeenCalled();
            (0, vitest_1.expect)(mockSendMessage).toHaveBeenCalledOnce();
            (0, vitest_1.expect)(mockSendMessage).toHaveBeenCalledWith(vitest_1.expect.stringContaining('3 failures'));
        });
        (0, vitest_1.it)('does NOT notify when failures are one below minFailures threshold (2 < 3)', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const manager = new notification_manager_1.NotificationManager([slackConfig({ minFailures: 3 })]);
            const results = [makeFailure(), makeFailure()];
            await manager.notify(results, Date.now());
            (0, vitest_1.expect)(SlackNotifier).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('notifies when failures exceed minFailures threshold (4 > 3)', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const mockSendMessage = vitest_1.vi.fn().mockResolvedValue(undefined);
            vitest_1.vi.mocked(SlackNotifier).mockImplementationOnce(() => ({
                sendMessage: mockSendMessage,
            }));
            const manager = new notification_manager_1.NotificationManager([slackConfig({ minFailures: 3 })]);
            const results = [makeFailure(), makeFailure(), makeFailure(), makeFailure()];
            await manager.notify(results, Date.now());
            (0, vitest_1.expect)(SlackNotifier).toHaveBeenCalled();
            (0, vitest_1.expect)(mockSendMessage).toHaveBeenCalledOnce();
        });
        (0, vitest_1.it)('minFailures: 1 — notifies on a single failure', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const mockSendMessage = vitest_1.vi.fn().mockResolvedValue(undefined);
            vitest_1.vi.mocked(SlackNotifier).mockImplementationOnce(() => ({
                sendMessage: mockSendMessage,
            }));
            const manager = new notification_manager_1.NotificationManager([slackConfig({ minFailures: 1 })]);
            await manager.notify([makeFailure()], Date.now());
            (0, vitest_1.expect)(SlackNotifier).toHaveBeenCalled();
            (0, vitest_1.expect)(mockSendMessage).toHaveBeenCalledOnce();
        });
        (0, vitest_1.it)('minFailures: 1 — does NOT notify on zero failures', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const manager = new notification_manager_1.NotificationManager([slackConfig({ minFailures: 1 })]);
            await manager.notify([makePass(), makePass()], Date.now());
            (0, vitest_1.expect)(SlackNotifier).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('minFailures: 0 — notifies even with zero failures (>= 0 is always true)', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const mockSendMessage = vitest_1.vi.fn().mockResolvedValue(undefined);
            vitest_1.vi.mocked(SlackNotifier).mockImplementationOnce(() => ({
                sendMessage: mockSendMessage,
            }));
            const manager = new notification_manager_1.NotificationManager([slackConfig({ minFailures: 0 })]);
            // No failures at all — but 0 >= 0 so condition passes
            await manager.notify([makePass()], Date.now());
            (0, vitest_1.expect)(SlackNotifier).toHaveBeenCalled();
            (0, vitest_1.expect)(mockSendMessage).toHaveBeenCalledOnce();
        });
    });
    // =========================================================================
    // maxPassRate threshold
    // =========================================================================
    (0, vitest_1.describe)('maxPassRate boundary', () => {
        (0, vitest_1.it)('notifies when pass rate equals maxPassRate threshold (exactly 80%)', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const mockSendMessage = vitest_1.vi.fn().mockResolvedValue(undefined);
            vitest_1.vi.mocked(SlackNotifier).mockImplementationOnce(() => ({
                sendMessage: mockSendMessage,
            }));
            const manager = new notification_manager_1.NotificationManager([slackConfig({ maxPassRate: 80 })]);
            // 8 passed, 2 failed → passRate = round(8/10*100) = 80
            const results = [
                ...Array(8).fill(null).map(() => makePass()),
                makeFailure(),
                makeFailure(),
            ];
            await manager.notify(results, Date.now());
            (0, vitest_1.expect)(SlackNotifier).toHaveBeenCalled();
            (0, vitest_1.expect)(mockSendMessage).toHaveBeenCalledOnce();
        });
        (0, vitest_1.it)('does NOT notify when pass rate is one percentage point above maxPassRate (81% > 80%)', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const manager = new notification_manager_1.NotificationManager([slackConfig({ maxPassRate: 80 })]);
            // 81 passed, 19 failed → passRate = round(81/100*100) = 81
            const results = [
                ...Array(81).fill(null).map(() => makePass()),
                ...Array(19).fill(null).map(() => makeFailure()),
            ];
            await manager.notify(results, Date.now());
            (0, vitest_1.expect)(SlackNotifier).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('notifies when pass rate is below maxPassRate threshold (79% < 80%)', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const mockSendMessage = vitest_1.vi.fn().mockResolvedValue(undefined);
            vitest_1.vi.mocked(SlackNotifier).mockImplementationOnce(() => ({
                sendMessage: mockSendMessage,
            }));
            const manager = new notification_manager_1.NotificationManager([slackConfig({ maxPassRate: 80 })]);
            // 79 passed, 21 failed → passRate = round(79/100*100) = 79
            const results = [
                ...Array(79).fill(null).map(() => makePass()),
                ...Array(21).fill(null).map(() => makeFailure()),
            ];
            await manager.notify(results, Date.now());
            (0, vitest_1.expect)(SlackNotifier).toHaveBeenCalled();
            (0, vitest_1.expect)(mockSendMessage).toHaveBeenCalledOnce();
        });
        (0, vitest_1.it)('maxPassRate: 100 — does NOT notify when all tests pass (100% pass rate)', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const mockSendMessage = vitest_1.vi.fn().mockResolvedValue(undefined);
            vitest_1.vi.mocked(SlackNotifier).mockImplementationOnce(() => ({
                sendMessage: mockSendMessage,
            }));
            const manager = new notification_manager_1.NotificationManager([slackConfig({ maxPassRate: 100 })]);
            const results = Array(5).fill(null).map(() => makePass());
            await manager.notify(results, Date.now());
            // passRate (100) is NOT > maxPassRate (100), so condition is met → should notify
            // The check is: if passRate > maxPassRate, return false
            // 100 > 100 is false, so the condition passes and notification IS sent
            (0, vitest_1.expect)(SlackNotifier).toHaveBeenCalled();
            (0, vitest_1.expect)(mockSendMessage).toHaveBeenCalledOnce();
        });
        (0, vitest_1.it)('maxPassRate: 100 — still notifies when pass rate is 99%', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const mockSendMessage = vitest_1.vi.fn().mockResolvedValue(undefined);
            vitest_1.vi.mocked(SlackNotifier).mockImplementationOnce(() => ({
                sendMessage: mockSendMessage,
            }));
            const manager = new notification_manager_1.NotificationManager([slackConfig({ maxPassRate: 100 })]);
            const results = [
                ...Array(99).fill(null).map(() => makePass()),
                makeFailure(),
            ];
            await manager.notify(results, Date.now());
            (0, vitest_1.expect)(SlackNotifier).toHaveBeenCalled();
            (0, vitest_1.expect)(mockSendMessage).toHaveBeenCalledOnce();
        });
        (0, vitest_1.it)('maxPassRate: 0 — only notifies at exactly 0% pass rate', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const mockSendMessage = vitest_1.vi.fn().mockResolvedValue(undefined);
            vitest_1.vi.mocked(SlackNotifier).mockImplementationOnce(() => ({
                sendMessage: mockSendMessage,
            }));
            const manager = new notification_manager_1.NotificationManager([slackConfig({ maxPassRate: 0 })]);
            // All failures → 0% pass rate → 0 is NOT > 0, condition passes
            const allFail = [makeFailure(), makeFailure()];
            await manager.notify(allFail, Date.now());
            (0, vitest_1.expect)(SlackNotifier).toHaveBeenCalled();
            (0, vitest_1.expect)(mockSendMessage).toHaveBeenCalledOnce();
        });
        (0, vitest_1.it)('maxPassRate: 0 — does NOT notify when even one test passes (pass rate > 0)', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const manager = new notification_manager_1.NotificationManager([slackConfig({ maxPassRate: 0 })]);
            // 1 passed, 1 failed → passRate = 50
            const mixed = [makePass(), makeFailure()];
            await manager.notify(mixed, Date.now());
            // passRate (50) > maxPassRate (0) → condition blocked
            (0, vitest_1.expect)(SlackNotifier).not.toHaveBeenCalled();
        });
    });
    // =========================================================================
    // Empty results array
    // =========================================================================
    (0, vitest_1.describe)('empty results array', () => {
        (0, vitest_1.it)('does not crash with an empty results array', async () => {
            const manager = new notification_manager_1.NotificationManager([slackConfig({ minFailures: 1 })]);
            await (0, vitest_1.expect)(manager.notify([], Date.now())).resolves.not.toThrow();
        });
        (0, vitest_1.it)('does not notify on empty results when minFailures: 1 (0 < 1)', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const manager = new notification_manager_1.NotificationManager([slackConfig({ minFailures: 1 })]);
            await manager.notify([], Date.now());
            (0, vitest_1.expect)(SlackNotifier).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('does not notify on empty results when maxPassRate: 80', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const manager = new notification_manager_1.NotificationManager([slackConfig({ maxPassRate: 80 })]);
            await manager.notify([], Date.now());
            // Empty results should never fire notifications regardless of conditions
            (0, vitest_1.expect)(SlackNotifier).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('does not notify on empty results when no conditions are set', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const mockSendMessage = vitest_1.vi.fn().mockResolvedValue(undefined);
            vitest_1.vi.mocked(SlackNotifier).mockImplementationOnce(() => ({
                sendMessage: mockSendMessage,
            }));
            // No conditions → always notifies regardless of results
            const manager = new notification_manager_1.NotificationManager([slackConfig()]);
            await manager.notify([], Date.now());
            // No conditions means always fires
            (0, vitest_1.expect)(SlackNotifier).toHaveBeenCalled();
            (0, vitest_1.expect)(mockSendMessage).toHaveBeenCalledOnce();
        });
    });
    // =========================================================================
    // All tests skipped
    // =========================================================================
    (0, vitest_1.describe)('all tests skipped', () => {
        (0, vitest_1.it)('does not notify when all 10 tests are skipped and minFailures: 1', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const manager = new notification_manager_1.NotificationManager([slackConfig({ minFailures: 1 })]);
            const results = Array(10).fill(null).map(() => makeSkipped());
            await manager.notify(results, Date.now());
            // 0 unexpected failures — minFailures=1 not met
            (0, vitest_1.expect)(SlackNotifier).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('all-skipped: pass rate is 0% — notifies when maxPassRate: 50', async () => {
            // Skipped tests are not counted as passed, so passRate = 0
            // 0 is NOT > 50, condition passes → notification fires
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const mockSendMessage = vitest_1.vi.fn().mockResolvedValue(undefined);
            vitest_1.vi.mocked(SlackNotifier).mockImplementationOnce(() => ({
                sendMessage: mockSendMessage,
            }));
            const manager = new notification_manager_1.NotificationManager([slackConfig({ maxPassRate: 50 })]);
            const results = Array(10).fill(null).map(() => makeSkipped());
            await manager.notify(results, Date.now());
            (0, vitest_1.expect)(SlackNotifier).toHaveBeenCalled();
            (0, vitest_1.expect)(mockSendMessage).toHaveBeenCalledOnce();
        });
        (0, vitest_1.it)('all-skipped: does not notify when minFailures: 1 AND maxPassRate: 50 combined', async () => {
            // Both conditions must pass; minFailures=1 fails (0 unexpected failures)
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const manager = new notification_manager_1.NotificationManager([slackConfig({ minFailures: 1, maxPassRate: 50 })]);
            const results = Array(10).fill(null).map(() => makeSkipped());
            await manager.notify(results, Date.now());
            // minFailures condition fails → no notification
            (0, vitest_1.expect)(SlackNotifier).not.toHaveBeenCalled();
        });
    });
    // =========================================================================
    // Combined conditions (AND logic)
    // =========================================================================
    (0, vitest_1.describe)('combined minFailures + maxPassRate conditions', () => {
        (0, vitest_1.it)('does NOT notify when minFailures met but pass rate too high', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            // Require ≥3 failures AND ≤50% pass rate
            const manager = new notification_manager_1.NotificationManager([slackConfig({ minFailures: 3, maxPassRate: 50 })]);
            // 3 failures but 7 passes → passRate = 70% > 50% → blocked
            const results = [
                ...Array(7).fill(null).map(() => makePass()),
                makeFailure(),
                makeFailure(),
                makeFailure(),
            ];
            await manager.notify(results, Date.now());
            (0, vitest_1.expect)(SlackNotifier).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('does NOT notify when pass rate met but not enough failures', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const manager = new notification_manager_1.NotificationManager([slackConfig({ minFailures: 5, maxPassRate: 50 })]);
            // 2 failures, 1 pass → passRate = 33% ≤ 50%, but only 2 failures < 5
            const results = [makePass(), makeFailure(), makeFailure()];
            await manager.notify(results, Date.now());
            (0, vitest_1.expect)(SlackNotifier).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('notifies when both minFailures and maxPassRate conditions are satisfied', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const mockSendMessage = vitest_1.vi.fn().mockResolvedValue(undefined);
            vitest_1.vi.mocked(SlackNotifier).mockImplementationOnce(() => ({
                sendMessage: mockSendMessage,
            }));
            const manager = new notification_manager_1.NotificationManager([slackConfig({ minFailures: 3, maxPassRate: 50 })]);
            // 5 failures, 3 passes → passRate = round(3/8*100) = 38% ≤ 50%, 5 failures ≥ 3
            const results = [
                ...Array(3).fill(null).map(() => makePass()),
                ...Array(5).fill(null).map(() => makeFailure()),
            ];
            await manager.notify(results, Date.now());
            (0, vitest_1.expect)(SlackNotifier).toHaveBeenCalled();
            (0, vitest_1.expect)(mockSendMessage).toHaveBeenCalledOnce();
        });
    });
    // =========================================================================
    // Multiple notification configs — conditions evaluated independently
    // =========================================================================
    (0, vitest_1.describe)('multiple configs with different conditions', () => {
        (0, vitest_1.it)('only fires the config whose condition is met', async () => {
            const { SlackNotifier } = await Promise.resolve().then(() => __importStar(require('./slack-notifier')));
            const { TeamsNotifier } = await Promise.resolve().then(() => __importStar(require('./teams-notifier')));
            const mockTeamsSendMessage = vitest_1.vi.fn().mockResolvedValue(undefined);
            vitest_1.vi.mocked(TeamsNotifier).mockImplementationOnce(() => ({
                sendMessage: mockTeamsSendMessage,
            }));
            const configs = [
                { channel: 'slack', config: { webhookUrl: 'https://slack' }, conditions: { minFailures: 10 } },
                { channel: 'teams', config: { webhookUrl: 'https://teams' }, conditions: { minFailures: 1 } },
            ];
            const manager = new notification_manager_1.NotificationManager(configs);
            // 2 failures: meets teams threshold (1) but not slack threshold (10)
            const results = [makeFailure(), makeFailure()];
            await manager.notify(results, Date.now());
            (0, vitest_1.expect)(SlackNotifier).not.toHaveBeenCalled();
            (0, vitest_1.expect)(TeamsNotifier).toHaveBeenCalled();
            (0, vitest_1.expect)(mockTeamsSendMessage).toHaveBeenCalledOnce();
        });
    });
});
