# Code Map Exporter - Solution 1: CDP Auto-Export

Export Windsurf Code Maps to Markdown automatically using Chrome DevTools Protocol (CDP).

## Features

- ✅ **One-click export** - No manual DevTools interaction needed
- ✅ **Automatic extraction** - Uses CDP to read Code Map directly
- ✅ **Fallback support** - Clipboard method if CDP not available
- ✅ **Keyboard shortcut** - `Ctrl+Alt+M` (or `Cmd+Alt+M` on Mac)
- ✅ **Status bar** - Quick access button in VS Code

## Quick Start

### Method 1: CDP Auto-Export (Recommended)

**Setup (One-time):**

1. Start Windsurf with debugging enabled:
   ```bash
   windsurf --remote-debugging-port=9229
   ```

2. Open a Code Map in the editor

3. Run command: **"Code Map: Auto Export (CDP)"**

4. Choose where to save the markdown file

**That's it!** The extension will extract and convert automatically.

### Method 2: Clipboard Fallback

If you don't want to enable CDP:

1. Run command: **"Code Map: Export to Markdown"**
2. Follow the inline instructions:
   - Copy the extractor script
   - Open DevTools (F12)
   - Paste in Console and press Enter
   - Click "Export to Markdown"

## Setup Instructions

### Linux/macOS - Create Launch Script

```bash
# Create ~/bin/windsurf-debug.sh
#!/bin/bash
windsurf --remote-debugging-port=9229 "$@"

# Make executable
chmod +x ~/bin/windsurf-debug.sh

# Use it instead of windsurf command
windsurf-debug.sh
```

### Windows - Modify Shortcut

1. Right-click Windsurf shortcut → Properties
2. In "Target" field, add `--remote-debugging-port=9229` at the end
3. Example: `"C:\Program Files\Windsurf\Windsurf.exe" --remote-debugging-port=9229`

### macOS - Create Alias

```bash
# Add to ~/.zshrc or ~/.bash_profile
alias windsurf='windsurf --remote-debugging-port=9229'
```

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| Code Map: Auto Export (CDP) | — | Extract via CDP (requires setup) |
| Code Map: Export to Markdown | `Ctrl+Alt+M` | Manual clipboard export |
| Code Map: Setup Auto-Export | — | Show setup instructions |

## Configuration

Edit VS Code settings (`settings.json`):

```json
{
  "codemapExporter.cdpPort": 9229,
  "codemapExporter.autoExportPath": "/path/to/export/folder"
}
```

## How It Works

```
┌─────────────────────────────────────────┐
│  Windsurf with CDP enabled              │
│  (--remote-debugging-port=9229)         │
└────────────────┬────────────────────────┘
                 │
                 │ Chrome DevTools Protocol
                 │
┌────────────────▼────────────────────────┐
│  VS Code Extension                      │
│  • Connects to CDP port                 │
│  • Executes JS in page context          │
│  • Extracts Code Map HTML               │
│  • Parses with Cheerio                  │
│  • Generates Markdown                   │
│  • Saves to file                        │
└─────────────────────────────────────────┘
```

## Troubleshooting

### "CDP connection refused"

**Solution:** Make sure Windsurf is started with `--remote-debugging-port=9229`

```bash
# Check if CDP is listening
lsof -i :9229  # macOS/Linux
netstat -ano | findstr :9229  # Windows
```

### "No Code Map found"

**Solution:** Make sure a Code Map is open and visible in the editor

### Port already in use

**Solution:** Change the CDP port in settings:

```json
{
  "codemapExporter.cdpPort": 9230
}
```

Then start Windsurf with: `windsurf --remote-debugging-port=9230`

## Installation

```bash
cd codemap-exporter
npm install
# Press F5 in VS Code to test
```

## Building for Release

```bash
npm install -g @vscode/vsce
vsce package
```

## Why CDP?

VS Code extensions run in a separate Node.js process and cannot access the DOM. The Code Map is a custom UI component that only exists in memory. CDP allows us to:

- Connect to the Electron browser process
- Execute JavaScript in the page context
- Extract the Code Map HTML directly
- All without opening DevTools manually!

## License

MIT
