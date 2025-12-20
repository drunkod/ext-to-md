// extension.js - Entry point

import * as vscode from 'vscode';
import { createStatusBar } from './src/statusBar.js';
import { registerAllCommands } from './src/commands/index.js';

/**
 * Activate the extension
 * @param {vscode.ExtensionContext} context
 */
export function activate(context) {
    console.log('Code Map Exporter activated');

    // Initialize status bar
    createStatusBar(context);

    // Register all commands
    registerAllCommands(context);
}

/**
 * Deactivate the extension
 */
export function deactivate() {
    // Cleanup if needed
}
