// src/ui/cdpSetupPanel.js

import * as vscode from 'vscode';
import { getCDPSetupHTML } from './scripts.js';

/**
 * Show CDP setup instructions in a webview panel
 * @returns {vscode.WebviewPanel}
 */
export function showCDPSetupPanel() {
    const panel = vscode.window.createWebviewPanel(
        'cdpSetup',
        'Setup Auto-Export',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    panel.webview.html = getCDPSetupHTML();

    return panel;
}
