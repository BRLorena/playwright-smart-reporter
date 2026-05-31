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
const quality_gate_evaluator_1 = require("../gates/quality-gate-evaluator");
const quality_gate_reporter_1 = require("../gates/quality-gate-reporter");
function printUsage() {
    console.log(`
Usage: playwright-smart-reporter gate [options]

Evaluate quality gates against smart-report-data.json.

Options:
  --input <path>              Path to smart-report-data.json (default: ./smart-report-data.json)
  --config <path>             Path to quality gates JSON config file
  --max-failures <n>          Maximum allowed failures
  --min-pass-rate <n>         Minimum pass rate percentage
  --max-flaky-rate <n>        Maximum flaky rate percentage
  --min-stability-grade <g>   Minimum stability grade (A, B, C, D)
  --no-new-failures           Fail if new failures detected (requires comparison data)
  -h, --help                  Show this help message

Examples:
  playwright-smart-reporter gate --config gates.json
  playwright-smart-reporter gate --max-failures 5 --min-pass-rate 90
  playwright-smart-reporter gate --input ./report/smart-report-data.json --max-flaky-rate 5
`);
}
function parseArgs(argv) {
    const args = argv.slice(2);
    // Strip leading "gate" subcommand if present
    if (args[0] === 'gate') {
        args.shift();
    }
    if (args.includes('-h') || args.includes('--help')) {
        printUsage();
        process.exit(0);
    }
    const options = {
        inputPath: path.resolve(process.cwd(), 'smart-report-data.json'),
    };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--input':
                options.inputPath = path.resolve(process.cwd(), args[++i]);
                break;
            case '--config':
                options.configPath = path.resolve(process.cwd(), args[++i]);
                break;
            case '--max-failures':
                options.maxFailures = parseInt(args[++i], 10);
                break;
            case '--min-pass-rate':
                options.minPassRate = parseFloat(args[++i]);
                break;
            case '--max-flaky-rate':
                options.maxFlakyRate = parseFloat(args[++i]);
                break;
            case '--min-stability-grade':
                options.minStabilityGrade = args[++i];
                break;
            case '--no-new-failures':
                options.noNewFailures = true;
                break;
        }
    }
    return options;
}
function buildConfig(options) {
    // If a config file is specified, load it as the base
    let config = {};
    if (options.configPath) {
        if (!fs.existsSync(options.configPath)) {
            console.error(`Error: Config file not found: ${options.configPath}`);
            process.exit(1);
        }
        try {
            config = JSON.parse(fs.readFileSync(options.configPath, 'utf-8'));
        }
        catch (err) {
            console.error(`Error: Failed to parse config file: ${err.message}`);
            process.exit(1);
        }
    }
    // CLI flags override config file values
    if (options.maxFailures !== undefined)
        config.maxFailures = options.maxFailures;
    if (options.minPassRate !== undefined)
        config.minPassRate = options.minPassRate;
    if (options.maxFlakyRate !== undefined)
        config.maxFlakyRate = options.maxFlakyRate;
    if (options.minStabilityGrade !== undefined)
        config.minStabilityGrade = options.minStabilityGrade;
    if (options.noNewFailures !== undefined)
        config.noNewFailures = options.noNewFailures;
    return config;
}
function toTestResultData(entry) {
    const stabilityScore = entry.stabilityScore
        ? {
            overall: entry.stabilityScore.overall,
            flakiness: 0,
            performance: 0,
            reliability: 0,
            grade: entry.stabilityScore.grade,
            needsAttention: false,
        }
        : undefined;
    return {
        testId: entry.testId,
        title: entry.title,
        file: entry.file,
        status: entry.status,
        duration: entry.duration,
        error: entry.error,
        retry: entry.retry,
        outcome: entry.outcome,
        flakinessScore: entry.flakinessScore,
        stabilityScore,
        steps: [],
        history: [],
    };
}
function main() {
    const options = parseArgs(process.argv);
    const config = buildConfig(options);
    // Check if any rules are configured
    const hasRules = config.maxFailures !== undefined
        || config.minPassRate !== undefined
        || config.maxFlakyRate !== undefined
        || config.minStabilityGrade !== undefined
        || config.noNewFailures !== undefined;
    if (!hasRules) {
        console.error('Error: No quality gate rules configured. Use --config or inline flags.');
        printUsage();
        process.exit(1);
    }
    // Load report data
    if (!fs.existsSync(options.inputPath)) {
        console.error(`Error: Report data not found: ${options.inputPath}`);
        console.error('Run your Playwright tests with exportJson: true first.');
        process.exit(1);
    }
    let reportData;
    try {
        reportData = JSON.parse(fs.readFileSync(options.inputPath, 'utf-8'));
    }
    catch (err) {
        console.error(`Error: Failed to parse report data: ${err.message}`);
        process.exit(1);
    }
    const report = reportData;
    const tests = report.tests || [];
    const results = tests.map(toTestResultData);
    const comparison = report.comparison;
    const evaluator = new quality_gate_evaluator_1.QualityGateEvaluator();
    const gateResult = evaluator.evaluate(config, results, comparison);
    console.log((0, quality_gate_reporter_1.formatGateReport)(gateResult));
    if (!gateResult.passed) {
        process.exitCode = 1;
    }
}
main();
