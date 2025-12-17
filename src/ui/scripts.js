// src/ui/scripts.js
// Pure JavaScript - no VS Code dependencies
// This file can be safely imported in tests

/**
 * JavaScript snippet that extracts Code Map from the DOM
 * This runs in the browser console to copy code map data to clipboard
 */
export const EXTRACTOR_SCRIPT = `(async function(){
    const c = document.querySelector('.editor-group-container.active .code-map-editor-container')
           || document.querySelector('.code-map-editor-container');

    if (!c) {
        console.error('❌ No Code Map found!');
        return;
    }

    console.log('📖 Expanding AI guides...');
    const btns = c.querySelectorAll('.trace-guide-toggle');
    let clicked = 0;

    btns.forEach(b => {
        if (b.textContent.toLowerCase().includes('see more')) {
            b.click();
            clicked++;
        }
    });

    if (clicked > 0) {
        console.log('⏳ Waiting for guides to load...');
        await new Promise(r => setTimeout(r, 2000));
    }

    c.querySelectorAll('.trace-header[data-collapsed="true"]').forEach(h => h.click());
    await new Promise(r => setTimeout(r, 300));

    const t = c.querySelector('.code-map-title')?.textContent?.trim() || 'Untitled';
    const cl = c.cloneNode(true);

    cl.querySelectorAll('.trace-locations,.trace-guide-container').forEach(e => e.style.display = 'block');

    const guides = cl.querySelectorAll('.rendered-trace-guide').length;
    const d = { title: t, html: cl.outerHTML };

    navigator.clipboard.writeText(JSON.stringify(d))
        .then(() => console.log('✅ Copied! ' + guides + ' guides found. Press Ctrl+Alt+M'));
})()`;

/**
 * Minified version of the extractor script for display/clipboard
 */
export const EXTRACTOR_SCRIPT_MINIFIED = `(async function(){const c=document.querySelector('.editor-group-container.active .code-map-editor-container')||document.querySelector('.code-map-editor-container');if(!c){console.error('❌ No Code Map found!');return}console.log('📖 Expanding AI guides...');const btns=c.querySelectorAll('.trace-guide-toggle');let clicked=0;btns.forEach(b=>{if(b.textContent.toLowerCase().includes('see more')){b.click();clicked++}});if(clicked>0){console.log('⏳ Waiting for guides to load...');await new Promise(r=>setTimeout(r,2000))}c.querySelectorAll('.trace-header[data-collapsed="true"]').forEach(h=>h.click());await new Promise(r=>setTimeout(r,300));const t=c.querySelector('.code-map-title')?.textContent?.trim()||'Untitled';const cl=c.cloneNode(true);cl.querySelectorAll('.trace-locations,.trace-guide-container').forEach(e=>e.style.display='block');const guides=cl.querySelectorAll('.rendered-trace-guide').length;const d={title:t,html:cl.outerHTML};navigator.clipboard.writeText(JSON.stringify(d)).then(()=>console.log('✅ Copied! '+guides+' guides found. Press Ctrl+Alt+M'))})()`;

/**
 * Get the extractor script (minified version for clipboard)
 * @returns {string}
 */
export function getExtractorScript() {
    return EXTRACTOR_SCRIPT_MINIFIED;
}

/**
 * HTML template for inline extractor panel
 * @param {string} script - The extractor script to embed
 * @returns {string}
 */
export function getInlineExtractorHTML(script) {
    return `<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
        }
        .script-box {
            background: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 4px;
            font-size: 10px;
            word-break: break-all;
            margin: 10px 0;
            max-height: 60px;
            overflow: auto;
        }
        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px;
        }
        button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .step {
            margin: 15px 0;
            padding: 15px;
            background: var(--vscode-input-background);
            border-radius: 6px;
        }
        kbd {
            background: var(--vscode-keybindingLabel-background);
            padding: 3px 6px;
            border-radius: 3px;
        }
        .note {
            font-size: 12px;
            opacity: 0.8;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <h2>📦 Quick Export Code Map</h2>
    <div class="step">
        <button id="copyBtn">📋 Copy Script</button>
        <div class="note">This script will expand all AI guides before copying</div>
        <div class="script-box">${script}</div>
    </div>
    <div class="step">Press <kbd>F12</kbd> → Console → Paste → Enter</div>
    <div class="step"><button id="exportBtn">📄 Export to Markdown</button></div>
    <script>
        const vscode = acquireVsCodeApi();

        document.getElementById('copyBtn').onclick = async () => {
            await navigator.clipboard.writeText(document.querySelector('.script-box').textContent);
            document.getElementById('copyBtn').textContent = '✅ Copied!';
        };

        document.getElementById('exportBtn').onclick = () => {
            vscode.postMessage({ command: 'export' });
        };
    </script>
</body>
</html>`;
}

/**
 * HTML template for CDP setup panel
 * @returns {string}
 */
export function getCDPSetupHTML() {
    return `<!DOCTYPE html>
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
        h1 {
            color: var(--vscode-textLink-foreground);
            border-bottom: 1px solid var(--vscode-textLink-foreground);
            padding-bottom: 10px;
        }
        h2 {
            color: var(--vscode-textLink-activeForeground);
            margin-top: 30px;
        }
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
