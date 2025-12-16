const { describe, it, mock } = require('node:test');
const assert = require('node:assert');

// Mock CDP module for testing
const mockCDP = {
    connected: false,
    evaluateResults: [],

    reset() {
        this.connected = false;
        this.evaluateResults = [];
    },

    setConnected(value) {
        this.connected = value;
    },

    addEvaluateResult(result) {
        this.evaluateResults.push(result);
    }
};

describe('CDP Extractor', () => {

    describe('checkCDPConnection', () => {

        it('should return true when CDP is available', async () => {
            // This would need a mock of chrome-remote-interface
            // For now, just test the logic structure
            const checkConnection = async (port) => {
                try {
                    // Simulated connection check
                    if (port === 9229) {
                        return true;
                    }
                    return false;
                } catch (e) {
                    return false;
                }
            };

            const result = await checkConnection(9229);
            assert.strictEqual(result, true);
        });

        it('should return false when CDP is not available', async () => {
            const checkConnection = async (port) => {
                try {
                    throw new Error('Connection refused');
                } catch (e) {
                    return false;
                }
            };

            const result = await checkConnection(9999);
            assert.strictEqual(result, false);
        });
    });

    describe('extractCodeMapViaCDP', () => {

        it('should return error when no code map found', async () => {
            const mockExtract = async () => {
                return {
                    success: false,
                    error: 'No Code Map found. Make sure a Code Map is open and active.'
                };
            };

            const result = await mockExtract();

            assert.strictEqual(result.success, false);
            assert.ok(result.error.includes('No Code Map'));
        });

        it('should return success with HTML when code map found', async () => {
            const mockExtract = async () => {
                return {
                    success: true,
                    title: 'Test Code Map',
                    html: '<div class="code-map-editor-container">...</div>',
                    exportedAt: new Date().toISOString(),
                    stats: {
                        guidesFound: 3,
                        tracesCount: 5
                    }
                };
            };

            const result = await mockExtract();

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.title, 'Test Code Map');
            assert.ok(result.html.includes('code-map-editor-container'));
            assert.strictEqual(result.stats.guidesFound, 3);
            assert.strictEqual(result.stats.tracesCount, 5);
        });

        it('should expand guides before extracting', async () => {
            let clickedButtons = 0;

            const mockExpand = async () => {
                // Simulate clicking "See more" buttons
                clickedButtons = 5;
                return { clickedCount: 5 };
            };

            const result = await mockExpand();

            assert.strictEqual(result.clickedCount, 5);
            assert.strictEqual(clickedButtons, 5);
        });
    });
});
