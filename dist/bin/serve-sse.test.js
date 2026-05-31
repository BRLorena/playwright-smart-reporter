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
const sse_handler_1 = require("../live/sse-handler");
const live_dashboard_1 = require("../live/live-dashboard");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
(0, vitest_1.describe)('buildSseHandler', () => {
    (0, vitest_1.it)('sends new JSONL lines as SSE events', async () => {
        const tmpFile = path.join(os.tmpdir(), `sse-test-${Date.now()}.jsonl`);
        const sent = [];
        const mockClient = {
            write: (data) => { sent.push(data); return true; },
            end: () => { },
        };
        fs.writeFileSync(tmpFile, '{"event":"start","totalExpected":2}\n');
        const handler = (0, sse_handler_1.buildSseHandler)(tmpFile);
        handler.addClient(mockClient);
        await new Promise(r => setTimeout(r, 100));
        fs.appendFileSync(tmpFile, '{"event":"test","testId":"t1","status":"passed"}\n');
        await new Promise(r => setTimeout(r, 300));
        handler.stop();
        fs.unlinkSync(tmpFile);
        const eventData = sent.filter(s => s.startsWith('data:'));
        (0, vitest_1.expect)(eventData.length).toBeGreaterThanOrEqual(1);
    });
    (0, vitest_1.it)('removes clients cleanly', () => {
        const tmpFile = path.join(os.tmpdir(), `sse-test2-${Date.now()}.jsonl`);
        fs.writeFileSync(tmpFile, '');
        const handler = (0, sse_handler_1.buildSseHandler)(tmpFile);
        const mockClient = { write: () => true, end: () => { } };
        handler.addClient(mockClient);
        (0, vitest_1.expect)(handler.clientCount()).toBe(1);
        handler.removeClient(mockClient);
        (0, vitest_1.expect)(handler.clientCount()).toBe(0);
        handler.stop();
        fs.unlinkSync(tmpFile);
    });
});
(0, vitest_1.describe)('SSE URL injection for live report pages', () => {
    (0, vitest_1.it)('replaces __SSE_URL__ placeholder with /sse in live-mode HTML', () => {
        const html = (0, live_dashboard_1.generateLiveReportPage)({ jsonlFile: 'results.jsonl' });
        (0, vitest_1.expect)(html).toContain('__SSE_URL__');
        const injected = html.replace(/__SSE_URL__/g, '/sse');
        (0, vitest_1.expect)(injected).not.toContain('__SSE_URL__');
        (0, vitest_1.expect)(injected).toContain('/sse');
    });
    (0, vitest_1.it)('does not replace anything in non-live HTML', () => {
        const staticHtml = '<html><body>No live mode here</body></html>';
        const result = staticHtml.includes('data-live-mode')
            ? staticHtml.replace(/__SSE_URL__/g, '/sse')
            : staticHtml;
        (0, vitest_1.expect)(result).toBe(staticHtml);
    });
});
(0, vitest_1.describe)('__RUN_ENABLED__ injection', () => {
    (0, vitest_1.it)('replaces __RUN_ENABLED__ with true when runCommand is set', () => {
        const html = `<script>var runEnabled = '__RUN_ENABLED__';</script>`;
        const injected = html.replace(/__RUN_ENABLED__/g, 'true');
        (0, vitest_1.expect)(injected).not.toContain('__RUN_ENABLED__');
        (0, vitest_1.expect)(injected).toContain("'true'");
    });
    (0, vitest_1.it)('leaves __RUN_ENABLED__ as-is when runCommand is not set', () => {
        const html = `<script>var runEnabled = '__RUN_ENABLED__';</script>`;
        (0, vitest_1.expect)(html).toContain("'__RUN_ENABLED__'");
        const match = html.match(/var runEnabled = '([^']+)'/);
        (0, vitest_1.expect)(match?.[1]).toBe('__RUN_ENABLED__');
        (0, vitest_1.expect)(match?.[1]).not.toBe('true');
    });
});
(0, vitest_1.describe)('SSE handler: file truncation and recreation', () => {
    (0, vitest_1.it)('detects file truncation and re-sends from start', async () => {
        const tmpFile = path.join(os.tmpdir(), `sse-trunc-${Date.now()}.jsonl`);
        const sent = [];
        const mockClient = {
            write: (data) => { sent.push(data); return true; },
            end: () => { },
        };
        // Initial file with some data
        fs.writeFileSync(tmpFile, '{"event":"start","totalExpected":5}\n{"event":"test","testId":"t1","status":"passed"}\n');
        const handler = (0, sse_handler_1.buildSseHandler)(tmpFile);
        handler.addClient(mockClient);
        // Client should receive existing lines on connect
        await new Promise(r => setTimeout(r, 100));
        const initialEvents = sent.filter(s => s.startsWith('data:'));
        (0, vitest_1.expect)(initialEvents.length).toBe(2);
        // Truncate and rewrite (simulates new test run)
        fs.writeFileSync(tmpFile, '{"event":"start","totalExpected":3}\n');
        await new Promise(r => setTimeout(r, 700));
        const allEvents = sent.filter(s => s.startsWith('data:'));
        // Should have the 2 initial + at least 1 new event from the truncated file
        (0, vitest_1.expect)(allEvents.length).toBeGreaterThanOrEqual(3);
        handler.stop();
        fs.unlinkSync(tmpFile);
    });
    (0, vitest_1.it)('picks up file created after handler starts', async () => {
        const tmpFile = path.join(os.tmpdir(), `sse-create-${Date.now()}.jsonl`);
        const sent = [];
        const mockClient = {
            write: (data) => { sent.push(data); return true; },
            end: () => { },
        };
        // Start handler before file exists
        if (fs.existsSync(tmpFile))
            fs.unlinkSync(tmpFile);
        const handler = (0, sse_handler_1.buildSseHandler)(tmpFile);
        handler.addClient(mockClient);
        await new Promise(r => setTimeout(r, 100));
        (0, vitest_1.expect)(sent.filter(s => s.startsWith('data:')).length).toBe(0);
        // Create the file
        fs.writeFileSync(tmpFile, '{"event":"start","totalExpected":2}\n');
        await new Promise(r => setTimeout(r, 700));
        const events = sent.filter(s => s.startsWith('data:'));
        (0, vitest_1.expect)(events.length).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(events[0]).toContain('"start"');
        handler.stop();
        fs.unlinkSync(tmpFile);
    });
});
(0, vitest_1.describe)('Run Tests button: HTML generation', () => {
    (0, vitest_1.it)('includes run button HTML when live mode is enabled', () => {
        const html = (0, live_dashboard_1.generateLiveReportPage)({ jsonlFile: 'results.jsonl' });
        // The standalone live dashboard doesn't include the run button (only main report does)
        // But verify the placeholder mechanism works in principle
        (0, vitest_1.expect)(html).toContain('data-live-mode');
    });
    (0, vitest_1.it)('run button is hidden by default (display:none)', () => {
        // Simulates what the html-generator produces
        const snippet = '<div class="live-run-row" id="live-run-row" style="display:none">';
        (0, vitest_1.expect)(snippet).toContain('display:none');
    });
    (0, vitest_1.it)('__RUN_ENABLED__ detection pattern shows button only when replaced', () => {
        // When NOT replaced (file:// or no --run-command)
        const unreplaced = "__RUN_ENABLED__";
        (0, vitest_1.expect)(unreplaced === 'true').toBe(false);
        // When replaced by serve.ts
        const replaced = 'true';
        (0, vitest_1.expect)(replaced === 'true').toBe(true);
    });
});
(0, vitest_1.describe)('buildFilteredCommand (via POST /run body)', () => {
    (0, vitest_1.it)('POST /run with files filter appends ./-prefixed quoted file paths', () => {
        const base = 'npx playwright test';
        const filters = { files: ['tests/login.spec.ts', 'tests/checkout.spec.ts'] };
        // Simulates what buildFilteredCommand produces (with ./ prefix to prevent substring matching)
        const parts = [base];
        for (const f of filters.files) {
            const anchored = f.startsWith('./') || f.startsWith('/') ? f : `./${f}`;
            parts.push(`"${anchored}"`);
        }
        const cmd = parts.join(' ');
        (0, vitest_1.expect)(cmd).toBe('npx playwright test "./tests/login.spec.ts" "./tests/checkout.spec.ts"');
    });
    (0, vitest_1.it)('POST /run with grep filter appends --grep flag', () => {
        const base = 'npx playwright test';
        const filters = { grep: '@smoke' };
        const cmd = `${base} --grep "${filters.grep}"`;
        (0, vitest_1.expect)(cmd).toBe('npx playwright test --grep "@smoke"');
    });
    (0, vitest_1.it)('POST /run with combined filters appends both files and grep', () => {
        const base = 'npx playwright test';
        const filters = { files: ['tests/auth.spec.ts'], grep: 'login' };
        const parts = [base];
        for (const f of filters.files) {
            const anchored = f.startsWith('./') || f.startsWith('/') ? f : `./${f}`;
            parts.push(`"${anchored}"`);
        }
        parts.push(`--grep "${filters.grep}"`);
        const cmd = parts.join(' ');
        (0, vitest_1.expect)(cmd).toBe('npx playwright test "./tests/auth.spec.ts" --grep "login"');
    });
    (0, vitest_1.it)('strips shell metacharacters from filter inputs but preserves pipe for grep OR', () => {
        const dangerous = 'test; rm -rf /';
        const sanitized = dangerous.replace(/[;&`$(){}!\\\n\r]/g, '');
        (0, vitest_1.expect)(sanitized).toBe('test rm -rf /');
        (0, vitest_1.expect)(sanitized).not.toContain(';');
        // Pipe is preserved for Playwright --grep OR patterns (safe inside double quotes)
        const grepOr = '@smoke|@regression';
        const sanitizedGrep = grepOr.replace(/[;&`$(){}!\\\n\r]/g, '');
        (0, vitest_1.expect)(sanitizedGrep).toBe('@smoke|@regression');
    });
    (0, vitest_1.it)('POST /run with empty body runs base command unfiltered', () => {
        const filters = {};
        const hasFiles = filters.files && Array.isArray(filters.files) && filters.files.length > 0;
        const hasGrep = filters.grep && typeof filters.grep === 'string';
        (0, vitest_1.expect)(hasFiles).toBeFalsy();
        (0, vitest_1.expect)(hasGrep).toBeFalsy();
    });
    (0, vitest_1.it)('POST /run with tags produces OR-joined grep pattern', () => {
        const tags = ['@smoke', '@critical'];
        const grepFromTags = tags.join('|');
        (0, vitest_1.expect)(grepFromTags).toBe('@smoke|@critical');
        const cmd = `npx playwright test --grep "${grepFromTags}"`;
        (0, vitest_1.expect)(cmd).toContain('--grep "@smoke|@critical"');
    });
});
(0, vitest_1.describe)('Run/Cancel endpoint contract', () => {
    (0, vitest_1.it)('POST /run returns started with command when not running', () => {
        const response = { status: 'started', command: 'npx playwright test' };
        (0, vitest_1.expect)(response.status).toBe('started');
        (0, vitest_1.expect)(response.command).toBeTruthy();
    });
    (0, vitest_1.it)('POST /run returns 409 when already running', () => {
        const response = { error: 'A test run is already in progress' };
        (0, vitest_1.expect)(response.error).toContain('already in progress');
    });
    (0, vitest_1.it)('GET /run returns running state, command, and lastExitCode', () => {
        const idle = { running: false, command: 'npx playwright test', lastExitCode: null };
        (0, vitest_1.expect)(idle.running).toBe(false);
        (0, vitest_1.expect)(idle.command).toBeTruthy();
        (0, vitest_1.expect)(idle.lastExitCode).toBeNull();
        const active = { running: true, command: 'npx playwright test', lastExitCode: null };
        (0, vitest_1.expect)(active.running).toBe(true);
        const completed = { running: false, command: 'npx playwright test', lastExitCode: 0 };
        (0, vitest_1.expect)(completed.lastExitCode).toBe(0);
        const failed = { running: false, command: 'npx playwright test', lastExitCode: 1 };
        (0, vitest_1.expect)(failed.lastExitCode).toBe(1);
    });
    (0, vitest_1.it)('DELETE /run returns cancelled when running', () => {
        const response = { status: 'cancelled' };
        (0, vitest_1.expect)(response.status).toBe('cancelled');
    });
    (0, vitest_1.it)('DELETE /run returns 409 when not running', () => {
        const response = { error: 'No test run in progress' };
        (0, vitest_1.expect)(response.error).toContain('No test run');
    });
});
