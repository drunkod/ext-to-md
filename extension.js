const vscode = require('vscode');
const path = require('path');
const { parseCodeMapHTML } = require('./src/parser');
const { generateMarkdown } = require('./src/markdownGenerator');
const { extractCodeMapViaCDP, checkCDPConnection } = require('./src/cdpExtractor');

let statusBarItem;

function activate(context) {
    console.log('Code Map Exporter activated');

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right, 100
    );
    updateStatusBar('idle');
    statusBarItem.command = 'codemap.export';
    context.subscriptions.push(statusBarItem);

    // Command: Auto Export via CDP (No DevTools needed!)
    context.subscriptions.push(
        vscode.commands.registerCommand('codemap.autoExport', async () => {
            const config = vscode.workspace.getConfiguration('codemapExporter');
            const port = config.get('cdpPort', 9229);

            updateStatusBar('extracting');

            try {
                // Check CDP connection
                const isConnected = await checkCDPConnection(port);
                
                if (!isConnected) {
                    const choice = await vscode.window.showWarningMessage(
                        `CDP not available on port ${port}. VS Code needs to be started with debugging enabled.`,
                        'Show Setup Instructions',
                        'Use Clipboard Method'
                    );
                    
                    if (choice === 'Show Setup Instructions') {
                        showCDPSetupInstructions();
                    } else if (choice === 'Use Clipboard Method') {
                        await vscode.commands.executeCommand('codemap.export');
                    }
                    updateStatusBar('idle');
                    return;
                }

                // Extract via CDP
                const data = await extractCodeMapViaCDP(port);
                
                if (!data.success) {
                    throw new Error(data.error || 'Extraction failed');
                }

                // Parse and generate markdown
                const codeMapData = parseCodeMapHTML(data.html);
                codeMapData.title = data.title;
                
                const markdown = generateMarkdown(codeMapData);

                // Save file
                await saveMarkdown(codeMapData.title, markdown);
                
                updateStatusBar('success');
                setTimeout(() => updateStatusBar('idle'), 3000);

            } catch (error) {
                vscode.window.showErrorMessage(`Export failed: ${error.message}`);
                updateStatusBar('error');
                setTimeout(() => updateStatusBar('idle'), 3000);
            }
        })
    );

    // Command: Setup CDP
    context.subscriptions.push(
        vscode.commands.registerCommand('codemap.setupCDP', showCDPSetupInstructions)
    );

    // Command: Manual export from clipboard
    context.subscriptions.push(
        vscode.commands.registerCommand('codemap.export', async () => {
            try {
                const clipboardContent = await vscode.env.clipboard.readText();
                
                if (!clipboardContent) {
                    // Show inline extraction helper
                    await showInlineExtractor();
                    return;
                }

                let codeMapData;
                
                try {
                    const jsonData = JSON.parse(clipboardContent);
                    if (jsonData.html) {
                        codeMapData = parseCodeMapHTML(jsonData.html);
                        if (jsonData.title) codeMapData.title = jsonData.title;
                    }
                } catch (e) {
                    if (clipboardContent.includes('code-map')) {
                        codeMapData = parseCodeMapHTML(clipboardContent);
                    } else {
                        await showInlineExtractor();
                        return;
                    }
                }

                const markdown = generateMarkdown(codeMapData);
                await saveMarkdown(codeMapData.title, markdown);

            } catch (error) {
                vscode.window.showErrorMessage(`Export failed: ${error.message}`);
            }
        })
    );
}

