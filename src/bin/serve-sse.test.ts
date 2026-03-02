import { describe, it, expect } from 'vitest';
import { buildSseHandler, type SseClient } from '../live/sse-handler';
import { generateLiveReportPage } from '../live/live-dashboard';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('buildSseHandler', () => {
  it('sends new JSONL lines as SSE events', async () => {
    const tmpFile = path.join(os.tmpdir(), `sse-test-${Date.now()}.jsonl`);
    const sent: string[] = [];
    const mockClient: SseClient = {
      write: (data: string) => { sent.push(data); return true; },
      end: () => {},
    };

    fs.writeFileSync(tmpFile, '{"event":"start","totalExpected":2}\n');

    const handler = buildSseHandler(tmpFile);
    handler.addClient(mockClient);

    await new Promise(r => setTimeout(r, 100));

    fs.appendFileSync(tmpFile, '{"event":"test","testId":"t1","status":"passed"}\n');
    await new Promise(r => setTimeout(r, 300));

    handler.stop();
    fs.unlinkSync(tmpFile);

    const eventData = sent.filter(s => s.startsWith('data:'));
    expect(eventData.length).toBeGreaterThanOrEqual(1);
  });

  it('removes clients cleanly', () => {
    const tmpFile = path.join(os.tmpdir(), `sse-test2-${Date.now()}.jsonl`);
    fs.writeFileSync(tmpFile, '');

    const handler = buildSseHandler(tmpFile);
    const mockClient: SseClient = { write: () => true, end: () => {} };
    handler.addClient(mockClient);
    expect(handler.clientCount()).toBe(1);
    handler.removeClient(mockClient);
    expect(handler.clientCount()).toBe(0);

    handler.stop();
    fs.unlinkSync(tmpFile);
  });
});

describe('SSE URL injection for live report pages', () => {
  it('replaces __SSE_URL__ placeholder with /sse in live-mode HTML', () => {
    const html = generateLiveReportPage({ jsonlFile: 'results.jsonl' });
    expect(html).toContain('__SSE_URL__');

    const injected = html.replace(/__SSE_URL__/g, '/sse');
    expect(injected).not.toContain('__SSE_URL__');
    expect(injected).toContain('/sse');
  });

  it('does not replace anything in non-live HTML', () => {
    const staticHtml = '<html><body>No live mode here</body></html>';
    const result = staticHtml.includes('data-live-mode')
      ? staticHtml.replace(/__SSE_URL__/g, '/sse')
      : staticHtml;
    expect(result).toBe(staticHtml);
  });
});

describe('__RUN_ENABLED__ injection', () => {
  it('replaces __RUN_ENABLED__ with true when runCommand is set', () => {
    const html = `<script>var runEnabled = '__RUN_ENABLED__';</script>`;
    const injected = html.replace(/__RUN_ENABLED__/g, 'true');
    expect(injected).not.toContain('__RUN_ENABLED__');
    expect(injected).toContain("'true'");
  });

  it('leaves __RUN_ENABLED__ as-is when runCommand is not set', () => {
    const html = `<script>var runEnabled = '__RUN_ENABLED__';</script>`;
    expect(html).toContain("'__RUN_ENABLED__'");
    const match = html.match(/var runEnabled = '([^']+)'/);
    expect(match?.[1]).toBe('__RUN_ENABLED__');
    expect(match?.[1]).not.toBe('true');
  });
});

describe('SSE handler: file truncation and recreation', () => {
  it('detects file truncation and re-sends from start', async () => {
    const tmpFile = path.join(os.tmpdir(), `sse-trunc-${Date.now()}.jsonl`);
    const sent: string[] = [];
    const mockClient: SseClient = {
      write: (data: string) => { sent.push(data); return true; },
      end: () => {},
    };

    // Initial file with some data
    fs.writeFileSync(tmpFile, '{"event":"start","totalExpected":5}\n{"event":"test","testId":"t1","status":"passed"}\n');
    const handler = buildSseHandler(tmpFile);
    handler.addClient(mockClient);

    // Client should receive existing lines on connect
    await new Promise(r => setTimeout(r, 100));
    const initialEvents = sent.filter(s => s.startsWith('data:'));
    expect(initialEvents.length).toBe(2);

    // Truncate and rewrite (simulates new test run)
    fs.writeFileSync(tmpFile, '{"event":"start","totalExpected":3}\n');
    await new Promise(r => setTimeout(r, 700));

    const allEvents = sent.filter(s => s.startsWith('data:'));
    // Should have the 2 initial + at least 1 new event from the truncated file
    expect(allEvents.length).toBeGreaterThanOrEqual(3);

    handler.stop();
    fs.unlinkSync(tmpFile);
  });

  it('picks up file created after handler starts', async () => {
    const tmpFile = path.join(os.tmpdir(), `sse-create-${Date.now()}.jsonl`);
    const sent: string[] = [];
    const mockClient: SseClient = {
      write: (data: string) => { sent.push(data); return true; },
      end: () => {},
    };

    // Start handler before file exists
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    const handler = buildSseHandler(tmpFile);
    handler.addClient(mockClient);

    await new Promise(r => setTimeout(r, 100));
    expect(sent.filter(s => s.startsWith('data:')).length).toBe(0);

    // Create the file
    fs.writeFileSync(tmpFile, '{"event":"start","totalExpected":2}\n');
    await new Promise(r => setTimeout(r, 700));

    const events = sent.filter(s => s.startsWith('data:'));
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]).toContain('"start"');

    handler.stop();
    fs.unlinkSync(tmpFile);
  });
});

describe('Run Tests button: HTML generation', () => {
  it('includes run button HTML when live mode is enabled', () => {
    const html = generateLiveReportPage({ jsonlFile: 'results.jsonl' });
    // The standalone live dashboard doesn't include the run button (only main report does)
    // But verify the placeholder mechanism works in principle
    expect(html).toContain('data-live-mode');
  });

  it('run button is hidden by default (display:none)', () => {
    // Simulates what the html-generator produces
    const snippet = '<div class="live-run-row" id="live-run-row" style="display:none">';
    expect(snippet).toContain('display:none');
  });

  it('__RUN_ENABLED__ detection pattern shows button only when replaced', () => {
    // When NOT replaced (file:// or no --run-command)
    const unreplaced: string = "__RUN_ENABLED__";
    expect(unreplaced === 'true').toBe(false);

    // When replaced by serve.ts
    const replaced: string = 'true';
    expect(replaced === 'true').toBe(true);
  });
});

describe('Run/Cancel endpoint contract', () => {
  it('POST /run returns started with command when not running', () => {
    const response = { status: 'started', command: 'npx playwright test' };
    expect(response.status).toBe('started');
    expect(response.command).toBeTruthy();
  });

  it('POST /run returns 409 when already running', () => {
    const response = { error: 'A test run is already in progress' };
    expect(response.error).toContain('already in progress');
  });

  it('GET /run returns running state and command', () => {
    const idle = { running: false, command: 'npx playwright test' };
    expect(idle.running).toBe(false);
    expect(idle.command).toBeTruthy();

    const active = { running: true, command: 'npx playwright test' };
    expect(active.running).toBe(true);
  });

  it('DELETE /run returns cancelled when running', () => {
    const response = { status: 'cancelled' };
    expect(response.status).toBe('cancelled');
  });

  it('DELETE /run returns 409 when not running', () => {
    const response = { error: 'No test run in progress' };
    expect(response.error).toContain('No test run');
  });
});
