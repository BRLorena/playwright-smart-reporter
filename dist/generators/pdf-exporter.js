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
exports.exportPdfReport = exportPdfReport;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const url_1 = require("url");
/**
 * Exports the HTML report as a PDF using Playwright's chromium browser.
 *
 * Playwright-core is loaded via dynamic import to avoid a hard dependency.
 * If playwright-core is not installed or chromium is not available, a warning
 * is logged and null is returned — the reporter will not crash.
 *
 * @param htmlPath - Absolute path to the generated HTML report file
 * @param options - Smart reporter options (unused currently, reserved for future PDF config)
 * @param outputDir - Optional output directory for the PDF. Defaults to the same directory as htmlPath.
 * @returns The absolute path to the generated PDF, or null if generation was skipped/failed
 */
async function exportPdfReport(htmlPath, options, outputDir) {
    if (!fs.existsSync(htmlPath)) {
        console.warn('Smart Reporter: HTML report not found. Skipping PDF generation.');
        return null;
    }
    let pw;
    try {
        pw = await Promise.resolve().then(() => __importStar(require('playwright-core')));
    }
    catch {
        console.warn('Smart Reporter: PDF export requires playwright-core. Skipping PDF generation.');
        return null;
    }
    const pdfDir = outputDir ?? path.dirname(htmlPath);
    const pdfFilename = path.basename(htmlPath, '.html') + '.pdf';
    const pdfPath = path.resolve(pdfDir, pdfFilename);
    fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
    let browser = null;
    try {
        browser = await pw.chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto((0, url_1.pathToFileURL)(htmlPath).href, { waitUntil: 'networkidle' });
        await page.pdf({
            path: pdfPath,
            format: 'A4',
            landscape: true,
            printBackground: true,
        });
        return pdfPath;
    }
    catch (err) {
        console.warn('Smart Reporter: PDF generation failed:', err instanceof Error ? err.message : 'Unknown error');
        return null;
    }
    finally {
        if (browser) {
            await browser.close();
        }
    }
}
