// src/ui/inlineExtractorPanel.js

import * as vscode from 'vscode';
import { COMMANDS } from '../constants.js';
import {
    EXTRACTOR_SCRIPT_MINIFIED,
    getExtractorScript,
    getInlineExtractorHTML
} from './scripts.js';

// Re-export for backward compatibility
export { getExtractorScript };

/**
 * Show inline extractor panel
 * @returns {Promise<vscode.WebviewPanel>}
 */
export async function showInlineExtractorPanel() {
    const panel = vscode.window.createWebviewPanel(
        'inlineExtractor',
        'Extract Code Map',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    panel.webview.html = getInlineExtractorHTML(EXTRACTOR_SCRIPT_MINIFIED);

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(async message => {
        if (message.command === 'export') {
            panel.dispose();
            await vscode.commands.executeCommand(COMMANDS.EXPORT);
        }
    });

    return panel;
}
