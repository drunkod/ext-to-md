// test/ui.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert';

// Import from scripts.js directly - no vscode dependency
import {
    getExtractorScript,
    getInlineExtractorHTML,
    getCDPSetupHTML,
    EXTRACTOR_SCRIPT_MINIFIED
} from '../src/ui/scripts.js';

describe('UI Modules', () => {

    describe('Extractor Script', () => {

        it('should export extractor script', () => {
            const script = getExtractorScript();
            assert.ok(script);
            assert.ok(typeof script === 'string');
            assert.ok(script.length > 0);
        });

        it('should be an IIFE (immediately invoked function expression)', () => {
            const script = getExtractorScript();
            assert.ok(script.startsWith('(async function(){'));
            assert.ok(script.endsWith('})()'));
        });

        it('should query for code-map-editor-container', () => {
            const script = getExtractorScript();
            assert.ok(script.includes('code-map-editor-container'));
        });

        it('should handle "See more" buttons', () => {
            const script = getExtractorScript();
            assert.ok(script.includes('see more'));
            assert.ok(script.includes('trace-guide-toggle'));
        });

        it('should expand collapsed traces', () => {
            const script = getExtractorScript();
            assert.ok(script.includes('data-collapsed'));
            assert.ok(script.includes('trace-header'));
        });

        it('should copy to clipboard', () => {
            const script = getExtractorScript();
            assert.ok(script.includes('navigator.clipboard'));
            assert.ok(script.includes('writeText'));
        });

        it('should extract title', () => {
            const script = getExtractorScript();
            assert.ok(script.includes('code-map-title'));
        });

        it('should clone the node', () => {
            const script = getExtractorScript();
            assert.ok(script.includes('cloneNode'));
        });

        it('should include output with guide count', () => {
            const script = getExtractorScript();
            assert.ok(script.includes('guides found'));
            assert.ok(script.includes('Ctrl+Alt+M'));
        });

        it('should match minified constant', () => {
            const script = getExtractorScript();
            assert.strictEqual(script, EXTRACTOR_SCRIPT_MINIFIED);
        });
    });

    describe('CDP Setup Panel HTML', () => {

        it('should return valid HTML', () => {
            const html = getCDPSetupHTML();
            assert.ok(html.includes('<!DOCTYPE html>'));
            assert.ok(html.includes('</html>'));
        });

        it('should include setup instructions for Linux/macOS', () => {
            const html = getCDPSetupHTML();
            assert.ok(html.includes('windsurf --remote-debugging-port=9229'));
        });

        it('should include setup instructions for Windows', () => {
            const html = getCDPSetupHTML();
            assert.ok(html.includes('Windsurf.exe'));
            assert.ok(html.includes('--remote-debugging-port=9229'));
        });

        it('should include security warning', () => {
            const html = getCDPSetupHTML();
            assert.ok(html.includes('Security'));
            assert.ok(html.includes('CDP allows remote access'));
        });

        it('should include step-by-step instructions', () => {
            const html = getCDPSetupHTML();
            assert.ok(html.includes('Restart Windsurf'));
            assert.ok(html.includes('Open a Code Map'));
            assert.ok(html.includes('Ctrl+Alt+M'));
        });

        it('should use VS Code CSS variables', () => {
            const html = getCDPSetupHTML();
            assert.ok(html.includes('var(--vscode-'));
        });
    });

    describe('Inline Extractor Panel HTML', () => {

        it('should return valid HTML', () => {
            const html = getInlineExtractorHTML('test-script');
            assert.ok(html.includes('<!DOCTYPE html>'));
            assert.ok(html.includes('</html>'));
        });

        it('should embed the provided script', () => {
            const testScript = 'console.log("test")';
            const html = getInlineExtractorHTML(testScript);
            assert.ok(html.includes(testScript));
        });

        it('should have copy button', () => {
            const html = getInlineExtractorHTML('script');
            assert.ok(html.includes('id="copyBtn"'));
            assert.ok(html.includes('📋 Copy Script'));
        });

        it('should have export button', () => {
            const html = getInlineExtractorHTML('script');
            assert.ok(html.includes('id="exportBtn"'));
            assert.ok(html.includes('📄 Export to Markdown'));
        });

        it('should include keyboard shortcut hint', () => {
            const html = getInlineExtractorHTML('script');
            assert.ok(html.includes('<kbd>F12</kbd>'));
            assert.ok(html.includes('Console'));
        });

        it('should include VS Code API usage', () => {
            const html = getInlineExtractorHTML('script');
            assert.ok(html.includes('acquireVsCodeApi'));
            assert.ok(html.includes('vscode.postMessage'));
        });

        it('should have script box with correct class', () => {
            const html = getInlineExtractorHTML('script');
            assert.ok(html.includes('class="script-box"'));
        });

        it('should use VS Code CSS variables', () => {
            const html = getInlineExtractorHTML('script');
            assert.ok(html.includes('var(--vscode-button-background)'));
            assert.ok(html.includes('var(--vscode-foreground)'));
        });
    });
});
