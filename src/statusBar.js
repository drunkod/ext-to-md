// src/statusBar.js

import * as vscode from 'vscode';
import { COMMANDS, STATUS_BAR_STATES, TIMING } from './constants.js';

let statusBarItem = null;

/**
 * Create and initialize the status bar item
 * @param {vscode.ExtensionContext} context
 * @returns {vscode.StatusBarItem}
 */
export function createStatusBar(context) {
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );

    statusBarItem.command = COMMANDS.AUTO_EXPORT;
    updateStatusBar('idle');

    context.subscriptions.push(statusBarItem);

    return statusBarItem;
}

/**
 * Update status bar appearance
 * @param {'idle' | 'extracting' | 'success' | 'error'} state
 */
export function updateStatusBar(state) {
    if (!statusBarItem) {
        console.warn('Status bar not initialized');
        return;
    }

    const config = STATUS_BAR_STATES[state];

    if (!config) {
        console.warn(`Unknown status bar state: ${state}`);
        return;
    }

    statusBarItem.text = config.text;
    statusBarItem.tooltip = config.tooltip || '';
    statusBarItem.backgroundColor = config.backgroundColor
        ? new vscode.ThemeColor(config.backgroundColor)
        : undefined;
    statusBarItem.show();
}

/**
 * Show success state then reset to idle
 */
export function showSuccess() {
    updateStatusBar('success');
    setTimeout(() => updateStatusBar('idle'), TIMING.STATUS_RESET_DELAY);
}

/**
 * Show error state then reset to idle
 */
export function showError() {
    updateStatusBar('error');
    setTimeout(() => updateStatusBar('idle'), TIMING.STATUS_RESET_DELAY);
}

/**
 * Get the status bar item (for testing or advanced use)
 * @returns {vscode.StatusBarItem | null}
 */
export function getStatusBarItem() {
    return statusBarItem;
}
