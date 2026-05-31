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
const attachment_collector_1 = require("./attachment-collector");
vitest_1.vi.mock('fs');
function makeTestResult(attachments) {
    return {
        attachments,
        annotations: [],
        status: 'passed',
        duration: 1000,
        startTime: new Date(),
        retry: 0,
        parallelIndex: 0,
        workerIndex: 0,
        steps: [],
        errors: [],
        stderr: [],
        stdout: [],
    };
}
(0, vitest_1.describe)('AttachmentCollector', () => {
    const mockFs = vitest_1.vi.mocked(fs);
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.describe)('screenshot handling', () => {
        (0, vitest_1.it)('collects screenshot from body as base64 data URI', () => {
            const imgBuffer = Buffer.from('fake-png-data');
            const result = makeTestResult([
                { name: 'screenshot', contentType: 'image/png', body: imgBuffer },
            ]);
            const collector = new attachment_collector_1.AttachmentCollector();
            const attachments = collector.collectAttachments(result);
            (0, vitest_1.expect)(attachments.screenshots.length).toBe(1);
            (0, vitest_1.expect)(attachments.screenshots[0]).toBe(`data:image/png;base64,${imgBuffer.toString('base64')}`);
        });
        (0, vitest_1.it)('collects screenshot from path by reading file', () => {
            const imgBuffer = Buffer.from('fake-png-from-disk');
            mockFs.readFileSync.mockReturnValue(imgBuffer);
            const result = makeTestResult([
                { name: 'screenshot', contentType: 'image/png', path: '/tmp/screenshot.png' },
            ]);
            const collector = new attachment_collector_1.AttachmentCollector();
            const attachments = collector.collectAttachments(result);
            (0, vitest_1.expect)(mockFs.readFileSync).toHaveBeenCalledWith('/tmp/screenshot.png');
            (0, vitest_1.expect)(attachments.screenshots.length).toBe(1);
            (0, vitest_1.expect)(attachments.screenshots[0]).toContain('data:image/png;base64,');
        });
        (0, vitest_1.it)('warns and skips when screenshot path cannot be read', () => {
            mockFs.readFileSync.mockImplementation(() => { throw new Error('ENOENT'); });
            const consoleSpy = vitest_1.vi.spyOn(console, 'warn').mockImplementation(() => { });
            const result = makeTestResult([
                { name: 'screenshot', contentType: 'image/png', path: '/missing/screenshot.png' },
            ]);
            const collector = new attachment_collector_1.AttachmentCollector();
            const attachments = collector.collectAttachments(result);
            (0, vitest_1.expect)(attachments.screenshots.length).toBe(0);
            (0, vitest_1.expect)(consoleSpy).toHaveBeenCalledWith(vitest_1.expect.stringContaining('Failed to read screenshot'), vitest_1.expect.any(Error));
            consoleSpy.mockRestore();
        });
        (0, vitest_1.it)('collects custom image attachments (not named "screenshot")', () => {
            const imgBuffer = Buffer.from('custom-image');
            const result = makeTestResult([
                { name: 'comparison-diff', contentType: 'image/jpeg', body: imgBuffer },
            ]);
            const collector = new attachment_collector_1.AttachmentCollector();
            const attachments = collector.collectAttachments(result);
            (0, vitest_1.expect)(attachments.screenshots.length).toBe(1);
            (0, vitest_1.expect)(attachments.screenshots[0]).toContain('data:image/jpeg;base64,');
        });
    });
    (0, vitest_1.describe)('video handling', () => {
        (0, vitest_1.it)('collects video path', () => {
            const result = makeTestResult([
                { name: 'video', contentType: 'video/webm', path: '/tmp/video.webm' },
            ]);
            const collector = new attachment_collector_1.AttachmentCollector();
            const attachments = collector.collectAttachments(result);
            (0, vitest_1.expect)(attachments.videos).toEqual(['/tmp/video.webm']);
        });
        (0, vitest_1.it)('ignores video without path', () => {
            const result = makeTestResult([
                { name: 'video', contentType: 'video/webm' },
            ]);
            const collector = new attachment_collector_1.AttachmentCollector();
            const attachments = collector.collectAttachments(result);
            (0, vitest_1.expect)(attachments.videos).toEqual([]);
        });
    });
    (0, vitest_1.describe)('trace handling', () => {
        (0, vitest_1.it)('collects trace file path', () => {
            const result = makeTestResult([
                { name: 'trace', contentType: 'application/zip', path: '/tmp/trace.zip' },
            ]);
            const collector = new attachment_collector_1.AttachmentCollector();
            const attachments = collector.collectAttachments(result);
            (0, vitest_1.expect)(attachments.traces).toEqual(['/tmp/trace.zip']);
        });
        (0, vitest_1.it)('ignores trace without path', () => {
            const result = makeTestResult([
                { name: 'trace', contentType: 'application/zip' },
            ]);
            const collector = new attachment_collector_1.AttachmentCollector();
            const attachments = collector.collectAttachments(result);
            (0, vitest_1.expect)(attachments.traces).toEqual([]);
        });
    });
    (0, vitest_1.describe)('custom attachment handling', () => {
        (0, vitest_1.it)('collects custom attachment with path', () => {
            const result = makeTestResult([
                { name: 'har-log', contentType: 'application/json', path: '/tmp/network.har' },
            ]);
            const collector = new attachment_collector_1.AttachmentCollector();
            const attachments = collector.collectAttachments(result);
            (0, vitest_1.expect)(attachments.custom.length).toBe(1);
            (0, vitest_1.expect)(attachments.custom[0]).toEqual({
                name: 'har-log',
                contentType: 'application/json',
                path: '/tmp/network.har',
            });
        });
        (0, vitest_1.it)('collects custom attachment with body as base64', () => {
            const body = Buffer.from('{"key":"value"}');
            const result = makeTestResult([
                { name: 'api-response', contentType: 'application/json', body },
            ]);
            const collector = new attachment_collector_1.AttachmentCollector();
            const attachments = collector.collectAttachments(result);
            (0, vitest_1.expect)(attachments.custom.length).toBe(1);
            (0, vitest_1.expect)(attachments.custom[0].name).toBe('api-response');
            (0, vitest_1.expect)(attachments.custom[0].body).toBe(body.toString('base64'));
        });
        (0, vitest_1.it)('excludes standard attachment names from custom', () => {
            const result = makeTestResult([
                { name: 'screenshot', contentType: 'image/png', body: Buffer.from('img') },
                { name: 'video', contentType: 'video/webm', path: '/tmp/video.webm' },
                { name: 'trace', contentType: 'application/zip', path: '/tmp/trace.zip' },
                { name: 'custom-data', contentType: 'text/plain', body: Buffer.from('data') },
            ]);
            const collector = new attachment_collector_1.AttachmentCollector();
            const attachments = collector.collectAttachments(result);
            (0, vitest_1.expect)(attachments.custom.length).toBe(1);
            (0, vitest_1.expect)(attachments.custom[0].name).toBe('custom-data');
        });
        (0, vitest_1.it)('excludes image content types from custom (they go to screenshots)', () => {
            const result = makeTestResult([
                { name: 'visual-diff', contentType: 'image/png', body: Buffer.from('img') },
            ]);
            const collector = new attachment_collector_1.AttachmentCollector();
            const attachments = collector.collectAttachments(result);
            (0, vitest_1.expect)(attachments.screenshots.length).toBe(1);
            (0, vitest_1.expect)(attachments.custom.length).toBe(0);
        });
    });
    (0, vitest_1.describe)('CSP-safe mode', () => {
        (0, vitest_1.it)('saves screenshot to file instead of base64 when cspSafe is true', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.writeFileSync.mockImplementation(() => { });
            const imgBuffer = Buffer.from('png-data');
            const result = makeTestResult([
                { name: 'screenshot', contentType: 'image/png', body: imgBuffer },
            ]);
            const collector = new attachment_collector_1.AttachmentCollector({
                cspSafe: true,
                outputDir: '/output',
            });
            const attachments = collector.collectAttachments(result);
            (0, vitest_1.expect)(mockFs.writeFileSync).toHaveBeenCalledWith(vitest_1.expect.stringContaining('/output/screenshot-'), imgBuffer);
            (0, vitest_1.expect)(attachments.screenshots[0]).toMatch(/^screenshot-\d+\.png$/);
        });
        (0, vitest_1.it)('creates output directory if it does not exist', () => {
            mockFs.existsSync.mockReturnValue(false);
            mockFs.mkdirSync.mockImplementation(() => undefined);
            mockFs.writeFileSync.mockImplementation(() => { });
            const result = makeTestResult([
                { name: 'screenshot', contentType: 'image/png', body: Buffer.from('png') },
            ]);
            const collector = new attachment_collector_1.AttachmentCollector({
                cspSafe: true,
                outputDir: '/new-output',
            });
            collector.collectAttachments(result);
            (0, vitest_1.expect)(mockFs.mkdirSync).toHaveBeenCalledWith('/new-output', { recursive: true });
        });
        (0, vitest_1.it)('throws when cspSafe is true but outputDir is not set', () => {
            const result = makeTestResult([
                { name: 'screenshot', contentType: 'image/png', body: Buffer.from('png') },
            ]);
            const collector = new attachment_collector_1.AttachmentCollector({ cspSafe: true });
            (0, vitest_1.expect)(() => collector.collectAttachments(result)).toThrow('outputDir is required when cspSafe is enabled');
        });
        (0, vitest_1.it)('uses jpg extension for jpeg content type', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.writeFileSync.mockImplementation(() => { });
            const result = makeTestResult([
                { name: 'screenshot', contentType: 'image/jpeg', body: Buffer.from('jpg') },
            ]);
            const collector = new attachment_collector_1.AttachmentCollector({
                cspSafe: true,
                outputDir: '/output',
            });
            const attachments = collector.collectAttachments(result);
            (0, vitest_1.expect)(attachments.screenshots[0]).toMatch(/\.jpg$/);
        });
    });
    (0, vitest_1.describe)('utility methods', () => {
        (0, vitest_1.it)('getFirstScreenshot returns first screenshot', () => {
            const collector = new attachment_collector_1.AttachmentCollector();
            const attachments = {
                screenshots: ['data:image/png;base64,AAA', 'data:image/png;base64,BBB'],
                videos: [],
                traces: [],
                custom: [],
            };
            (0, vitest_1.expect)(collector.getFirstScreenshot(attachments)).toBe('data:image/png;base64,AAA');
        });
        (0, vitest_1.it)('getFirstScreenshot returns undefined when empty', () => {
            const collector = new attachment_collector_1.AttachmentCollector();
            const attachments = { screenshots: [], videos: [], traces: [], custom: [] };
            (0, vitest_1.expect)(collector.getFirstScreenshot(attachments)).toBeUndefined();
        });
        (0, vitest_1.it)('getFirstVideo returns first video path', () => {
            const collector = new attachment_collector_1.AttachmentCollector();
            const attachments = {
                screenshots: [],
                videos: ['/tmp/video1.webm', '/tmp/video2.webm'],
                traces: [],
                custom: [],
            };
            (0, vitest_1.expect)(collector.getFirstVideo(attachments)).toBe('/tmp/video1.webm');
        });
        (0, vitest_1.it)('hasAttachments returns true when screenshots exist', () => {
            const collector = new attachment_collector_1.AttachmentCollector();
            (0, vitest_1.expect)(collector.hasAttachments({
                screenshots: ['data:img'],
                videos: [],
                traces: [],
                custom: [],
            })).toBe(true);
        });
        (0, vitest_1.it)('hasAttachments returns true when custom attachments exist', () => {
            const collector = new attachment_collector_1.AttachmentCollector();
            (0, vitest_1.expect)(collector.hasAttachments({
                screenshots: [],
                videos: [],
                traces: [],
                custom: [{ name: 'log', contentType: 'text/plain' }],
            })).toBe(true);
        });
        (0, vitest_1.it)('hasAttachments returns false when all arrays are empty', () => {
            const collector = new attachment_collector_1.AttachmentCollector();
            (0, vitest_1.expect)(collector.hasAttachments({
                screenshots: [],
                videos: [],
                traces: [],
                custom: [],
            })).toBe(false);
        });
    });
});
