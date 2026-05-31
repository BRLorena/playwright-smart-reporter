"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const live_dashboard_1 = require("./live-dashboard");
(0, vitest_1.describe)('generateLiveDashboard', () => {
    (0, vitest_1.it)('generates valid HTML with polling mode by default', () => {
        const html = (0, live_dashboard_1.generateLiveDashboard)({ jsonlFile: '.smart-live-results.jsonl' });
        (0, vitest_1.expect)(html).toContain('<!DOCTYPE html>');
        (0, vitest_1.expect)(html).toContain('Live Test Results');
        (0, vitest_1.expect)(html).toContain('.smart-live-results.jsonl');
        (0, vitest_1.expect)(html).toContain('setInterval');
        (0, vitest_1.expect)(html).not.toContain('EventSource');
    });
    (0, vitest_1.it)('generates HTML with SSE mode when sseUrl is provided', () => {
        const html = (0, live_dashboard_1.generateLiveDashboard)({
            jsonlFile: '.smart-live-results.jsonl',
            sseUrl: 'http://localhost:3000/sse',
        });
        (0, vitest_1.expect)(html).toContain('EventSource');
        (0, vitest_1.expect)(html).toContain('http://localhost:3000/sse');
        (0, vitest_1.expect)(html).not.toContain('setInterval');
    });
    (0, vitest_1.it)('includes progress bar, counters, and failure feed elements', () => {
        const html = (0, live_dashboard_1.generateLiveDashboard)({ jsonlFile: '.smart-live-results.jsonl' });
        (0, vitest_1.expect)(html).toContain('id="progress-bar"');
        (0, vitest_1.expect)(html).toContain('id="counter-passed"');
        (0, vitest_1.expect)(html).toContain('id="counter-failed"');
        (0, vitest_1.expect)(html).toContain('id="counter-skipped"');
        (0, vitest_1.expect)(html).toContain('id="failure-feed"');
        (0, vitest_1.expect)(html).toContain('id="status-banner"');
    });
    (0, vitest_1.it)('escapes the jsonl file path to prevent XSS', () => {
        const html = (0, live_dashboard_1.generateLiveDashboard)({ jsonlFile: '"><script>alert(1)</script>' });
        (0, vitest_1.expect)(html).not.toContain('<script>alert(1)</script>');
    });
});
(0, vitest_1.describe)('generateLiveReportPage', () => {
    (0, vitest_1.it)('contains data-live-mode attribute', () => {
        const html = (0, live_dashboard_1.generateLiveReportPage)({ jsonlFile: 'results.jsonl' });
        (0, vitest_1.expect)(html).toContain('data-live-mode');
    });
    (0, vitest_1.it)('contains polling JS with correct JSONL path', () => {
        const html = (0, live_dashboard_1.generateLiveReportPage)({ jsonlFile: '.smart-live-results.jsonl' });
        (0, vitest_1.expect)(html).toContain('.smart-live-results.jsonl');
        (0, vitest_1.expect)(html).toContain('setInterval');
    });
    (0, vitest_1.it)('contains auto-reload logic', () => {
        const html = (0, live_dashboard_1.generateLiveReportPage)({ jsonlFile: 'results.jsonl' });
        (0, vitest_1.expect)(html).toContain('waitForFinalReport');
        (0, vitest_1.expect)(html).toContain('window.location.reload');
    });
    (0, vitest_1.it)('contains SSE placeholder for serve rewriting', () => {
        const html = (0, live_dashboard_1.generateLiveReportPage)({ jsonlFile: 'results.jsonl' });
        (0, vitest_1.expect)(html).toContain('__SSE_URL__');
    });
    (0, vitest_1.it)('uses SSE directly when sseUrl is provided', () => {
        const html = (0, live_dashboard_1.generateLiveReportPage)({
            jsonlFile: 'results.jsonl',
            sseUrl: '/sse',
        });
        (0, vitest_1.expect)(html).toContain('EventSource');
        (0, vitest_1.expect)(html).not.toContain('__SSE_URL__');
        (0, vitest_1.expect)(html).not.toContain('setInterval');
    });
    (0, vitest_1.it)('propagates title into HTML', () => {
        const html = (0, live_dashboard_1.generateLiveReportPage)({
            jsonlFile: 'results.jsonl',
            title: 'My Test Suite',
        });
        (0, vitest_1.expect)(html).toContain('My Test Suite');
        (0, vitest_1.expect)(html).toContain('<title>My Test Suite — Live</title>');
    });
    (0, vitest_1.it)('uses default title when none provided', () => {
        const html = (0, live_dashboard_1.generateLiveReportPage)({ jsonlFile: 'results.jsonl' });
        (0, vitest_1.expect)(html).toContain('Smart Report');
    });
    (0, vitest_1.it)('escapes paths to prevent XSS', () => {
        const html = (0, live_dashboard_1.generateLiveReportPage)({
            jsonlFile: '"><script>alert(1)</script>',
            title: '"><script>alert(2)</script>',
        });
        (0, vitest_1.expect)(html).not.toContain('<script>alert(1)</script>');
        (0, vitest_1.expect)(html).not.toContain('<script>alert(2)</script>');
    });
    (0, vitest_1.it)('includes Space Grotesk font and report CSS custom properties', () => {
        const html = (0, live_dashboard_1.generateLiveReportPage)({ jsonlFile: 'results.jsonl' });
        (0, vitest_1.expect)(html).toContain('Space Grotesk');
        (0, vitest_1.expect)(html).toContain('--bg-primary');
        (0, vitest_1.expect)(html).toContain('--accent-green');
    });
    (0, vitest_1.it)('includes progress bar, counters, and failure feed', () => {
        const html = (0, live_dashboard_1.generateLiveReportPage)({ jsonlFile: 'results.jsonl' });
        (0, vitest_1.expect)(html).toContain('id="counter-passed"');
        (0, vitest_1.expect)(html).toContain('id="counter-failed"');
        (0, vitest_1.expect)(html).toContain('id="counter-flaky"');
        (0, vitest_1.expect)(html).toContain('id="counter-skipped"');
        (0, vitest_1.expect)(html).toContain('id="failure-feed"');
        (0, vitest_1.expect)(html).toContain('id="progress-track"');
    });
    (0, vitest_1.it)('includes live badge indicator', () => {
        const html = (0, live_dashboard_1.generateLiveReportPage)({ jsonlFile: 'results.jsonl' });
        (0, vitest_1.expect)(html).toContain('live-badge');
        (0, vitest_1.expect)(html).toContain('live-dot');
    });
    (0, vitest_1.it)('reads totalExpected (not totalTests) from start event', () => {
        const html = (0, live_dashboard_1.generateLiveReportPage)({ jsonlFile: 'results.jsonl' });
        (0, vitest_1.expect)(html).toContain('ev.totalExpected');
        (0, vitest_1.expect)(html).not.toContain('ev.totalTests');
    });
    (0, vitest_1.it)('includes timeout for waitForFinalReport polling', () => {
        const html = (0, live_dashboard_1.generateLiveReportPage)({ jsonlFile: 'results.jsonl' });
        (0, vitest_1.expect)(html).toContain('maxFinalReportAttempts');
        (0, vitest_1.expect)(html).toContain('timed out');
    });
});
