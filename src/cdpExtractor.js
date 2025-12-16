const CDP = require('chrome-remote-interface');

/**
 * Extract Code Map using Chrome DevTools Protocol
 */
async function extractCodeMapViaCDP(port = 9229) {
    let client;
    
    try {
        client = await CDP({ port });
        const { Runtime } = client;
        await Runtime.enable();
        
        const result = await Runtime.evaluate({
            expression: `
                (function() {
                    const codeMap = document.querySelector('.editor-group-container.active .code-map-editor-container') 
                                 || document.querySelector('.code-map-editor-container');
                    
                    if (!codeMap) {
                        return { error: 'No Code Map found. Make sure a Code Map is open and active.' };
                    }
                    
                    const title = codeMap.querySelector('.code-map-title')?.textContent?.trim() || 'Untitled';
                    
                    // Clone and expand all sections for complete export
                    const clone = codeMap.cloneNode(true);

                    // Expand all collapsed sections
                    clone.querySelectorAll('.trace-locations, .trace-guide-container').forEach(el => {
                        el.style.display = 'block';
                    });
                    
                    // Also click all "See more" buttons to expand guides
                    clone.querySelectorAll('.trace-header[data-collapsed="true"]').forEach(header => {
                        header.setAttribute('data-collapsed', 'false');
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
            throw new Error('CDP connection refused. Start with: --remote-debugging-port=9229');
        }
        throw error;
    } finally {
        if (client) await client.close();
    }
}

async function checkCDPConnection(port = 9229) {
    try {
        const client = await CDP({ port });
        await client.close();
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = { extractCodeMapViaCDP, checkCDPConnection };
