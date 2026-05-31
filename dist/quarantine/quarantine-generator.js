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
exports.QuarantineGenerator = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class QuarantineGenerator {
    constructor(config) {
        this.config = {
            threshold: config.threshold ?? 0.3,
            maxQuarantined: config.maxQuarantined ?? 50,
            outputFile: config.outputFile ?? '.smart-quarantine.json',
        };
    }
    generate(results, outputDir) {
        const now = new Date().toISOString();
        const entries = results
            .filter(r => r.outcome !== 'skipped')
            .filter(r => r.flakinessScore !== undefined && r.flakinessScore >= this.config.threshold)
            .sort((a, b) => b.flakinessScore - a.flakinessScore)
            .slice(0, this.config.maxQuarantined)
            .map(r => ({
            testId: r.testId,
            title: r.title,
            file: r.file,
            flakinessScore: r.flakinessScore,
            quarantinedAt: now,
        }));
        if (entries.length === 0) {
            return null;
        }
        const quarantineFile = {
            generatedAt: now,
            threshold: this.config.threshold,
            entries,
        };
        const filePath = path.resolve(outputDir, this.config.outputFile);
        fs.writeFileSync(filePath, JSON.stringify(quarantineFile, null, 2));
        return quarantineFile;
    }
    getOutputPath(outputDir) {
        return path.resolve(outputDir, this.config.outputFile);
    }
}
exports.QuarantineGenerator = QuarantineGenerator;
