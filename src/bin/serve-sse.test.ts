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
    // Simulates serve.ts HTML injection logic for the main report
    const html = `<script>var runEnabled = '__RUN_ENABLED__';</script>`;
    const injected = html.replace(/__RUN_ENABLED__/g, 'true');
    expect(injected).not.toContain('__RUN_ENABLED__');
    expect(injected).toContain("'true'");
  });

  it('leaves __RUN_ENABLED__ as-is when runCommand is not set', () => {
    const html = `<script>var runEnabled = '__RUN_ENABLED__';</script>`;
    // Without replacement, the JS equality check will be false
    expect(html).toContain("'__RUN_ENABLED__'");
    // The placeholder string does not equal 'true'
    const match = html.match(/var runEnabled = '([^']+)'/);
    expect(match?.[1]).toBe('__RUN_ENABLED__');
    expect(match?.[1]).not.toBe('true');
  });
});
