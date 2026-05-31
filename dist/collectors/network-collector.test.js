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
const fs = __importStar(require("fs"));
const network_collector_1 = require("./network-collector");
vitest_1.vi.mock('fs');
const { mockGetEntry, MockAdmZip } = vitest_1.vi.hoisted(() => {
    const mockGetEntry = vitest_1.vi.fn();
    const MockAdmZip = vitest_1.vi.fn().mockImplementation(() => ({
        getEntry: mockGetEntry,
    }));
    return { mockGetEntry, MockAdmZip };
});
vitest_1.vi.mock('adm-zip', () => ({
    default: MockAdmZip,
}));
function makeNetworkLine(overrides = {}) {
    return JSON.stringify({
        type: 'resource-snapshot',
        snapshot: {
            request: {
                method: 'GET',
                url: 'https://api.example.com/users',
                bodySize: 0,
                headers: [],
            },
            response: {
                status: 200,
                statusText: 'OK',
                bodySize: 512,
                headers: [{ name: 'content-type', value: 'application/json' }],
                content: { mimeType: 'application/json', size: 512 },
            },
            time: 150,
            startedDateTime: '2024-01-01T10:00:00Z',
            ...overrides,
        },
    });
}
function makeStaticAssetLine(url, contentType) {
    return JSON.stringify({
        type: 'resource-snapshot',
        snapshot: {
            request: {
                method: 'GET',
                url,
                bodySize: 0,
                headers: [],
            },
            response: {
                status: 200,
                statusText: 'OK',
                bodySize: 1024,
                headers: [{ name: 'content-type', value: contentType }],
                content: { mimeType: contentType, size: 1024 },
            },
            time: 50,
            startedDateTime: '2024-01-01T10:00:01Z',
        },
    });
}
(0, vitest_1.describe)('NetworkCollector', () => {
    const mockFs = vitest_1.vi.mocked(fs);
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        MockAdmZip.mockImplementation(() => ({
            getEntry: mockGetEntry,
        }));
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.describe)('collectFromTrace', () => {
        (0, vitest_1.it)('returns empty result when trace path does not exist', async () => {
            mockFs.existsSync.mockReturnValue(false);
            const collector = new network_collector_1.NetworkCollector();
            const result = await collector.collectFromTrace('/nonexistent/trace.zip');
            (0, vitest_1.expect)(result.entries).toEqual([]);
            (0, vitest_1.expect)(result.totalRequests).toBe(0);
        });
        (0, vitest_1.it)('returns empty result when trace path is empty string', async () => {
            const collector = new network_collector_1.NetworkCollector();
            const result = await collector.collectFromTrace('');
            (0, vitest_1.expect)(result.entries).toEqual([]);
            (0, vitest_1.expect)(result.totalRequests).toBe(0);
        });
        (0, vitest_1.it)('returns empty result when 0-trace.network entry is missing', async () => {
            mockFs.existsSync.mockReturnValue(true);
            mockGetEntry.mockReturnValue(null);
            const collector = new network_collector_1.NetworkCollector();
            const result = await collector.collectFromTrace('/path/to/trace.zip');
            (0, vitest_1.expect)(result.entries).toEqual([]);
            (0, vitest_1.expect)(result.totalRequests).toBe(0);
        });
        (0, vitest_1.it)('skips malformed JSON lines gracefully', async () => {
            mockFs.existsSync.mockReturnValue(true);
            const networkData = [
                'not valid json',
                '{"type": "resource-snapshot"',
                makeNetworkLine(),
            ].join('\n');
            mockGetEntry.mockReturnValue({
                getData: () => Buffer.from(networkData, 'utf8'),
            });
            const collector = new network_collector_1.NetworkCollector();
            const result = await collector.collectFromTrace('/path/to/trace.zip');
            (0, vitest_1.expect)(result.entries.length).toBe(1);
            (0, vitest_1.expect)(result.totalRequests).toBe(1);
        });
        (0, vitest_1.it)('filters static assets by URL pattern (CSS, JS, images)', async () => {
            mockFs.existsSync.mockReturnValue(true);
            const networkData = [
                makeNetworkLine(),
                makeStaticAssetLine('https://example.com/styles.css', 'text/css'),
                makeStaticAssetLine('https://example.com/app.js', 'application/javascript'),
                makeStaticAssetLine('https://example.com/logo.png', 'image/png'),
                makeStaticAssetLine('https://example.com/icon.svg', 'image/svg+xml'),
                makeStaticAssetLine('https://example.com/font.woff2', 'font/woff2'),
            ].join('\n');
            mockGetEntry.mockReturnValue({
                getData: () => Buffer.from(networkData, 'utf8'),
            });
            const collector = new network_collector_1.NetworkCollector({ excludeStaticAssets: true });
            const result = await collector.collectFromTrace('/path/to/trace.zip');
            (0, vitest_1.expect)(result.entries.length).toBe(1);
            (0, vitest_1.expect)(result.entries[0].url).toBe('https://api.example.com/users');
        });
        (0, vitest_1.it)('includes static assets when excludeStaticAssets is false', async () => {
            mockFs.existsSync.mockReturnValue(true);
            const networkData = [
                makeNetworkLine(),
                makeStaticAssetLine('https://example.com/styles.css', 'text/css'),
            ].join('\n');
            mockGetEntry.mockReturnValue({
                getData: () => Buffer.from(networkData, 'utf8'),
            });
            const collector = new network_collector_1.NetworkCollector({ excludeStaticAssets: false });
            const result = await collector.collectFromTrace('/path/to/trace.zip');
            (0, vitest_1.expect)(result.entries.length).toBe(2);
        });
        (0, vitest_1.it)('truncates entries to maxEntries', async () => {
            mockFs.existsSync.mockReturnValue(true);
            const lines = [];
            for (let i = 0; i < 10; i++) {
                lines.push(makeNetworkLine({
                    request: {
                        method: 'GET',
                        url: `https://api.example.com/item/${i}`,
                        bodySize: 0,
                        headers: [],
                    },
                    startedDateTime: `2024-01-01T10:00:${String(i).padStart(2, '0')}Z`,
                }));
            }
            mockGetEntry.mockReturnValue({
                getData: () => Buffer.from(lines.join('\n'), 'utf8'),
            });
            const collector = new network_collector_1.NetworkCollector({ maxEntries: 3, excludeStaticAssets: false });
            const result = await collector.collectFromTrace('/path/to/trace.zip');
            (0, vitest_1.expect)(result.entries.length).toBe(3);
            (0, vitest_1.expect)(result.totalRequests).toBe(10);
        });
        (0, vitest_1.it)('parses valid network entries correctly', async () => {
            mockFs.existsSync.mockReturnValue(true);
            const networkData = makeNetworkLine({
                request: {
                    method: 'POST',
                    url: 'https://api.example.com/login',
                    bodySize: 64,
                    headers: [{ name: 'content-type', value: 'application/json' }],
                    postData: '{"user":"test"}',
                },
                response: {
                    status: 201,
                    statusText: 'Created',
                    bodySize: 256,
                    headers: [{ name: 'content-type', value: 'application/json' }],
                    content: { mimeType: 'application/json', size: 256 },
                },
                time: 320,
                startedDateTime: '2024-01-01T12:00:00Z',
                timings: { dns: 5, connect: 10, ssl: 15, wait: 200, receive: 90 },
            });
            mockGetEntry.mockReturnValue({
                getData: () => Buffer.from(networkData, 'utf8'),
            });
            const collector = new network_collector_1.NetworkCollector({ excludeStaticAssets: false, includeBodies: true });
            const result = await collector.collectFromTrace('/path/to/trace.zip');
            (0, vitest_1.expect)(result.entries.length).toBe(1);
            const entry = result.entries[0];
            (0, vitest_1.expect)(entry.method).toBe('POST');
            (0, vitest_1.expect)(entry.url).toBe('https://api.example.com/login');
            (0, vitest_1.expect)(entry.urlPath).toBe('/login');
            (0, vitest_1.expect)(entry.status).toBe(201);
            (0, vitest_1.expect)(entry.statusText).toBe('Created');
            (0, vitest_1.expect)(entry.duration).toBe(320);
            (0, vitest_1.expect)(entry.requestSize).toBe(64);
            (0, vitest_1.expect)(entry.responseSize).toBe(256);
            (0, vitest_1.expect)(entry.contentType).toBe('application/json');
            (0, vitest_1.expect)(entry.timings).toEqual({ dns: 5, connect: 10, ssl: 15, wait: 200, receive: 90 });
            (0, vitest_1.expect)(entry.requestBody).toEqual({ user: 'test' });
        });
        (0, vitest_1.it)('skips entries without request or response', async () => {
            mockFs.existsSync.mockReturnValue(true);
            const noRequest = JSON.stringify({
                type: 'resource-snapshot',
                snapshot: { response: { status: 200 } },
            });
            const noResponse = JSON.stringify({
                type: 'resource-snapshot',
                snapshot: { request: { method: 'GET', url: 'https://example.com' } },
            });
            const networkData = [noRequest, noResponse, makeNetworkLine()].join('\n');
            mockGetEntry.mockReturnValue({
                getData: () => Buffer.from(networkData, 'utf8'),
            });
            const collector = new network_collector_1.NetworkCollector();
            const result = await collector.collectFromTrace('/path/to/trace.zip');
            (0, vitest_1.expect)(result.entries.length).toBe(1);
        });
        (0, vitest_1.it)('skips non-resource-snapshot entries', async () => {
            mockFs.existsSync.mockReturnValue(true);
            const otherType = JSON.stringify({ type: 'action', action: 'click' });
            const networkData = [otherType, makeNetworkLine()].join('\n');
            mockGetEntry.mockReturnValue({
                getData: () => Buffer.from(networkData, 'utf8'),
            });
            const collector = new network_collector_1.NetworkCollector();
            const result = await collector.collectFromTrace('/path/to/trace.zip');
            (0, vitest_1.expect)(result.entries.length).toBe(1);
        });
        (0, vitest_1.it)('updates summary with status and method counts', async () => {
            mockFs.existsSync.mockReturnValue(true);
            const lines = [
                makeNetworkLine(),
                makeNetworkLine({
                    request: { method: 'POST', url: 'https://api.example.com/data', bodySize: 0, headers: [] },
                    response: { status: 404, statusText: 'Not Found', bodySize: 0, headers: [], content: { mimeType: 'application/json' } },
                    time: 200,
                    startedDateTime: '2024-01-01T10:00:01Z',
                }),
            ];
            mockGetEntry.mockReturnValue({
                getData: () => Buffer.from(lines.join('\n'), 'utf8'),
            });
            const collector = new network_collector_1.NetworkCollector();
            const result = await collector.collectFromTrace('/path/to/trace.zip');
            (0, vitest_1.expect)(result.summary.byMethod['GET']).toBe(1);
            (0, vitest_1.expect)(result.summary.byMethod['POST']).toBe(1);
            (0, vitest_1.expect)(result.summary.byStatus[200]).toBe(1);
            (0, vitest_1.expect)(result.summary.byStatus[400]).toBe(1);
            (0, vitest_1.expect)(result.summary.errors.length).toBe(1);
            (0, vitest_1.expect)(result.summary.errors[0].status).toBe(404);
            (0, vitest_1.expect)(result.summary.slowest).toBeDefined();
            (0, vitest_1.expect)(result.summary.slowest.duration).toBe(200);
        });
        (0, vitest_1.it)('applies urlFilter to only include matching URLs', async () => {
            mockFs.existsSync.mockReturnValue(true);
            const lines = [
                makeNetworkLine(),
                makeNetworkLine({
                    request: { method: 'GET', url: 'https://other.com/data', bodySize: 0, headers: [] },
                    response: { status: 200, statusText: 'OK', bodySize: 0, headers: [], content: { mimeType: 'application/json' } },
                    time: 100,
                    startedDateTime: '2024-01-01T10:00:01Z',
                }),
            ];
            mockGetEntry.mockReturnValue({
                getData: () => Buffer.from(lines.join('\n'), 'utf8'),
            });
            const collector = new network_collector_1.NetworkCollector({ urlFilter: 'api.example.com' });
            const result = await collector.collectFromTrace('/path/to/trace.zip');
            (0, vitest_1.expect)(result.entries.length).toBe(1);
            (0, vitest_1.expect)(result.entries[0].url).toContain('api.example.com');
        });
        (0, vitest_1.it)('handles AdmZip constructor error gracefully', async () => {
            mockFs.existsSync.mockReturnValue(true);
            MockAdmZip.mockImplementationOnce(() => {
                throw new Error('Corrupt zip');
            });
            const consoleSpy = vitest_1.vi.spyOn(console, 'warn').mockImplementation(() => { });
            const collector = new network_collector_1.NetworkCollector();
            const result = await collector.collectFromTrace('/path/to/corrupt.zip');
            (0, vitest_1.expect)(result.entries).toEqual([]);
            (0, vitest_1.expect)(consoleSpy).toHaveBeenCalledWith(vitest_1.expect.stringContaining('Failed to parse trace file'), vitest_1.expect.any(Error));
            consoleSpy.mockRestore();
        });
        (0, vitest_1.it)('includes headers when includeHeaders option is true', async () => {
            mockFs.existsSync.mockReturnValue(true);
            const networkData = makeNetworkLine({
                request: {
                    method: 'GET',
                    url: 'https://api.example.com/users',
                    bodySize: 0,
                    headers: [
                        { name: 'Authorization', value: 'Bearer token' },
                        { name: ':authority', value: 'api.example.com' },
                    ],
                },
                response: {
                    status: 200,
                    statusText: 'OK',
                    bodySize: 512,
                    headers: [{ name: 'content-type', value: 'application/json' }],
                    content: { mimeType: 'application/json', size: 512 },
                },
                time: 150,
                startedDateTime: '2024-01-01T10:00:00Z',
            });
            mockGetEntry.mockReturnValue({
                getData: () => Buffer.from(networkData, 'utf8'),
            });
            const collector = new network_collector_1.NetworkCollector({ includeHeaders: true });
            const result = await collector.collectFromTrace('/path/to/trace.zip');
            (0, vitest_1.expect)(result.entries[0].requestHeaders).toEqual({ authorization: 'Bearer token' });
            (0, vitest_1.expect)(result.entries[0].responseHeaders).toEqual({ 'content-type': 'application/json' });
        });
    });
});
