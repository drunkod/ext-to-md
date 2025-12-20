// src/commands/index.js
// Command registration hub

import { registerAutoExportCommand } from './autoExportCommand.js';
import { registerManualExportCommand } from './manualExportCommand.js';
import { registerSetupCDPCommand } from './setupCDPCommand.js';

/**
 * Register all extension commands
 * @param {vscode.ExtensionContext} context
 */
export function registerAllCommands(context) {
    registerAutoExportCommand(context);
    registerManualExportCommand(context);
    registerSetupCDPCommand(context);
}
