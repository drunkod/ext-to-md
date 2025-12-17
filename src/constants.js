
/**
 * Command identifiers
 */
export const COMMANDS = {
    EXPORT: 'codemap.export',
    AUTO_EXPORT: 'codemap.autoExport',
    SETUP_CDP: 'codemap.setupCDP'
};

/**
 * Configuration keys (without prefix)
 */
export const CONFIG = {
    SECTION: 'codemapExporter',
    CDP_PORT: 'cdpPort',
    AUTO_EXPORT_PATH: 'autoExportPath',
    INCLUDE_GUIDES: 'includeGuides',
    INCLUDE_FILES_SECTION: 'includeFilesSection'
};

/**
 * Configuration defaults
 */
export const CONFIG_DEFAULTS = {
    CDP_PORT: 9229,
    AUTO_EXPORT_PATH: '',
    INCLUDE_GUIDES: true,
    INCLUDE_FILES_SECTION: true
};

/**
 * Status bar states
 */
export const STATUS_BAR_STATES = {
    idle: {
        text: '$(file-code) CodeMap',
        tooltip: 'Click to export Code Map (Ctrl+Alt+M)'
    },
    extracting: {
        text: '$(sync~spin) Extracting...',
        tooltip: 'Expanding guides and extracting...'
    },
    success: {
        text: '$(check) Exported!',
        backgroundColor: 'statusBarItem.warningBackground'
    },
    error: {
        text: '$(error) Failed',
        backgroundColor: 'statusBarItem.errorBackground'
    }
};

/**
 * Timing constants (in milliseconds)
 */
export const TIMING = {
    STATUS_RESET_DELAY: 3000
};
