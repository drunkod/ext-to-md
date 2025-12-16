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
    statusBarItem.command = 'codemap.autoExport';
    context.subscriptions.push(statusBarItem);

    // Command: Auto Export via CDP
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

                // Show progress
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: "Exporting Code Map",
                    cancellable: false
                }, async (progress) => {
                    progress.report({ message: "Expanding AI guides..." });

                    // Extract via CDP (this now expands guides first)
                    const data = await extractCodeMapViaCDP(port);

                    if (!data.success) {
                        throw new Error(data.error || 'Extraction failed');
                    }

                    progress.report({ message: "Parsing content..." });

                    // Parse and generate markdown
                    const codeMapData = parseCodeMapHTML(data.html);
                    codeMapData.title = data.title;

                    // Get config options
                    const includeGuides = config.get('includeGuides', true);
                    const includeFilesSection = config.get('includeFilesSection', true);

                    progress.report({ message: "Generating markdown..." });

                    const markdown = generateMarkdown(codeMapData, {
                        includeGuides,
                        includeFilesSection
                    });

                    // Show stats
                    if (data.stats) {
                        console.log(`Extracted ${data.stats.tracesCount} traces with ${data.stats.guidesFound} AI guides`);
                    }

                    progress.report({ message: "Saving file..." });

                    // Save file
                    await saveMarkdown(codeMapData.title, markdown);
                });
                
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

                const config = vscode.workspace.getConfiguration('codemapExporter');
                const markdown = generateMarkdown(codeMapData, {
                    includeGuides: config.get('includeGuides', true),
                    includeFilesSection: config.get('includeFilesSection', true)
                });

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
        body { font-family: var(--vscode-font-family); padding: 30px; color: var(--vscode-foreground); background: var(--vscode-editor-background); line-height: 1.8; }
        h1 { color: var(--vscode-textLink-foreground); border-bottom: 1px solid var(--vscode-textLink-foreground); padding-bottom: 10px; }
        h2 { color: var(--vscode-textLink-activeForeground); margin-top: 30px; }
        .code-block { background: var(--vscode-textCodeBlock-background); padding: 15px; border-radius: 6px; font-family: var(--vscode-editor-font-family); margin: 15px 0; overflow-x: auto; }
        .step { background: var(--vscode-input-background); border-left: 4px solid var(--vscode-textLink-foreground); padding: 15px; margin: 15px 0; }
        .warning { background: var(--vscode-inputValidation-warningBackground); border: 1px solid var(--vscode-inputValidation-warningBorder); padding: 15px; border-radius: 6px; margin: 15px 0; }
    </style>
</head>
<body>
    <h1>🚀 Setup Auto-Export (No DevTools Required)</h1>
    <p>Start Windsurf/VS Code with Chrome DevTools Protocol enabled:</p>
    <div class="step">
        <strong>Linux/macOS:</strong>
        <div class="code-block">windsurf --remote-debugging-port=9229</div>
    </div>
    <div class="step">
        <strong>Windows:</strong>
        <div class="code-block">"C:\\Path\\To\\Windsurf.exe" --remote-debugging-port=9229</div>
    </div>
    <h2>After Setup</h2>
    <ol>
        <li>Restart Windsurf with the flag</li>
        <li>Open a Code Map</li>
        <li>Press <strong>Ctrl+Alt+M</strong> or run "Code Map: Auto Export (CDP)"</li>
    </ol>
    <div class="warning">
        <strong>⚠️ Security:</strong> CDP allows remote access. Only enable on trusted networks.
    </div>
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

    // Updated script that also clicks "See more" buttons
    const extractorScript = `(async function(){const c=document.querySelector('.editor-group-container.active .code-map-editor-container')||document.querySelector('.code-map-editor-container');if(!c){console.error('❌ No Code Map found!');return}console.log('📖 Expanding AI guides...');const btns=c.querySelectorAll('.trace-guide-toggle');let clicked=0;btns.forEach(b=>{if(b.textContent.toLowerCase().includes('see more')){b.click();clicked++}});if(clicked>0){console.log('⏳ Waiting for guides to load...');await new Promise(r=>setTimeout(r,2000))}c.querySelectorAll('.trace-header[data-collapsed="true"]').forEach(h=>h.click());await new Promise(r=>setTimeout(r,300));const t=c.querySelector('.code-map-title')?.textContent?.trim()||'Untitled';const cl=c.cloneNode(true);cl.querySelectorAll('.trace-locations,.trace-guide-container').forEach(e=>e.style.display='block');const guides=cl.querySelectorAll('.rendered-trace-guide').length;const d={title:t,html:cl.outerHTML};navigator.clipboard.writeText(JSON.stringify(d)).then(()=>console.log('✅ Copied! '+guides+' guides found. Press Ctrl+Alt+M'))})()`;

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
        .script-box { background: var(--vscode-textCodeBlock-background); padding: 10px; border-radius: 4px; font-size: 10px; word-break: break-all; margin: 10px 0; max-height: 60px; overflow: auto; }
        button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 5px; }
        button:hover { background: var(--vscode-button-hoverBackground); }
        .step { margin: 15px 0; padding: 15px; background: var(--vscode-input-background); border-radius: 6px; }
        kbd { background: var(--vscode-keybindingLabel-background); padding: 3px 6px; border-radius: 3px; }
        .note { font-size: 12px; opacity: 0.8; margin-top: 5px; }
    </style>
</head>
<body>
    <h2>📦 Quick Export Code Map</h2>
    <div class="step">
        <button id="copyBtn">📋 Copy Script</button>
        <div class="note">This script will expand all AI guides before copying</div>
        <div class="script-box">${extractorScript}</div>
    </div>
    <div class="step">Press <kbd>F12</kbd> → Console → Paste → Enter</div>
    <div class="step"><button id="exportBtn">📄 Export to Markdown</button></div>
    <script>
        const vscode = acquireVsCodeApi();
        document.getElementById('copyBtn').onclick = async () => {
            await navigator.clipboard.writeText(document.querySelector('.script-box').textContent);
            document.getElementById('copyBtn').textContent = '✅ Copied!';
        };
        document.getElementById('exportBtn').onclick = () => vscode.postMessage({ command: 'export' });
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
    const states = {
        'idle': { text: '$(file-code) CodeMap', tooltip: 'Click to export Code Map (Ctrl+Alt+M)' },
        'extracting': { text: '$(sync~spin) Extracting...', tooltip: 'Expanding guides and extracting...' },
        'success': { text: '$(check) Exported!', bg: 'statusBarItem.warningBackground' },
        'error': { text: '$(error) Failed', bg: 'statusBarItem.errorBackground' }
    };
    const s = states[state];
    statusBarItem.text = s.text;
    statusBarItem.tooltip = s.tooltip || '';
    statusBarItem.backgroundColor = s.bg ? new vscode.ThemeColor(s.bg) : undefined;
    statusBarItem.show();
}

function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '-').substring(0, 80);
}

function deactivate() {}

module.exports = { activate, deactivate };
