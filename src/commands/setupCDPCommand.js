// src/commands/setupCDPCommand.js

import * as vscode from 'vscode';
import { COMMANDS } from '../constants.js';
import { showCDPSetupPanel } from '../ui/index.js';

/**
 * Execute setup CDP command
 */
async function executeSetupCDP() {
    showCDPSetupPanel();
}

/**
 * Register the setup CDP command
 * @param {vscode.ExtensionContext} context
 */
export function registerSetupCDPCommand(context) {
    const disposable = vscode.commands.registerCommand(
        COMMANDS.SETUP_CDP,
        executeSetupCDP
    );

    context.subscriptions.push(disposable);
}
