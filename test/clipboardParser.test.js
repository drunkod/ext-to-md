// test/clipboardParser.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseClipboardContent } from '../src/commands/clipboardParser.js';

describe('Clipboard Parser', () => {

    describe('parseClipboardContent', () => {

        it('should parse valid JSON from extractor script', () => {
            const jsonData = JSON.stringify({
                title: 'Test Map',
                html: `
                    <div class="code-map-editor-container">
                        <h2 class="code-map-title">Test Map</h2>
                        <div class="code-map-trace">
                            <div class="trace-header">
                                <h3 class="trace-title">Trace 1</h3>
                            </div>
                            <div class="trace-locations"></div>
                        </div>
                    </div>
                `
            });

            const result = parseClipboardContent(jsonData);

            assert.strictEqual(result.success, true);
            assert.ok(result.data);
            assert.strictEqual(result.data.title, 'Test Map');
            assert.strictEqual(result.data.traces.length, 1);
        });

        it('should parse raw HTML', () => {
            const html = `
                <div class="code-map-editor-container">
                    <h2 class="code-map-title">Raw HTML Map</h2>
                    <div class="code-map-trace">
                        <div class="trace-header">
                            <h3 class="trace-title">Trace</h3>
                        </div>
                        <div class="trace-locations"></div>
                    </div>
                </div>
            `;

            const result = parseClipboardContent(html);

            assert.strictEqual(result.success, true);
            assert.ok(result.data);
            assert.strictEqual(result.data.title, 'Raw HTML Map');
        });

        it('should fail on empty clipboard', () => {
            const result = parseClipboardContent('');

            assert.strictEqual(result.success, false);
            assert.ok(result.error.includes('empty'));
        });

        it('should fail on invalid content', () => {
            const result = parseClipboardContent('random text without code map');

            assert.strictEqual(result.success, false);
            assert.ok(result.error);
        });

        it('should fail on invalid JSON', () => {
            const result = parseClipboardContent('{ invalid json }');

            assert.strictEqual(result.success, false);
            assert.ok(result.error);
        });

        it('should fail on JSON without html field', () => {
            const jsonData = JSON.stringify({
                title: 'Test',
                noHtml: true
            });

            const result = parseClipboardContent(jsonData);

            assert.strictEqual(result.success, false);
        });
    });
});
