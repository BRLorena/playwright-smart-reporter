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
exports.buildSseHandler = buildSseHandler;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function buildSseHandler(jsonlPath) {
    const clients = new Set();
    let lastOffset = 0;
    let watcher = null;
    let dirWatcher = null;
    let pollInterval = null;
    if (fs.existsSync(jsonlPath)) {
        lastOffset = fs.statSync(jsonlPath).size;
    }
    function broadcastNewLines() {
        if (clients.size === 0)
            return;
        let content;
        try {
            const fd = fs.openSync(jsonlPath, 'r');
            const stat = fs.fstatSync(fd);
            if (stat.size < lastOffset) {
                // File was truncated/recreated (e.g. new test run) — reset
                lastOffset = 0;
            }
            if (stat.size <= lastOffset) {
                fs.closeSync(fd);
                return;
            }
            const buf = Buffer.alloc(stat.size - lastOffset);
            fs.readSync(fd, buf, 0, buf.length, lastOffset);
            fs.closeSync(fd);
            lastOffset = stat.size;
            content = buf.toString('utf-8');
        }
        catch {
            return;
        }
        const lines = content.split('\n').filter(l => l.trim());
        for (const line of lines) {
            const message = `data: ${line}\n\n`;
            for (const client of clients) {
                try {
                    client.write(message);
                }
                catch {
                    clients.delete(client);
                }
            }
        }
    }
    function startFileWatcher() {
        if (watcher)
            return;
        try {
            watcher = fs.watch(jsonlPath, (event) => {
                if (event === 'rename') {
                    // File was replaced — restart watcher
                    watcher?.close();
                    watcher = null;
                    lastOffset = 0;
                    if (fs.existsSync(jsonlPath)) {
                        startFileWatcher();
                        broadcastNewLines();
                    }
                    else {
                        // File deleted, watch directory for recreation
                        startDirWatcher();
                    }
                    return;
                }
                broadcastNewLines();
            });
        }
        catch {
            // ignore
        }
    }
    function startDirWatcher() {
        if (dirWatcher)
            return;
        const dir = path.dirname(jsonlPath);
        const base = path.basename(jsonlPath);
        try {
            dirWatcher = fs.watch(dir, (_event, filename) => {
                if (filename === base && fs.existsSync(jsonlPath) && !watcher) {
                    lastOffset = 0;
                    startFileWatcher();
                    if (dirWatcher) {
                        dirWatcher.close();
                        dirWatcher = null;
                    }
                    broadcastNewLines();
                }
            });
        }
        catch {
            // Parent dir doesn't exist yet
        }
    }
    // Watch the file if it exists, otherwise watch the parent directory for creation
    if (fs.existsSync(jsonlPath)) {
        startFileWatcher();
    }
    else {
        startDirWatcher();
    }
    // Polling fallback: fs.watch is unreliable on macOS for file creation in large dirs.
    // Poll every 500ms to catch new data regardless of watcher state.
    // Skip polling when no clients are connected to avoid unnecessary I/O.
    pollInterval = setInterval(() => {
        if (clients.size === 0)
            return;
        if (!fs.existsSync(jsonlPath))
            return;
        if (!watcher) {
            lastOffset = 0;
            startFileWatcher();
        }
        broadcastNewLines();
    }, 500);
    return {
        addClient(client) {
            clients.add(client);
            if (fs.existsSync(jsonlPath)) {
                try {
                    const content = fs.readFileSync(jsonlPath, 'utf-8');
                    const lines = content.split('\n').filter(l => l.trim());
                    for (const line of lines) {
                        client.write(`data: ${line}\n\n`);
                    }
                }
                catch {
                    // ignore
                }
            }
        },
        removeClient(client) {
            clients.delete(client);
        },
        clientCount() {
            return clients.size;
        },
        stop() {
            if (watcher) {
                watcher.close();
                watcher = null;
            }
            if (dirWatcher) {
                dirWatcher.close();
                dirWatcher = null;
            }
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }
            clients.clear();
        },
    };
}
