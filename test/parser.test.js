import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
    parseCodeMapHTML,
    processInlineContent,
    convertGuideHtmlToMarkdown
} from '../src/parser.js';
import * as cheerio from 'cheerio';

describe('Parser', () => {

    describe('parseCodeMapHTML', () => {

        it('should parse basic code map structure', () => {
            const html = `
                <div class="code-map-editor-container">
                    <h2 class="code-map-title">Test Code Map</h2>
                    <div class="code-map-creation-date">Created January 1, 2024</div>
                    <div class="code-map-description">This is a test description with [1a] reference.</div>
                    <div class="code-map-traces-container">
                        <div class="code-map-trace">
                            <div class="trace-header">
                                <h3 class="trace-title">First Trace</h3>
                                <p class="trace-description">Trace description See more</p>
                            </div>
                            <div class="trace-locations"></div>
                        </div>
                    </div>
                </div>
            `;

            const result = parseCodeMapHTML(html);

            assert.strictEqual(result.title, 'Test Code Map');
            assert.strictEqual(result.createdDate, 'January 1, 2024');
            assert.ok(result.description.includes('[1a] reference'));
            assert.strictEqual(result.traces.length, 1);
            assert.strictEqual(result.traces[0].title, 'First Trace');
            assert.strictEqual(result.traces[0].description, 'Trace description');
        });

        it('should parse multiple traces', () => {
            const html = `
                <div class="code-map-editor-container">
                    <h2 class="code-map-title">Multi Trace Map</h2>
                    <div class="code-map-traces-container">
                        <div class="code-map-trace">
                            <div class="trace-header">
                                <h3 class="trace-title">Trace 1</h3>
                            </div>
                            <div class="trace-locations"></div>
                        </div>
                        <div class="code-map-trace">
                            <div class="trace-header">
                                <h3 class="trace-title">Trace 2</h3>
                            </div>
                            <div class="trace-locations"></div>
                        </div>
                        <div class="code-map-trace">
                            <div class="trace-header">
                                <h3 class="trace-title">Trace 3</h3>
                            </div>
                            <div class="trace-locations"></div>
                        </div>
                    </div>
                </div>
            `;

            const result = parseCodeMapHTML(html);

            assert.strictEqual(result.traces.length, 3);
            assert.strictEqual(result.traces[0].number, 1);
            assert.strictEqual(result.traces[1].number, 2);
            assert.strictEqual(result.traces[2].number, 3);
        });

        it('should parse code locations with file references', () => {
            const html = `
                <div class="code-map-editor-container">
                    <h2 class="code-map-title">Code Locations Test</h2>
                    <div class="code-map-trace">
                        <div class="trace-header">
                            <h3 class="trace-title">Trace</h3>
                        </div>
                        <div class="trace-locations">
                            <div class="trace-tree-node">
                                <div class="code-location">
                                    <div class="location-header">
                                        <span class="step-number">1a</span>
                                        <h4 class="location-title">Initialize app</h4>
                                        <span class="location-filename">app.js:10</span>
                                    </div>
                                    <div class="code-content">const app = new App();</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const result = parseCodeMapHTML(html);

            assert.strictEqual(result.traces[0].locations.length, 1);
            assert.strictEqual(result.traces[0].locations[0].type, 'code');
            assert.strictEqual(result.traces[0].locations[0].stepNumber, '1a');
            assert.strictEqual(result.traces[0].locations[0].title, 'Initialize app');
            assert.strictEqual(result.traces[0].locations[0].filename, 'app.js:10');
            assert.strictEqual(result.traces[0].locations[0].code, 'const app = new App();');
        });

        it('should collect files with line numbers', () => {
            const html = `
                <div class="code-map-editor-container">
                    <h2 class="code-map-title">Files Test</h2>
                    <div class="code-map-trace">
                        <div class="trace-header">
                            <h3 class="trace-title">Trace</h3>
                        </div>
                        <div class="trace-locations">
                            <div class="trace-tree-node">
                                <div class="code-location">
                                    <div class="location-header">
                                        <span class="step-number">1a</span>
                                        <h4 class="location-title">First ref</h4>
                                        <span class="location-filename">config.js:5</span>
                                    </div>
                                    <div class="code-content">const config = {};</div>
                                </div>
                            </div>
                            <div class="trace-tree-node">
                                <div class="code-location">
                                    <div class="location-header">
                                        <span class="step-number">1b</span>
                                        <h4 class="location-title">Second ref</h4>
                                        <span class="location-filename">config.js:10</span>
                                    </div>
                                    <div class="code-content">config.debug = true;</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const result = parseCodeMapHTML(html);

            assert.ok(result.files['config.js']);
            assert.strictEqual(result.files['config.js'].length, 2);
            assert.strictEqual(result.files['config.js'][0].lineNumber, '5');
            assert.strictEqual(result.files['config.js'][1].lineNumber, '10');
        });

        it('should parse guide with label "Guide"', () => {
            const html = `
                <div class="code-map-editor-container">
                    <h2 class="code-map-title">Guide Test</h2>
                    <div class="code-map-trace">
                        <div class="trace-header">
                            <h3 class="trace-title">Trace with Guide</h3>
                        </div>
                        <div class="trace-guide-container">
                            <div class="rendered-trace-guide">
                                <div class="trace-guide-label">AI generated guide</div>
                                <div>
                                    <h2>Motivation</h2>
                                    <p>This explains the motivation.</p>
                                </div>
                            </div>
                        </div>
                        <div class="trace-locations"></div>
                    </div>
                </div>
            `;

            const result = parseCodeMapHTML(html);

            assert.ok(result.traces[0].guide);
            assert.strictEqual(result.traces[0].guide.label, 'Guide');
            assert.ok(result.traces[0].guide.content.includes('Motivation'));
        });

        it('should parse nested tree nodes with depth', () => {
            const html = `
                <div class="code-map-editor-container">
                    <h2 class="code-map-title">Nested Test</h2>
                    <div class="code-map-trace">
                        <div class="trace-header">
                            <h3 class="trace-title">Trace</h3>
                        </div>
                        <div class="trace-locations">
                            <div class="trace-tree-node root">
                                <div class="trace-tree-label">Root Label</div>
                                <div class="trace-tree-node-children">
                                    <div class="trace-tree-node">
                                        <div class="trace-tree-label">Child Label</div>
                                        <div class="trace-tree-node-children">
                                            <div class="trace-tree-node">
                                                <div class="code-location">
                                                    <div class="location-header">
                                                        <span class="step-number">1a</span>
                                                        <h4 class="location-title">Deep code</h4>
                                                        <span class="location-filename">deep.js:1</span>
                                                    </div>
                                                    <div class="code-content">deep();</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const result = parseCodeMapHTML(html);
            const locations = result.traces[0].locations;

            assert.strictEqual(locations[0].type, 'label');
            assert.strictEqual(locations[0].text, 'Root Label');
            assert.strictEqual(locations[0].isRoot, true);
            assert.strictEqual(locations[0].depth, 0);

            assert.strictEqual(locations[1].type, 'label');
            assert.strictEqual(locations[1].text, 'Child Label');
            assert.strictEqual(locations[1].depth, 1);

            assert.strictEqual(locations[2].type, 'code');
            assert.strictEqual(locations[2].depth, 2);
        });
    });

    describe('processInlineContent', () => {

        it('should convert code tags to backticks', () => {
            const $ = cheerio.load('<p><code>const x = 1</code></p>');
            const result = processInlineContent($, $('p'));
            assert.strictEqual(result, '`const x = 1`');
        });

        it('should convert strong tags to bold', () => {
            const $ = cheerio.load('<p><strong>bold text</strong></p>');
            const result = processInlineContent($, $('p'));
            assert.strictEqual(result, '**bold text**');
        });

        it('should convert em tags to italic', () => {
            const $ = cheerio.load('<p><em>italic text</em></p>');
            const result = processInlineContent($, $('p'));
            assert.strictEqual(result, '*italic text*');
        });

        it('should convert step reference links', () => {
            const $ = cheerio.load('<p><a data-href="https://codemap/traceLoc/1a">[1a]</a></p>');
            const result = processInlineContent($, $('p'));
            assert.strictEqual(result, '**[1a]**');
        });

        it('should decode HTML entities', () => {
            const $ = cheerio.load('<p>&lt;div&gt; &amp; &quot;test&quot;</p>');
            const result = processInlineContent($, $('p'));
            assert.strictEqual(result, '<div> & "test"');
        });
    });

    describe('convertGuideHtmlToMarkdown', () => {

        it('should convert h2 to ####', () => {
            const $ = cheerio.load('<div><h2>Section Title</h2></div>');
            const result = convertGuideHtmlToMarkdown($, $('div'));
            assert.ok(result.includes('#### Section Title'));
        });

        it('should convert paragraphs', () => {
            const $ = cheerio.load('<div><p>This is a paragraph.</p></div>');
            const result = convertGuideHtmlToMarkdown($, $('div'));
            assert.ok(result.includes('This is a paragraph.'));
        });

        it('should convert ordered lists', () => {
            const $ = cheerio.load('<div><ol><li>First</li><li>Second</li></ol></div>');
            const result = convertGuideHtmlToMarkdown($, $('div'));
            assert.ok(result.includes('1. First'));
            assert.ok(result.includes('2. Second'));
        });

        it('should convert unordered lists', () => {
            const $ = cheerio.load('<div><ul><li>Item A</li><li>Item B</li></ul></div>');
            const result = convertGuideHtmlToMarkdown($, $('div'));
            assert.ok(result.includes('- Item A'));
            assert.ok(result.includes('- Item B'));
        });

        it('should convert code blocks', () => {
            const $ = cheerio.load('<div><pre><code>const x = 1;</code></pre></div>');
            const result = convertGuideHtmlToMarkdown($, $('div'));
            assert.ok(result.includes('```'));
            assert.ok(result.includes('const x = 1;'));
        });
    });
});
