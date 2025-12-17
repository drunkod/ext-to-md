// src/commands/autoExportCommand.js

import * as vscode from 'vscode';
import { parseCodeMapHTML } from '../parser.js';
import { generateMarkdown } from '../markdownGenerator.js';
import { extractCodeMapViaCDP, checkCDPConnection } from '../cdpExtractor.js';
import { COMMANDS, CONFIG, CONFIG_DEFAULTS } from '../constants.js';
import { updateStatusBar, showSuccess, showError } from '../statusBar.js';
import { readReferencedFiles, saveMarkdown } from '../fileOperations.js';
import { showCDPSetupPanel } from '../ui/index.js';

/**
 * Execute auto export via CDP
 */
async function executeAutoExport() {
    const config = vscode.workspace.getConfiguration(CONFIG.SECTION);
    const port = config.get(CONFIG.CDP_PORT, CONFIG_DEFAULTS.CDP_PORT);

    updateStatusBar('extracting');

    try {
        // Check CDP connection
        const isConnected = await checkCDPConnection(port);

        if (!isConnected) {
            await handleCDPNotAvailable(port);
            updateStatusBar('idle');
            return;
        }

        // Show progress and execute export
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Exporting Code Map",
            cancellable: false
        }, async (progress) => {
            await performExport(progress, config, port);
        });

        showSuccess();

    } catch (error) {
        vscode.window.showErrorMessage(`Export failed: ${error.message}`);
        showError();
    }
}

/**
 * Handle case when CDP is not available
 * @param {number} port - The CDP port
 */
async function handleCDPNotAvailable(port) {
    const choice = await vscode.window.showWarningMessage(
        `CDP not available on port ${port}. VS Code needs to be started with debugging enabled.`,
        'Show Setup Instructions',
        'Use Clipboard Method'
    );

    if (choice === 'Show Setup Instructions') {
        showCDPSetupPanel();
    } else if (choice === 'Use Clipboard Method') {
        await vscode.commands.executeCommand(COMMANDS.EXPORT);
    }
}

/**
 * Perform the actual export with progress reporting
 * @param {vscode.Progress} progress - Progress reporter
 * @param {vscode.WorkspaceConfiguration} config - Extension config
 * @param {number} port - CDP port
 */
async function performExport(progress, config, port) {
    try {
        progress.report({ message: "Expanding AI guides..." });

        // Extract via CDP
        const data = await extractCodeMapViaCDP(port);

        if (!data.success) {
            throw new Error(data.error || 'Extraction failed');
        }

        progress.report({ message: "Parsing content..." });

        // Parse HTML
        const codeMapData = parseCodeMapHTML(data.html);
        codeMapData.title = data.title;

        progress.report({ message: "Reading referenced files..." });

        // Read actual file contents from workspace
        const fileContents = await readReferencedFiles(codeMapData.files);

        // Get config options
        const includeGuides = config.get(CONFIG.INCLUDE_GUIDES, CONFIG_DEFAULTS.INCLUDE_GUIDES);
        const includeFilesSection = config.get(CONFIG.INCLUDE_FILES_SECTION, CONFIG_DEFAULTS.INCLUDE_FILES_SECTION);

        progress.report({ message: "Generating markdown..." });

        const markdown = generateMarkdown(codeMapData, {
            includeGuides,
            includeFilesSection,
            fileContents
        });

        // Show stats
        if (data.stats) {
            console.log(`Extracted ${data.stats.tracesCount} traces with ${data.stats.guidesFound} AI guides`);
        }

        progress.report({ message: "Saving file..." });

        // Save file
        await saveMarkdown(codeMapData.title, markdown);
    } catch (error) {
        if (error.message && error.message.includes('No Code Map')) {
            throw new Error('No Code Map found. Please open a Code Map first.');
        }
        throw error;
    }
}

/**
 * Register the auto export command
 * @param {vscode.ExtensionContext} context
 */
export function registerAutoExportCommand(context) {
    const disposable = vscode.commands.registerCommand(
        COMMANDS.AUTO_EXPORT,
        executeAutoExport
    );

    context.subscriptions.push(disposable);
}
