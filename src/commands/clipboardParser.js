// src/commands/clipboardParser.js
// Pure parser for clipboard content - can be tested independently

import { parseCodeMapHTML } from '../parser.js';

/**
 * Parse clipboard content and extract code map data
 * @param {string} clipboardContent - Content from clipboard
 * @returns {{success: boolean, data?: Object, error?: string}}
 */
export function parseClipboardContent(clipboardContent) {
    if (!clipboardContent) {
        return {
            success: false,
            error: 'Clipboard is empty'
        };
    }

    // Try parsing as JSON first (from extractor script)
    try {
        const jsonData = JSON.parse(clipboardContent);
        if (jsonData.html) {
            const codeMapData = parseCodeMapHTML(jsonData.html);
            if (jsonData.title) {
                codeMapData.title = jsonData.title;
            }
            return {
                success: true,
                data: codeMapData
            };
        }
    } catch (e) {
        // Not JSON or invalid JSON, continue to next method
    }

    // Try parsing as raw HTML
    if (clipboardContent.includes('code-map')) {
        try {
            const codeMapData = parseCodeMapHTML(clipboardContent);
            return {
                success: true,
                data: codeMapData
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to parse HTML: ${error.message}`
            };
        }
    }

    return {
        success: false,
        error: 'Clipboard does not contain valid Code Map data'
    };
}
