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
exports.exportJsonData = exportJsonData;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function getReporterVersion() {
    try {
        const pkgPath = path.resolve(__dirname, '../../package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        return pkg.version || '0.0.0';
    }
    catch {
        return '0.0.0';
    }
}
function exportJsonData(results, history, startTime, options, comparison, failureClusters, outputDir, basename) {
    const baseDir = outputDir ?? (options.outputFile
        ? path.dirname(path.resolve(options.outputFile))
        : process.cwd());
    const filename = `${basename ?? 'smart-report'}-data.json`;
    const outputPath = path.resolve(baseDir, filename);
    const passed = results.filter(r => r.status === 'passed' || r.outcome === 'expected' || r.outcome === 'flaky').length;
    const failed = results.filter(r => r.outcome === 'unexpected' && (r.status === 'failed' || r.status === 'timedOut')).length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const flaky = results.filter(r => r.outcome === 'flaky').length;
    const duration = Date.now() - startTime;
    // Calculate average stability grade
    const gradedTests = results.filter(r => r.stabilityScore?.grade);
    const gradeMap = { A: 5, B: 4, C: 3, D: 2, F: 1 };
    const reverseGradeMap = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'F' };
    let avgGrade;
    if (gradedTests.length > 0) {
        const sum = gradedTests.reduce((acc, r) => acc + (gradeMap[r.stabilityScore.grade] || 0), 0);
        avgGrade = reverseGradeMap[Math.round(sum / gradedTests.length)] || 'C';
    }
    const tests = results.map(r => ({
        testId: r.testId,
        title: r.title,
        file: r.file,
        status: r.status,
        duration: r.duration,
        error: r.error,
        retry: r.retry,
        outcome: r.outcome,
        flakinessScore: r.flakinessScore,
        stabilityScore: r.stabilityScore ? {
            overall: r.stabilityScore.overall,
            grade: r.stabilityScore.grade,
        } : undefined,
        performanceTrend: r.performanceTrend,
        tags: r.tags,
        suite: r.suite,
        browser: r.browser,
        project: r.project,
        aiSuggestion: r.aiSuggestion,
    }));
    const clusters = failureClusters?.map(c => ({
        id: c.id,
        errorType: c.errorType,
        count: c.count,
        testIds: c.tests.map(t => t.testId),
        aiSuggestion: c.aiSuggestion,
    }));
    const data = {
        metadata: {
            generatedAt: new Date().toISOString(),
            reporterVersion: getReporterVersion(),
            projectName: options.projectName,
        },
        summary: {
            total: results.length,
            passed,
            failed,
            skipped,
            flaky,
            duration,
            passRate: results.length > 0 ? Math.round((passed / results.length) * 100) : 0,
            stabilityGrade: avgGrade,
        },
        tests,
        failureClusters: clusters,
        comparison,
        history: {
            runCount: history.runs.length,
            runs: history.runs,
            summaries: history.summaries,
        },
    };
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    return outputPath;
}
