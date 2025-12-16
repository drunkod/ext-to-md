import CDP from 'chrome-remote-interface';

/**
 * Extract Code Map using Chrome DevTools Protocol
 * Handles lazy-loaded AI guides by clicking "See more" buttons first
 */
export async function extractCodeMapViaCDP(port = 9229) {
    let client;
    
    try {
        client = await CDP({ port });
        const { Runtime } = client;
        await Runtime.enable();
        
        // Step 1: Click all "See more" buttons to load AI guides
        const expandResult = await Runtime.evaluate({
            expression: `
                (async function() {
                    const codeMap = document.querySelector('.editor-group-container.active .code-map-editor-container')
                                 || document.querySelector('.code-map-editor-container');

                    if (!codeMap) {
                        return { error: 'No Code Map found. Make sure a Code Map is open and active.' };
                    }

                    // Find all "See more" buttons and click them
                    const seeMoreButtons = codeMap.querySelectorAll('.trace-guide-toggle');
                    let clickedCount = 0;

                    for (const btn of seeMoreButtons) {
                        // Only click if it says "See more" (not already expanded)
                        if (btn.textContent.trim().toLowerCase().includes('see more')) {
                            btn.click();
                            clickedCount++;
                        }
                    }

                    return {
                        success: true,
                        clickedCount: clickedCount,
                        totalButtons: seeMoreButtons.length
                    };
                })()
            `,
            returnByValue: true,
            awaitPromise: true
        });

        if (expandResult.result.value.error) {
            throw new Error(expandResult.result.value.error);
        }

        const clickedCount = expandResult.result.value.clickedCount || 0;

        // Step 2: Wait for guides to load (if any were clicked)
        if (clickedCount > 0) {
            // Wait a bit for async content to load
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Additional wait: poll until guides are populated
            await Runtime.evaluate({
                expression: `
                    (async function() {
                        const maxWait = 5000; // 5 seconds max
                        const startTime = Date.now();

                        while (Date.now() - startTime < maxWait) {
                            const guides = document.querySelectorAll('.trace-guide-container .rendered-trace-guide');
                            const pendingGuides = document.querySelectorAll('.trace-guide-container:not([style*="display: none"]):empty');

                            // If no pending empty guides, we're done
                            if (pendingGuides.length === 0) {
                                break;
                            }

                            // Wait a bit and check again
                            await new Promise(r => setTimeout(r, 200));
                        }

                        return { done: true };
                    })()
                `,
                returnByValue: true,
                awaitPromise: true
            });
        }

        // Step 3: Also expand collapsed trace locations
        await Runtime.evaluate({
            expression: `
                (function() {
                    const codeMap = document.querySelector('.editor-group-container.active .code-map-editor-container')
                                 || document.querySelector('.code-map-editor-container');

                    if (!codeMap) return;

                    // Click collapsed trace headers to expand locations
                    codeMap.querySelectorAll('.trace-header[data-collapsed="true"]').forEach(header => {
                        header.click();
                    });
                })()
            `,
            returnByValue: true
        });

        // Wait a bit for expansions
        await new Promise(resolve => setTimeout(resolve, 300));

        // Step 4: Now extract the fully loaded content
        const result = await Runtime.evaluate({
            expression: `
                (function() {
                    const codeMap = document.querySelector('.editor-group-container.active .code-map-editor-container') 
                                 || document.querySelector('.code-map-editor-container');
                    
                    if (!codeMap) {
                        return { error: 'No Code Map found.' };
                    }
                    
                    const title = codeMap.querySelector('.code-map-title')?.textContent?.trim() || 'Untitled';
                    
                    // Clone for extraction
                    const clone = codeMap.cloneNode(true);

                    // Ensure all sections are visible in the clone
                    clone.querySelectorAll('.trace-locations').forEach(el => {
                        el.style.display = 'block';
                    });
                    clone.querySelectorAll('.trace-guide-container').forEach(el => {
                        el.style.display = 'block';
                    });

                    // Count guides found
                    const guidesFound = clone.querySelectorAll('.rendered-trace-guide').length;

                    return {
                        success: true,
                        title: title,
                        html: clone.outerHTML,
                        exportedAt: new Date().toISOString(),
                        stats: {
                            guidesFound: guidesFound,
                            tracesCount: clone.querySelectorAll('.code-map-trace').length
                        }
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

/**
 * Extract with option to expand all guides first
 */
export async function extractCodeMapWithGuides(port = 9229, options = {}) {
    const { expandGuides = true, timeout = 10000 } = options;

    let client;

    try {
        client = await CDP({ port });
        const { Runtime } = client;
        await Runtime.enable();

        // Check if Code Map exists
        const checkResult = await Runtime.evaluate({
            expression: `
                (function() {
                    const codeMap = document.querySelector('.editor-group-container.active .code-map-editor-container')
                                 || document.querySelector('.code-map-editor-container');
                    if (!codeMap) return { exists: false };

                    const title = codeMap.querySelector('.code-map-title')?.textContent?.trim() || 'Untitled';
                    const traceCount = codeMap.querySelectorAll('.code-map-trace').length;
                    const unexpandedGuides = codeMap.querySelectorAll('.trace-guide-toggle').length;

                    return {
                        exists: true,
                        title: title,
                        traceCount: traceCount,
                        unexpandedGuides: unexpandedGuides
                    };
                })()
            `,
            returnByValue: true
        });

        if (!checkResult.result.value.exists) {
            throw new Error('No Code Map found. Make sure a Code Map is open and active.');
        }

        const info = checkResult.result.value;

        // Expand all guides if requested
        if (expandGuides && info.unexpandedGuides > 0) {
            console.log(`Expanding ${info.unexpandedGuides} AI guides...`);

            // Click all "See more" buttons
            await Runtime.evaluate({
                expression: `
                    (function() {
                        const codeMap = document.querySelector('.editor-group-container.active .code-map-editor-container')
                                     || document.querySelector('.code-map-editor-container');
                        if (!codeMap) return;

                        const buttons = codeMap.querySelectorAll('.trace-guide-toggle');
                        buttons.forEach(btn => {
                            if (btn.textContent.trim().toLowerCase().includes('see more')) {
                                btn.click();
                            }
                        });
                    })()
                `,
                returnByValue: true
            });

            // Wait for guides to load with polling
            const startTime = Date.now();
            let guidesLoaded = 0;

            while (Date.now() - startTime < timeout) {
                await new Promise(resolve => setTimeout(resolve, 500));

                const statusResult = await Runtime.evaluate({
                    expression: `
                        (function() {
                            const codeMap = document.querySelector('.editor-group-container.active .code-map-editor-container')
                                         || document.querySelector('.code-map-editor-container');
                            if (!codeMap) return { loaded: 0, pending: 0 };

                            const loaded = codeMap.querySelectorAll('.rendered-trace-guide').length;
                            const containers = codeMap.querySelectorAll('.trace-guide-container');
                            let pending = 0;

                            containers.forEach(c => {
                                const style = c.getAttribute('style') || '';
                                const isVisible = !style.includes('display: none');
                                const isEmpty = c.children.length === 0;
                                if (isVisible && isEmpty) pending++;
                            });

                            return { loaded, pending };
                        })()
                    `,
                    returnByValue: true
                });

                const status = statusResult.result.value;
                guidesLoaded = status.loaded;

                if (status.pending === 0) {
                    break;
                }
            }

            console.log(`Loaded ${guidesLoaded} AI guides`);
        }

        // Expand collapsed traces
        await Runtime.evaluate({
            expression: `
                (function() {
                    const codeMap = document.querySelector('.editor-group-container.active .code-map-editor-container')
                                 || document.querySelector('.code-map-editor-container');
                    if (!codeMap) return;

                    codeMap.querySelectorAll('.trace-header[data-collapsed="true"]').forEach(header => {
                        header.click();
                    });
                })()
            `,
            returnByValue: true
        });

        await new Promise(resolve => setTimeout(resolve, 300));

        // Extract final content
        const result = await Runtime.evaluate({
            expression: `
                (function() {
                    const codeMap = document.querySelector('.editor-group-container.active .code-map-editor-container')
                                 || document.querySelector('.code-map-editor-container');

                    if (!codeMap) {
                        return { error: 'No Code Map found.' };
                    }

                    const title = codeMap.querySelector('.code-map-title')?.textContent?.trim() || 'Untitled';

                    const clone = codeMap.cloneNode(true);

                    // Make everything visible
                    clone.querySelectorAll('.trace-locations').forEach(el => {
                        el.style.display = 'block';
                    });
                    clone.querySelectorAll('.trace-guide-container').forEach(el => {
                        el.style.display = 'block';
                    });

                    const guidesFound = clone.querySelectorAll('.rendered-trace-guide').length;
                    const tracesCount = clone.querySelectorAll('.code-map-trace').length;

                    return {
                        success: true,
                        title: title,
                        html: clone.outerHTML,
                        exportedAt: new Date().toISOString(),
                        stats: {
                            guidesFound: guidesFound,
                            tracesCount: tracesCount
                        }
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

export async function checkCDPConnection(port = 9229) {
    try {
        const client = await CDP({ port });
        await client.close();
        return true;
    } catch (error) {
        return false;
    }
}
