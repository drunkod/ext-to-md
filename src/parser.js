const cheerio = require('cheerio');

/**
 * Parse Code Map HTML and extract structured data
 */
function parseCodeMapHTML(html) {
    const $ = cheerio.load(html, { decodeEntities: false });
    
    const codeMap = {
        title: '',
        createdDate: '',
        description: '',
        traces: []
    };

    // Extract title
    codeMap.title = $('.code-map-title').first().text().trim();

    // Extract creation date
    const dateText = $('.code-map-creation-date').first().text().trim();
    codeMap.createdDate = dateText.replace(/^Created\s*/i, '');

    // Extract description
    const descEl = $('.code-map-description').first();
    codeMap.description = descEl.text().trim();

    // Extract all traces
    $('.code-map-trace').each((index, traceEl) => {
        const trace = parseTrace($, traceEl, index + 1);
        codeMap.traces.push(trace);
    });

    return codeMap;
}

function parseTrace($, traceEl, traceNumber) {
    const $trace = $(traceEl);
    
    const trace = {
        number: traceNumber,
        title: '',
        description: '',
        locations: []
    };

    // Get trace header info
    const $header = $trace.find('.trace-header').first();
    trace.title = $header.find('.trace-title').text().trim();
    
    // Get description, remove "See more" button text
    let desc = $header.find('.trace-description').text().trim();
    trace.description = desc.replace(/See more\s*$/i, '').trim();

    // Parse the trace locations tree
    const $locations = $trace.find('.trace-locations').first();
    parseTreeNodes($, $locations, trace.locations, 0);

    return trace;
}

function parseTreeNodes($, $container, locations, depth) {
    if (!$container.length) return;

    $container.children('.trace-tree-node').each((_, nodeEl) => {
        const $node = $(nodeEl);
        const isRoot = $node.hasClass('root');
        
        // Check for label
        const $label = $node.children('.trace-tree-label');
        if ($label.length) {
            const labelText = $label.first().text().trim();
            if (labelText) {
                locations.push({
                    type: 'label',
                    text: labelText,
                    depth: depth,
                    isRoot: isRoot
                });
            }
        }

        // Check for code location
        const $codeLoc = $node.children('.code-location');
        if ($codeLoc.length) {
            const location = parseCodeLocation($, $codeLoc.first());
            location.depth = depth;
            locations.push(location);
        }

        // Recursively process children
        const $children = $node.children('.trace-tree-node-children');
        if ($children.length) {
            parseTreeNodes($, $children, locations, depth + 1);
        }
    });
}

function parseCodeLocation($, $loc) {
    const $header = $loc.find('.location-header').first();
    
    return {
        type: 'code',
        stepNumber: $header.find('.step-number').first().text().trim(),
        title: $header.find('.location-title').text().trim(),
        filename: $header.find('.location-filename').text().trim(),
        code: $loc.find('.code-content').text().trim()
    };
}

module.exports = { parseCodeMapHTML };
