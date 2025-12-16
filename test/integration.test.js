import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseCodeMapHTML } from '../src/parser.js';
import { generateMarkdown } from '../src/markdownGenerator.js';

describe('Integration Tests', () => {

    describe('Full Pipeline', () => {

        it('should parse and generate markdown for complete code map', () => {
            const html = `
                <div class="code-map-editor-container">
                    <h2 class="code-map-title">Complete Code Map Example</h2>
                    <div class="code-map-creation-date">Created December 15, 2024</div>
                    <div class="code-map-description">
                        This codebase demonstrates key features including [1a] initialization and [2a] configuration.
                    </div>
                    <div class="code-map-traces-container">
                        <div class="code-map-trace">
                            <div class="trace-header">
                                <h3 class="trace-title">Application Initialization</h3>
                                <p class="trace-description">How the app starts up See more</p>
                            </div>
                            <div class="trace-guide-container">
                                <div class="rendered-trace-guide">
                                    <div class="trace-guide-label">AI generated guide</div>
                                    <div>
                                        <h2>Motivation</h2>
                                        <p>The app needs to <strong>initialize</strong> properly.</p>
                                        <ul>
                                            <li>Load config</li>
                                            <li>Start services</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            <div class="trace-locations">
                                <div class="trace-tree-node root">
                                    <div class="trace-tree-label">App Entry Point</div>
                                    <div class="trace-tree-node-children">
                                        <div class="trace-tree-node">
                                            <div class="code-location">
                                                <div class="location-header">
                                                    <span class="step-number">1a</span>
                                                    <h4 class="location-title">Main function</h4>
                                                    <span class="location-filename">main.js:1</span>
                                                </div>
                                                <div class="code-content">function main() {</div>
                                            </div>
                                            <div class="trace-tree-node-children">
                                                <div class="trace-tree-node">
                                                    <div class="code-location">
                                                        <div class="location-header">
                                                            <span class="step-number">1b</span>
                                                            <h4 class="location-title">Initialize app</h4>
                                                            <span class="location-filename">main.js:2</span>
                                                        </div>
                                                        <div class="code-content">  init();</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="code-map-trace">
                            <div class="trace-header">
                                <h3 class="trace-title">Configuration Loading</h3>
                                <p class="trace-description">How config is loaded</p>
                            </div>
                            <div class="trace-locations">
                                <div class="trace-tree-node">
                                    <div class="code-location">
                                        <div class="location-header">
                                            <span class="step-number">2a</span>
                                            <h4 class="location-title">Load config</h4>
                                            <span class="location-filename">config.js:5</span>
                                        </div>
                                        <div class="code-content">const config = require('./config.json');</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Parse
            const codeMap = parseCodeMapHTML(html);

            // Verify parsing
            assert.strictEqual(codeMap.title, 'Complete Code Map Example');
            assert.strictEqual(codeMap.traces.length, 2);
            assert.ok(codeMap.traces[0].guide);
            assert.strictEqual(codeMap.traces[0].guide.label, 'Guide');
            assert.ok(codeMap.files['main.js']);
            assert.ok(codeMap.files['config.js']);

            // Generate markdown
            const markdown = generateMarkdown(codeMap, {
                includeGuides: true,
                includeFilesSection: true
            });

            // Verify markdown output
            assert.ok(markdown.includes('# Complete Code Map Example'));
            assert.ok(markdown.includes('📅 **Created:** December 15, 2024'));
            assert.ok(markdown.includes('**[1a]**'));
            assert.ok(markdown.includes('**[2a]**'));
            assert.ok(markdown.includes('## Table of Contents'));
            assert.ok(markdown.includes('1. [Application Initialization]'));
            assert.ok(markdown.includes('2. [Configuration Loading]'));
            assert.ok(markdown.includes('<details>'));
            assert.ok(markdown.includes('<strong>Guide</strong>'));
            assert.ok(markdown.includes('#### Motivation'));
            assert.ok(markdown.includes('- Load config'));
            assert.ok(markdown.includes('#### [1a] Main function'));
            assert.ok(markdown.includes('📄 `main.js:1`'));
            assert.ok(markdown.includes('```javascript'));
            assert.ok(markdown.includes('function main() {'));
            assert.ok(markdown.includes('## Referenced Files'));
            assert.ok(markdown.includes('<file path="config.js">'));
            assert.ok(markdown.includes('<file path="main.js">'));
        });

        it('should handle code map without guides', () => {
            const html = `
                <div class="code-map-editor-container">
                    <h2 class="code-map-title">No Guides Map</h2>
                    <div class="code-map-trace">
                        <div class="trace-header">
                            <h3 class="trace-title">Simple Trace</h3>
                        </div>
                        <div class="trace-guide-container" style="display: none;"></div>
                        <div class="trace-locations">
                            <div class="trace-tree-node">
                                <div class="code-location">
                                    <div class="location-header">
                                        <span class="step-number">1a</span>
                                        <h4 class="location-title">Code</h4>
                                        <span class="location-filename">file.js:1</span>
                                    </div>
                                    <div class="code-content">code();</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const codeMap = parseCodeMapHTML(html);
            const markdown = generateMarkdown(codeMap);

            assert.ok(!markdown.includes('<details>'));
            assert.ok(!markdown.includes('<strong>Guide</strong>'));
            assert.ok(markdown.includes('#### [1a] Code'));
        });

        it('should insert citations into full file content', () => {
            const html = `
                <div class="code-map-editor-container">
                    <h2 class="code-map-title">File Content Test</h2>
                    <div class="code-map-trace">
                        <div class="trace-header">
                            <h3 class="trace-title">Trace</h3>
                        </div>
                        <div class="trace-locations">
                            <div class="trace-tree-node">
                                <div class="code-location">
                                    <div class="location-header">
                                        <span class="step-number">1a</span>
                                        <h4 class="location-title">First line</h4>
                                        <span class="location-filename">test.js:2</span>
                                    </div>
                                    <div class="code-content">const x = 1;</div>
                                </div>
                            </div>
                            <div class="trace-tree-node">
                                <div class="code-location">
                                    <div class="location-header">
                                        <span class="step-number">1b</span>
                                        <h4 class="location-title">Second line</h4>
                                        <span class="location-filename">test.js:4</span>
                                    </div>
                                    <div class="code-content">const y = 2;</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const codeMap = parseCodeMapHTML(html);

            const fileContents = {
                'test.js': '// Header\nconst x = 1;\n// Comment\nconst y = 2;\n// Footer'
            };

            const markdown = generateMarkdown(codeMap, {
                includeFilesSection: true,
                fileContents
            });

            // Check that full file content is included with citations
            assert.ok(markdown.includes('// Header'));
            assert.ok(markdown.includes('<!-- [1a] First line (line 2) -->'));
            assert.ok(markdown.includes('const x = 1;'));
            assert.ok(markdown.includes('// Comment'));
            assert.ok(markdown.includes('<!-- [1b] Second line (line 4) -->'));
            assert.ok(markdown.includes('const y = 2;'));
            assert.ok(markdown.includes('// Footer'));
        });
    });
});
