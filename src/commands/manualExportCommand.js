// src/commands/manualExportCommand.js

import * as vscode from 'vscode';
import { generateMarkdown } from '../markdownGenerator.js';
import { COMMANDS, CONFIG, CONFIG_DEFAULTS } from '../constants.js';
import { readReferencedFiles, saveMarkdown } from '../fileOperations.js';
import { showInlineExtractorPanel } from '../ui/index.js';
import { parseClipboardContent } from './clipboardParser.js';

/**
 * Execute manual export from clipboard
 */
async function executeManualExport() {
    try {
        const clipboardContent = await vscode.env.clipboard.readText();
        const parseResult = parseClipboardContent(clipboardContent);

        if (!parseResult.success) {
            // No valid content in clipboard, show inline extractor
            await showInlineExtractorPanel();
            return;
        }

        const codeMapData = parseResult.data;

        // Read actual file contents
        const fileContents = await readReferencedFiles(codeMapData.files);

        // Get config options
        const config = vscode.workspace.getConfiguration(CONFIG.SECTION);
        const includeGuides = config.get(CONFIG.INCLUDE_GUIDES, CONFIG_DEFAULTS.INCLUDE_GUIDES);
        const includeFilesSection = config.get(CONFIG.INCLUDE_FILES_SECTION, CONFIG_DEFAULTS.INCLUDE_FILES_SECTION);

        // Generate markdown
        const markdown = generateMarkdown(codeMapData, {
            includeGuides,
            includeFilesSection,
            fileContents
        });

        // Save file
        await saveMarkdown(codeMapData.title, markdown);

    } catch (error) {
        vscode.window.showErrorMessage(`Export failed: ${error.message}`);
    }
}

/**
 * Register the manual export command
 * @param {vscode.ExtensionContext} context
 */
export function registerManualExportCommand(context) {
    const disposable = vscode.commands.registerCommand(
        COMMANDS.EXPORT,
        executeManualExport
    );

    context.subscriptions.push(disposable);
}
