# Code Map Exporter v2.1

Export Windsurf Code Maps to Markdown with:
- ✅ AI-generated guides (expandable sections)
- ✅ Referenced files listing (XML format)
- ✅ One-click CDP export (no DevTools needed)

## Quick Start

```bash
# Start Windsurf with CDP
windsurf --remote-debugging-port=9229

# Open Code Map, press Ctrl+Alt+M
```

## Features

- **AI Guides**: Extracts and formats the "AI generated guide" content
- **File References**: Collects all code snippets into a files section
- **CDP Auto-Export**: No manual DevTools interaction required
- **Configurable**: Toggle guides/files sections in settings

## Configuration

```json
{
  "codemapExporter.cdpPort": 9229,
  "codemapExporter.includeGuides": true,
  "codemapExporter.includeFilesSection": true
}
```