async function saveMarkdown(title, markdown) {
    const config = vscode.workspace.getConfiguration('codemapExporter');
    const defaultPath = config.get('autoExportPath', '');
    
    const fileName = sanitizeFilename(title || 'codemap');
    
    let defaultUri;
    if (defaultPath && vscode.workspace.workspaceFolders) {
        defaultUri = vscode.Uri.file(path.join(defaultPath, `${fileName}.md`));
    } else if (vscode.workspace.workspaceFolders) {
        defaultUri = vscode.Uri.file(
            path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, `${fileName}.md`)
        );
    } else {
        defaultUri = vscode.Uri.file(`${fileName}.md`);
    }

    const uri = await vscode.window.showSaveDialog({
        defaultUri,
        filters: { 'Markdown': ['md'] }
    });

    if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(markdown, 'utf8'));
        
        vscode.window.showInformationMessage(`✅ Exported: ${path.basename(uri.fsPath)}`);
        
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, {
            viewColumn: vscode.ViewColumn.Beside,
            preview: false
        });
    }
}

function showCDPSetupInstructions() {
    const panel = vscode.window.createWebviewPanel(
        'cdpSetup',
        'Setup Auto-Export',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 30px;
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            line-height: 1.8;
        }
        h1 { color: var(--vscode-textLink-foreground); border-bottom: 1px solid var(--vscode-textLink-foreground); padding-bottom: 10px; }
        h2 { color: var(--vscode-textLink-activeForeground); margin-top: 30px; }
        .code-block {
            background: var(--vscode-textCodeBlock-background);
            padding: 15px;
            border-radius: 6px;
            font-family: var(--vscode-editor-font-family);
            margin: 15px 0;
            overflow-x: auto;
        }
        .step {
            background: var(--vscode-input-background);
            border-left: 4px solid var(--vscode-textLink-foreground);
            padding: 15px;
            margin: 15px 0;
        }
        .warning {
            background: var(--vscode-inputValidation-warningBackground);
            border: 1px solid var(--vscode-inputValidation-warningBorder);
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
        }
        ul { padding-left: 20px; }
        li { margin: 8px 0; }
    </style>
</head>
<body>
    <h1>🚀 Setup Auto-Export (No DevTools Required)</h1>
    
    <p>To enable one-click Code Map export, you need to start Windsurf/VS Code with Chrome DevTools Protocol enabled.</p>
    
    <h2>Option 1: Create a Launch Script</h2>
    
    <div class="step">
        <strong>Linux/macOS:</strong>
        <div class="code-block">#!/bin/bash
# Save as ~/bin/windsurf-debug.sh
windsurf --remote-debugging-port=9229 "$@"</div>
    </div>
    
    <div class="step">
        <strong>Windows:</strong>
        <div class="code-block">REM Save as windsurf-debug.bat
"C:\\\\Path\\\\To\\\\Windsurf.exe" --remote-debugging-port=9229 %*</div>
    </div>
    
    <h2>Option 2: Modify Desktop Shortcut</h2>
    
    <div class="step">
        <p>Add <code>--remote-debugging-port=9229</code> to your Windsurf shortcut:</p>
        <ul>
            <li><strong>Linux:</strong> Edit ~/.local/share/applications/windsurf.desktop</li>
            <li><strong>Windows:</strong> Right-click shortcut → Properties → Target</li>
            <li><strong>macOS:</strong> Use Automator to create a wrapper app</li>
        </ul>
    </div>
    
    <h2>Option 3: VS Code/Windsurf Settings</h2>
    
    <div class="step">
        <p>Some versions support this in settings.json:</p>
        <div class="code-block">{
    "remote.debugging.port": 9229
}</div>
    </div>
    
    <div class="warning">
        <strong>⚠️ Security Note:</strong> CDP allows remote access to your editor. Only enable on trusted networks, 
        or bind to localhost only (which is the default).
    </div>
    
    <h2>After Setup</h2>
    
    <ol>
        <li>Restart Windsurf with the new configuration</li>
        <li>Open a Code Map</li>
        <li>Run command: <strong>"Code Map: Auto Export (CDP)"</strong></li>
        <li>The markdown file will be created automatically!</li>
    </ol>
    
    <h2>Alternative: Use Clipboard Method</h2>
    
    <p>If you don't want to modify how Windsurf starts, you can still use the clipboard method which requires
    a quick paste in DevTools (F12 → Console → Paste → Enter → Ctrl+Alt+M).</p>
</body>
</html>`;
}

async function showInlineExtractor() {
    const panel = vscode.window.createWebviewPanel(
        'inlineExtractor',
        'Extract Code Map',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    const extractorScript = `(function(){const c=document.querySelector('.editor-group-container.active .code-map-editor-container')||document.querySelector('.code-map-editor-container');if(!c){console.error('❌ No Code Map found!');return}const t=c.querySelector('.code-map-title')?.textContent?.trim()||'Untitled';const cl=c.cloneNode(true);cl.querySelectorAll('.trace-locations,.trace-guide-container').forEach(e=>e.style.display='block');const d={title:t,html:cl.outerHTML};navigator.clipboard.writeText(JSON.stringify(d)).then(()=>console.log('✅ Copied! Press Ctrl+Alt+M'))})()`;

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
        .script-box { background: var(--vscode-textCodeBlock-background); padding: 10px; border-radius: 4px; font-size: 11px; word-break: break-all; margin: 10px 0; max-height: 100px; overflow: auto; }
        button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 5px; font-size: 14px; }
        button:hover { background: var(--vscode-button-hoverBackground); }
        .step { margin: 20px 0; padding: 15px; background: var(--vscode-input-background); border-radius: 6px; }
        .step-num { display: inline-block; width: 30px; height: 30px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-radius: 50%; text-align: center; line-height: 30px; margin-right: 10px; }
        kbd { background: var(--vscode-keybindingLabel-background); padding: 3px 6px; border-radius: 3px; border: 1px solid var(--vscode-keybindingLabel-border); }
    </style>
</head>
<body>
    <h2>📦 Quick Export Code Map</h2>
    
    <div class="step">
        <span class="step-num">1</span>
        <button id="copyBtn">📋 Copy Extractor Script</button>
        <div class="script-box" id="scriptBox">${extractorScript}</div>
    </div>
    
    <div class="step">
        <span class="step-num">2</span>
        Press <kbd>F12</kbd> to open DevTools → Go to <strong>Console</strong> tab
    </div>
    
    <div class="step">
        <span class="step-num">3</span>
        Paste the script (<kbd>Ctrl</kbd>+<kbd>V</kbd>) and press <kbd>Enter</kbd>
    </div>
    
    <div class="step">
        <span class="step-num">4</span>
        <button id="exportBtn">📄 Export to Markdown</button>
        <span style="opacity: 0.7; margin-left: 10px;">or press <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>M</kbd></span>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        const script = document.getElementById('scriptBox').textContent;
        
        document.getElementById('copyBtn').onclick = async () => {
            await navigator.clipboard.writeText(script);
            document.getElementById('copyBtn').textContent = '✅ Copied!';
            setTimeout(() => document.getElementById('copyBtn').textContent = '📋 Copy Extractor Script', 2000);
        };
        
        document.getElementById('exportBtn').onclick = () => {
            vscode.postMessage({ command: 'export' });
        };
    </script>
</body>
</html>`;

    panel.webview.onDidReceiveMessage(async message => {
        if (message.command === 'export') {
            panel.dispose();
            await vscode.commands.executeCommand('codemap.export');
        }
    });
}

function updateStatusBar(state) {
    switch (state) {
        case 'idle':
            statusBarItem.text = '$(file-code) CodeMap';
            statusBarItem.tooltip = 'Click to export Code Map to Markdown';
            statusBarItem.backgroundColor = undefined;
            break;
        case 'extracting':
            statusBarItem.text = '$(sync~spin) Extracting...';
            statusBarItem.tooltip = 'Extracting Code Map...';
            break;
        case 'success':
            statusBarItem.text = '$(check) Exported!';
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            break;
        case 'error':
            statusBarItem.text = '$(error) Failed';
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            break;
    }
    statusBarItem.show();
}

function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '-').substring(0, 80);
}

function deactivate() {}

module.exports = { activate, deactivate };
