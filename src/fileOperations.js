// src/fileOperations.js

import * as vscode from 'vscode';
import path from 'path';
import fs from 'fs';
import { CONFIG, CONFIG_DEFAULTS } from './constants.js';
import { sanitizeFilename } from './utils.js';

/**
 * Read actual file contents from workspace for all referenced files
 * @param {Object.<string, Array<{stepNumber: string, title: string, lineNumber: string, code: string}>>} filesMap
 * @returns {Promise<Object.<string, string>>}
 */
export async function readReferencedFiles(filesMap) {
    const fileContents = {};

    if (!filesMap || !vscode.workspace.workspaceFolders) {
        return fileContents;
    }

    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;

    for (const filename of Object.keys(filesMap)) {
        try {
            const content = await findAndReadFile(filename, workspaceRoot);
            if (content !== null) {
                fileContents[filename] = content;
                console.log(`Read file: ${filename}`);
            } else {
                console.log(`Could not find file: ${filename}`);
            }
        } catch (error) {
            console.error(`Error reading ${filename}:`, error.message);
        }
    }

    return fileContents;
}

/**
 * Find and read a file from various possible locations
 * @param {string} filename - The filename to find
 * @param {string} workspaceRoot - The workspace root path
 * @returns {Promise<string|null>} - File content or null if not found
 */
async function findAndReadFile(filename, workspaceRoot) {
    // Build list of possible paths
    const possiblePaths = [
        path.join(workspaceRoot, filename),
        filename // absolute path
    ];

    // Also search in subdirectories
    try {
        const files = await vscode.workspace.findFiles(
            `**/${filename}`,
            '**/node_modules/**',
            1
        );
        if (files.length > 0) {
            possiblePaths.unshift(files[0].fsPath);
        }
    } catch (e) {
        // Ignore search errors
    }

    // Try each path
    for (const filePath of possiblePaths) {
        try {
            if (fs.existsSync(filePath)) {
                return fs.readFileSync(filePath, 'utf8');
            }
        } catch (e) {
            // Try next path
        }
    }

    return null;
}

/**
 * Save markdown content to a file with user dialog
 * @param {string} title - The code map title (used for filename)
 * @param {string} markdown - The markdown content to save
 * @returns {Promise<vscode.Uri|null>} - The saved file URI or null if cancelled
 */
export async function saveMarkdown(title, markdown) {
    const config = vscode.workspace.getConfiguration(CONFIG.SECTION);
    const defaultPath = config.get(CONFIG.AUTO_EXPORT_PATH, CONFIG_DEFAULTS.AUTO_EXPORT_PATH);

    const fileName = sanitizeFilename(title || 'codemap');
    const defaultUri = buildDefaultUri(fileName, defaultPath);

    const uri = await vscode.window.showSaveDialog({
        defaultUri,
        filters: { 'Markdown': ['md'] }
    });

    if (uri) {
        await writeFile(uri, markdown);
        await showSavedFile(uri);
        return uri;
    }

    return null;
}

/**
 * Build the default URI for the save dialog
 * @param {string} fileName - Sanitized filename (without extension)
 * @param {string} defaultPath - User-configured default path
 * @returns {vscode.Uri}
 */
function buildDefaultUri(fileName, defaultPath) {
    if (defaultPath && vscode.workspace.workspaceFolders) {
        return vscode.Uri.file(path.join(defaultPath, `${fileName}.md`));
    }

    if (vscode.workspace.workspaceFolders) {
        return vscode.Uri.file(
            path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, `${fileName}.md`)
        );
    }

    return vscode.Uri.file(`${fileName}.md`);
}

/**
 * Write content to file
 * @param {vscode.Uri} uri - File URI
 * @param {string} content - Content to write
 */
async function writeFile(uri, content) {
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
}

/**
 * Show success message and open the saved file
 * @param {vscode.Uri} uri - The saved file URI
 */
async function showSavedFile(uri) {
    const filename = path.basename(uri.fsPath);
    vscode.window.showInformationMessage(`✅ Exported: ${filename}`);

    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, {
        viewColumn: vscode.ViewColumn.Beside,
        preview: false
    });
}
