const CDP = require('chrome-remote-interface');

/**
 * Extract Code Map using Chrome DevTools Protocol
 * This works WITHOUT opening DevTools manually!
 */
async function extractCodeMapViaCDP(port = 9229) {
    let client;
    
    try {
        // Connect to VS Code's CDP endpoint
        client = await CDP({ port });
        
        const { Runtime } = client;
        
        // Enable runtime
        await Runtime.enable();
        
        // Execute extraction script in page context
        const result = await Runtime.evaluate({
            expression: `
                (function() {
                    const codeMap = document.querySelector('.editor-group-container.active .code-map-editor-container') 
                                 || document.querySelector('.code-map-editor-container');
                    
                    if (!codeMap) {
                        return { error: 'No Code Map found' };
                    }
                    
                    const title = codeMap.querySelector('.code-map-title')?.textContent?.trim() || 'Untitled';
                    
                    // Clone and expand all sections
                    const clone = codeMap.cloneNode(true);
                    clone.querySelectorAll('.trace-locations, .trace-guide-container').forEach(el => {
                        el.style.display = 'block';
                    });
                    
                    return {
                        success: true,
                        title: title,
                        html: clone.outerHTML,
                        exportedAt: new Date().toISOString()
                    };
                })()
            `,
            returnByValue: true
        });
        
        if (result.result.value.error) {
            throw new Error(result.result.value.error);
        }
        
        return result.result.value;
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            throw new Error(
                'CDP connection refused. Start VS Code with: --remote-debugging-port=9229\n' +
                'Or use the manual clipboard method.'
            );
        }
        throw error;
    } finally {
        if (client) {
            await client.close();
        }
    }
}

/**
 * Check if CDP is available
 */
async function checkCDPConnection(port = 9229) {
    try {
        const client = await CDP({ port });
        await client.close();
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = { 
    extractCodeMapViaCDP, 
    checkCDPConnection
};
