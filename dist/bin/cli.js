#!/usr/bin/env node
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const args = process.argv.slice(2);
const command = args[0];
function printUsage() {
    console.log(`
Usage: playwright-smart-reporter <command> [options]

Commands:
  gate      Evaluate quality gates against a JSON export
  digest    Generate a test health digest from history

Run playwright-smart-reporter <command> --help for command-specific help.
`);
}
function parseFlag(flag) {
    const idx = args.indexOf(flag);
    if (idx === -1 || idx + 1 >= args.length)
        return undefined;
    return args[idx + 1];
}
function hasFlag(flag) {
    return args.includes(flag);
}
async function runGate() {
    if (hasFlag('--help')) {
        console.log(`
Usage: playwright-smart-reporter gate [options]

Evaluate quality gates against a JSON export file.

Options:
  --config <path>    Path to gates config JSON file (required)
  --data <path>      Path to smart-report-data.json (default: smart-report-data.json)
  --help             Show this help
`);
        return;
    }
    const configPath = parseFlag('--config');
    const dataPath = parseFlag('--data') ?? 'smart-report-data.json';
    if (!configPath) {
        console.error('Error: --config is required. Provide a JSON file with quality gate rules.');
        console.error('Example: playwright-smart-reporter gate --config gates.json');
        process.exitCode = 1;
        return;
    }
    if (!fs.existsSync(configPath)) {
        console.error(`Error: Config file not found: ${configPath}`);
        process.exitCode = 1;
        return;
    }
    if (!fs.existsSync(dataPath)) {
        console.error(`Error: Data file not found: ${dataPath}`);
        console.error('Run your tests with exportJson: true to generate this file.');
        process.exitCode = 1;
        return;
    }
    const { QualityGateEvaluator, formatGateReport } = await Promise.resolve().then(() => __importStar(require('../gates')));
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    // Reconstruct minimal TestResultData from JSON export
    const results = (data.tests || []).map((t) => ({
        testId: t.testId,
        title: t.title,
        file: t.file,
        status: t.status,
        duration: t.duration,
        outcome: t.outcome,
        flakinessScore: t.flakinessScore,
        stabilityScore: t.stabilityScore ? {
            overall: t.stabilityScore.overall,
            grade: t.stabilityScore.grade,
            flakiness: 0,
            performance: 0,
            reliability: 0,
            needsAttention: false,
        } : undefined,
        error: t.error,
        retry: t.retry,
        steps: [],
        history: [],
    }));
    const evaluator = new QualityGateEvaluator();
    const result = evaluator.evaluate(config, results, data.comparison);
    console.log(formatGateReport(result));
    if (!result.passed) {
        process.exitCode = 1;
    }
}
async function runDigest() {
    if (hasFlag('--help')) {
        console.log(`
Usage: playwright-smart-reporter digest [options]

Generate a test health digest from history.

Options:
  --period <period>    Analysis period: daily, weekly, monthly (default: weekly)
  --history <path>     Path to test-history.json (default: test-history.json)
  --output <path>      Write output to file instead of stdout
  --format <format>    Output format: markdown, text (default: markdown)
  --help               Show this help
`);
        return;
    }
    const period = (parseFlag('--period') ?? 'weekly');
    const historyPath = parseFlag('--history') ?? 'test-history.json';
    const output = parseFlag('--output');
    const format = (parseFlag('--format') ?? 'markdown');
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
        console.error(`Error: Invalid period "${period}". Use daily, weekly, or monthly.`);
        process.exitCode = 1;
        return;
    }
    if (!fs.existsSync(historyPath)) {
        console.error(`Error: History file not found: ${historyPath}`);
        console.error('Run your tests with historyFile configured to generate this file.');
        process.exitCode = 1;
        return;
    }
    const { HealthDigest } = await Promise.resolve().then(() => __importStar(require('../digest')));
    const history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
    const digest = new HealthDigest();
    const data = digest.analyze(history, {
        period,
        historyFile: historyPath,
        format,
    });
    const content = format === 'text'
        ? digest.generateText(data)
        : digest.generateMarkdown(data);
    if (output) {
        fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
        fs.writeFileSync(output, content);
        console.log(`Digest written to ${output}`);
    }
    else {
        console.log(content);
    }
}
async function main() {
    switch (command) {
        case 'gate':
            await runGate();
            break;
        case 'digest':
            await runDigest();
            break;
        case '--help':
        case '-h':
        case undefined:
            printUsage();
            break;
        default:
            console.error(`Unknown command: ${command}`);
            printUsage();
            process.exitCode = 1;
    }
}
main().catch(err => {
    console.error('Error:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
});
