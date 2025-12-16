import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
    generateMarkdown,
    formatDescription,
    generateFilesSection,
    insertCitationsIntoFile,
    escapeXml,
    detectLanguage,
    slugify
} from '../src/markdownGenerator.js';

describe('Markdown Generator', () => {

    describe('generateMarkdown', () => {

        it('should generate basic markdown structure', () => {
            const codeMap = {
                title: 'Test Code Map',
                createdDate: 'January 1, 2024',
                description: 'Test description',
                traces: [],
                files: {}
            };

            const result = generateMarkdown(codeMap);

            assert.ok(result.includes('# Test Code Map'));
            assert.ok(result.includes('📅 **Created:** January 1, 2024'));
            assert.ok(result.includes('## Overview'));
            assert.ok(result.includes('Test description'));
        });

        it('should generate table of contents', () => {
            const codeMap = {
                title: 'Test',
                traces: [
                    { number: 1, title: 'First Trace', locations: [] },
                    { number: 2, title: 'Second Trace', locations: [] }
                ],
                files: {}
            };

            const result = generateMarkdown(codeMap);

            assert.ok(result.includes('## Table of Contents'));
            assert.ok(result.includes('1. [First Trace]'));
            assert.ok(result.includes('2. [Second Trace]'));
        });

        it('should include guide with "Guide" label', () => {
            const codeMap = {
                title: 'Test',
                traces: [{
                    number: 1,
                    title: 'Trace with Guide',
                    guide: {
                        label: 'Guide',
                        content: 'This is guide content.'
                    },
                    locations: []
                }],
                files: {}
            };

            const result = generateMarkdown(codeMap, { includeGuides: true });

            assert.ok(result.includes('<details>'));
            assert.ok(result.includes('<strong>Guide</strong>'));
            assert.ok(result.includes('This is guide content.'));
            assert.ok(result.includes('</details>'));
        });

        it('should exclude guide when includeGuides is false', () => {
            const codeMap = {
                title: 'Test',
                traces: [{
                    number: 1,
                    title: 'Trace',
                    guide: { content: 'Guide content' },
                    locations: []
                }],
                files: {}
            };

            const result = generateMarkdown(codeMap, { includeGuides: false });

            assert.ok(!result.includes('<details>'));
            assert.ok(!result.includes('Guide content'));
        });

        it('should generate code locations', () => {
            const codeMap = {
                title: 'Test',
                traces: [{
                    number: 1,
                    title: 'Trace',
                    locations: [{
                        type: 'code',
                        stepNumber: '1a',
                        title: 'Initialize',
                        filename: 'app.js:10',
                        code: 'init();',
                        depth: 0
                    }]
                }],
                files: {}
            };

            const result = generateMarkdown(codeMap);

            assert.ok(result.includes('#### [1a] Initialize'));
            assert.ok(result.includes('📄 `app.js:10`'));
            assert.ok(result.includes('```javascript'));
            assert.ok(result.includes('init();'));
        });
    });

    describe('formatDescription', () => {

        it('should bold step references', () => {
            const result = formatDescription('See [1a] and [2b] for details.');
            assert.strictEqual(result, 'See **[1a]** and **[2b]** for details.');
        });

        it('should handle multiple digit traces', () => {
            const result = formatDescription('Check [10a] and [99z].');
            assert.strictEqual(result, 'Check **[10a]** and **[99z]**.');
        });

        it('should not modify other brackets', () => {
            const result = formatDescription('Array [0] and object["key"]');
            assert.strictEqual(result, 'Array [0] and object["key"]');
        });
    });

    describe('insertCitationsIntoFile', () => {

        it('should insert citations before referenced lines', () => {
            const content = 'line 1\nline 2\nline 3\nline 4\nline 5';
            const snippets = [
                { stepNumber: '1a', title: 'First ref', lineNumber: '2' },
                { stepNumber: '1b', title: 'Second ref', lineNumber: '4' }
            ];

            const result = insertCitationsIntoFile(content, snippets);
            const lines = result.split('\n');

            assert.ok(lines[1].includes('<!-- [1a]'));
            assert.ok(lines[1].includes('(line 2)'));
            assert.strictEqual(lines[2], 'line 2');

            assert.ok(lines[4].includes('<!-- [1b]'));
            assert.ok(lines[4].includes('(line 4)'));
            assert.strictEqual(lines[5], 'line 4');
        });

        it('should handle multiple citations on same line', () => {
            const content = 'line 1\nline 2\nline 3';
            const snippets = [
                { stepNumber: '1a', title: 'First', lineNumber: '2' },
                { stepNumber: '1b', title: 'Second', lineNumber: '2' }
            ];

            const result = insertCitationsIntoFile(content, snippets);

            assert.ok(result.includes('<!-- [1a]'));
            assert.ok(result.includes('<!-- [1b]'));
        });

        it('should handle snippets without line numbers', () => {
            const content = 'line 1\nline 2';
            const snippets = [
                { stepNumber: '1a', title: 'No line', lineNumber: null }
            ];

            const result = insertCitationsIntoFile(content, snippets);

            // Should not add any citations
            assert.ok(!result.includes('<!--'));
        });
    });

    describe('generateFilesSection', () => {

        it('should generate XML files section', () => {
            const filesMap = {
                'test.js': [
                    { stepNumber: '1a', title: 'Test', lineNumber: '5', code: 'test();' }
                ]
            };

            const result = generateFilesSection(filesMap, {});

            assert.ok(result.includes('```xml'));
            assert.ok(result.includes('<files>'));
            assert.ok(result.includes('<file path="test.js">'));
            assert.ok(result.includes('<!-- [1a] Test (line 5) -->'));
            assert.ok(result.includes('test();'));
            assert.ok(result.includes('</file>'));
            assert.ok(result.includes('</files>'));
        });

        it('should use full file content when provided', () => {
            const filesMap = {
                'app.js': [
                    { stepNumber: '1a', title: 'Init', lineNumber: '2', code: 'init();' }
                ]
            };
            const fileContents = {
                'app.js': 'line 1\ninit();\nline 3'
            };

            const result = generateFilesSection(filesMap, fileContents);

            assert.ok(result.includes('line 1'));
            assert.ok(result.includes('<!-- [1a] Init (line 2) -->'));
            assert.ok(result.includes('init();'));
            assert.ok(result.includes('line 3'));
        });

        it('should sort files alphabetically', () => {
            const filesMap = {
                'zebra.js': [{ stepNumber: '1a', title: 'Z', lineNumber: '1', code: 'z' }],
                'alpha.js': [{ stepNumber: '1b', title: 'A', lineNumber: '1', code: 'a' }],
                'beta.js': [{ stepNumber: '1c', title: 'B', lineNumber: '1', code: 'b' }]
            };

            const result = generateFilesSection(filesMap, {});

            const alphaPos = result.indexOf('alpha.js');
            const betaPos = result.indexOf('beta.js');
            const zebraPos = result.indexOf('zebra.js');

            assert.ok(alphaPos < betaPos);
            assert.ok(betaPos < zebraPos);
        });
    });

    describe('escapeXml', () => {

        it('should escape ampersand', () => {
            assert.strictEqual(escapeXml('a & b'), 'a &amp; b');
        });

        it('should escape angle brackets', () => {
            assert.strictEqual(escapeXml('<tag>'), '&lt;tag&gt;');
        });

        it('should escape quotes', () => {
            assert.strictEqual(escapeXml('"quoted"'), '&quot;quoted&quot;');
            assert.strictEqual(escapeXml("'quoted'"), '&apos;quoted&apos;');
        });

        it('should escape all special chars together', () => {
            assert.strictEqual(
                escapeXml('<a href="test" class=\'x\'> & </a>'),
                '&lt;a href=&quot;test&quot; class=&apos;x&apos;&gt; &amp; &lt;/a&gt;'
            );
        });
    });

    describe('detectLanguage', () => {

        it('should detect JavaScript', () => {
            assert.strictEqual(detectLanguage('app.js'), 'javascript');
            assert.strictEqual(detectLanguage('app.js:10'), 'javascript');
        });

        it('should detect TypeScript', () => {
            assert.strictEqual(detectLanguage('app.ts'), 'typescript');
            assert.strictEqual(detectLanguage('app.tsx'), 'typescript');
        });

        it('should detect Clojure variants', () => {
            assert.strictEqual(detectLanguage('app.clj'), 'clojure');
            assert.strictEqual(detectLanguage('app.cljs'), 'clojure');
            assert.strictEqual(detectLanguage('app.cljd'), 'clojure');
        });

        it('should detect Nix', () => {
            assert.strictEqual(detectLanguage('flake.nix'), 'nix');
        });

        it('should handle Makefile', () => {
            assert.strictEqual(detectLanguage('Makefile'), 'makefile');
            assert.strictEqual(detectLanguage('MAKEFILE'), 'makefile');
        });

        it('should handle lock files as JSON', () => {
            assert.strictEqual(detectLanguage('package-lock.json'), 'json');
            assert.strictEqual(detectLanguage('flake.lock'), 'json');
        });

        it('should return empty string for unknown', () => {
            assert.strictEqual(detectLanguage('file.xyz'), '');
            assert.strictEqual(detectLanguage(''), '');
        });
    });

    describe('slugify', () => {

        it('should convert to lowercase', () => {
            assert.strictEqual(slugify('Hello World'), 'hello-world');
        });

        it('should replace spaces with hyphens', () => {
            assert.strictEqual(slugify('hello world test'), 'hello-world-test');
        });

        it('should remove special characters', () => {
            assert.strictEqual(slugify('Hello: World! (Test)'), 'hello-world-test');
        });

        it('should limit length to 50 chars', () => {
            const longText = 'a'.repeat(100);
            const result = slugify(longText);
            assert.ok(result.length <= 50);
        });

        it('should collapse multiple hyphens', () => {
            assert.strictEqual(slugify('hello---world'), 'hello-world');
        });
    });
});
