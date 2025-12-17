# Code Map Exporter - Architecture

## Overview

This VS Code extension exports Windsurf Code Maps to Markdown format.

## File Structure

```
extension.js              # Entry point (~15 lines)
src/
├── constants.js          # Shared constants (commands, config, states)
├── utils.js              # Utility functions (sanitizeFilename)
├── statusBar.js          # Status bar management
├── fileOperations.js     # File read/write operations
├── parser.js             # HTML parsing (cheerio)
├── markdownGenerator.js  # Markdown generation
├── cdpExtractor.js       # Chrome DevTools Protocol extraction
├── commands/
│   ├── index.js          # Command registration hub
│   ├── clipboardParser.js # Clipboard content parsing
│   ├── autoExportCommand.js    # CDP auto-export
│   ├── manualExportCommand.js  # Clipboard export
│   └── setupCDPCommand.js      # Setup instructions
└── ui/
    ├── index.js          # UI exports
    ├── scripts.js        # HTML templates & scripts
    ├── cdpSetupPanel.js  # CDP setup webview
    └── inlineExtractorPanel.js # Extractor webview
```

## Module Responsibilities

| Module | Responsibility | VS Code Dependency |
|--------|----------------|-------------------|
| `constants.js` | Shared constants | No |
| `utils.js` | Utility functions | No |
| `statusBar.js` | Status bar UI | Yes |
| `fileOperations.js` | File I/O | Yes |
| `parser.js` | HTML parsing | No |
| `markdownGenerator.js` | Markdown output | No |
| `cdpExtractor.js` | CDP communication | No (uses chrome-remote-interface) |
| `commands/*.js` | Command handlers | Yes |
| `ui/scripts.js` | HTML templates | No |
| `ui/*Panel.js` | Webview panels | Yes |

## Testing Strategy

- **Pure JS modules** (`parser.js`, `markdownGenerator.js`, `utils.js`, `clipboardParser.js`, `scripts.js`): Fully testable with Node.js test runner
- **VS Code modules**: Tested via integration tests or manual testing

## Data Flow

```
User Action
    ↓
Command (autoExport/manualExport)
    ↓
CDP Extractor OR Clipboard
    ↓
Parser (HTML → Data)
    ↓
File Operations (read referenced files)
    ↓
Markdown Generator (Data → Markdown)
    ↓
File Operations (save)
    ↓
Status Bar Update
```
