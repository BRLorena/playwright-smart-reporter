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
const url_1 = require("url");
// Mock fs module
vitest_1.vi.mock('fs', async () => {
    const actual = await vitest_1.vi.importActual('fs');
    return {
        ...actual,
        existsSync: vitest_1.vi.fn(),
        mkdirSync: vitest_1.vi.fn(),
    };
});
(0, vitest_1.describe)('pdf-exporter', () => {
    let mockPage;
    let mockBrowser;
    let mockChromium;
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        mockPage = {
            goto: vitest_1.vi.fn().mockResolvedValue(undefined),
            pdf: vitest_1.vi.fn().mockResolvedValue(Buffer.from('fake-pdf')),
        };
        mockBrowser = {
            newPage: vitest_1.vi.fn().mockResolvedValue(mockPage),
            close: vitest_1.vi.fn().mockResolvedValue(undefined),
        };
        mockChromium = {
            launch: vitest_1.vi.fn().mockResolvedValue(mockBrowser),
        };
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.describe)('exportPdfReport', () => {
        (0, vitest_1.it)('generates PDF file at expected path when Playwright is available', async () => {
            vitest_1.vi.mocked(fs.existsSync).mockReturnValue(true);
            // Dynamic import mock — return our mock chromium
            vitest_1.vi.doMock('playwright-core', () => ({
                chromium: mockChromium,
            }));
            // Clear module cache so our mock takes effect
            const { exportPdfReport } = await Promise.resolve().then(() => __importStar(require('./pdf-exporter')));
            const htmlPath = '/tmp/test-reports/smart-report.html';
            const result = await exportPdfReport(htmlPath, {});
            (0, vitest_1.expect)(result).toBe('/tmp/test-reports/smart-report.pdf');
            (0, vitest_1.expect)(mockChromium.launch).toHaveBeenCalledWith({ headless: true });
            (0, vitest_1.expect)(mockPage.goto).toHaveBeenCalledWith((0, url_1.pathToFileURL)(htmlPath).href, vitest_1.expect.objectContaining({ waitUntil: 'networkidle' }));
            (0, vitest_1.expect)(mockPage.pdf).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                path: '/tmp/test-reports/smart-report.pdf',
                format: 'A4',
                landscape: true,
                printBackground: true,
            }));
            (0, vitest_1.expect)(mockBrowser.close).toHaveBeenCalled();
            vitest_1.vi.doUnmock('playwright-core');
        });
        (0, vitest_1.it)('returns null and warns when page.goto() fails', async () => {
            vitest_1.vi.mocked(fs.existsSync).mockReturnValue(true);
            mockPage.goto.mockRejectedValue(new Error('net::ERR_FILE_NOT_FOUND'));
            vitest_1.vi.doMock('playwright-core', () => ({
                chromium: mockChromium,
            }));
            const warnSpy = vitest_1.vi.spyOn(console, 'warn').mockImplementation(() => { });
            const { exportPdfReport } = await Promise.resolve().then(() => __importStar(require('./pdf-exporter')));
            const result = await exportPdfReport('/tmp/report.html', {});
            (0, vitest_1.expect)(result).toBeNull();
            (0, vitest_1.expect)(warnSpy).toHaveBeenCalledWith('Smart Reporter: PDF generation failed:', 'net::ERR_FILE_NOT_FOUND');
            (0, vitest_1.expect)(mockBrowser.close).toHaveBeenCalled();
            warnSpy.mockRestore();
            vitest_1.vi.doUnmock('playwright-core');
        });
        (0, vitest_1.it)('handles missing Playwright gracefully', async () => {
            vitest_1.vi.mocked(fs.existsSync).mockReturnValue(true);
            vitest_1.vi.doMock('playwright-core', () => {
                throw new Error('Cannot find module \'playwright-core\'');
            });
            const warnSpy = vitest_1.vi.spyOn(console, 'warn').mockImplementation(() => { });
            const { exportPdfReport } = await Promise.resolve().then(() => __importStar(require('./pdf-exporter')));
            const result = await exportPdfReport('/tmp/report.html', {});
            (0, vitest_1.expect)(result).toBeNull();
            (0, vitest_1.expect)(warnSpy).toHaveBeenCalledWith(vitest_1.expect.stringContaining('PDF export requires playwright-core'));
            warnSpy.mockRestore();
            vitest_1.vi.doUnmock('playwright-core');
        });
        (0, vitest_1.it)('handles invalid HTML path (file not found)', async () => {
            vitest_1.vi.mocked(fs.existsSync).mockReturnValue(false);
            vitest_1.vi.doMock('playwright-core', () => ({
                chromium: mockChromium,
            }));
            const warnSpy = vitest_1.vi.spyOn(console, 'warn').mockImplementation(() => { });
            const { exportPdfReport } = await Promise.resolve().then(() => __importStar(require('./pdf-exporter')));
            const result = await exportPdfReport('/nonexistent/report.html', {});
            (0, vitest_1.expect)(result).toBeNull();
            (0, vitest_1.expect)(warnSpy).toHaveBeenCalledWith(vitest_1.expect.stringContaining('HTML report not found'));
            (0, vitest_1.expect)(mockChromium.launch).not.toHaveBeenCalled();
            warnSpy.mockRestore();
            vitest_1.vi.doUnmock('playwright-core');
        });
        (0, vitest_1.it)('respects outputDir parameter', async () => {
            vitest_1.vi.mocked(fs.existsSync).mockReturnValue(true);
            vitest_1.vi.doMock('playwright-core', () => ({
                chromium: mockChromium,
            }));
            const { exportPdfReport } = await Promise.resolve().then(() => __importStar(require('./pdf-exporter')));
            const result = await exportPdfReport('/tmp/reports/smart-report.html', {}, '/custom/output');
            (0, vitest_1.expect)(result).toBe('/custom/output/smart-report.pdf');
            (0, vitest_1.expect)(mockPage.pdf).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                path: '/custom/output/smart-report.pdf',
            }));
            vitest_1.vi.doUnmock('playwright-core');
        });
        (0, vitest_1.it)('browser is always closed in finally block (even on error)', async () => {
            vitest_1.vi.mocked(fs.existsSync).mockReturnValue(true);
            mockPage.pdf.mockRejectedValue(new Error('PDF generation failed'));
            vitest_1.vi.doMock('playwright-core', () => ({
                chromium: mockChromium,
            }));
            const warnSpy = vitest_1.vi.spyOn(console, 'warn').mockImplementation(() => { });
            const { exportPdfReport } = await Promise.resolve().then(() => __importStar(require('./pdf-exporter')));
            const result = await exportPdfReport('/tmp/report.html', {});
            (0, vitest_1.expect)(result).toBeNull();
            (0, vitest_1.expect)(mockBrowser.close).toHaveBeenCalled();
            warnSpy.mockRestore();
            vitest_1.vi.doUnmock('playwright-core');
        });
    });
});
