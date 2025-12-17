// src/ui/index.js

export { showCDPSetupPanel } from './cdpSetupPanel.js';
export { showInlineExtractorPanel, getExtractorScript } from './inlineExtractorPanel.js';

// Also export pure functions for testing
export {
    getExtractorScript as getScript,
    getInlineExtractorHTML,
    getCDPSetupHTML,
    EXTRACTOR_SCRIPT,
    EXTRACTOR_SCRIPT_MINIFIED
} from './scripts.js';
