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
        traces: [],
        files: {} // Collect all files with their code snippets
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
        const trace = parseTrace($, traceEl, index + 1, codeMap.files);
        codeMap.traces.push(trace);
    });

    return codeMap;
}

function parseTrace($, traceEl, traceNumber, filesCollector) {
    const $trace = $(traceEl);
    
    const trace = {
        number: traceNumber,
        title: '',
        description: '',
        guide: null, // AI-generated guide content
        locations: []
    };

    // Get trace header info
    const $header = $trace.find('.trace-header').first();
    trace.title = $header.find('.trace-title').text().trim();
    
    // Get description, remove "See more/less" button text
    let desc = $header.find('.trace-description').text().trim();
    trace.description = desc.replace(/See (more|less)\s*$/i, '').trim();

    // Parse trace guide container (AI-generated guide)
    const $guideContainer = $trace.find('.trace-guide-container').first();
    if ($guideContainer.length) {
        trace.guide = parseTraceGuide($, $guideContainer);
    }

    // Parse the trace locations tree
    const $locations = $trace.find('.trace-locations').first();
    parseTreeNodes($, $locations, trace.locations, 0, filesCollector);

    return trace;
}

/**
 * Parse the AI-generated trace guide content
 */
function parseTraceGuide($, $container) {
    const $renderedGuide = $container.find('.rendered-trace-guide').first();
    if (!$renderedGuide.length) return null;

    const guide = {
        label: '',
        content: ''
    };

    // Get guide label
    guide.label = $renderedGuide.find('.trace-guide-label').text().trim();

    // Get the content div (the one after the label)
    const $contentDiv = $renderedGuide.children('div').not('.trace-guide-label').first();

    if ($contentDiv.length) {
        guide.content = convertGuideHtmlToMarkdown($, $contentDiv);
    }

    return guide;
}

/**
 * Convert guide HTML content to Markdown
 */
function convertGuideHtmlToMarkdown($, $container) {
    const lines = [];

    $container.children().each((_, el) => {
        const $el = $(el);
        const tagName = el.tagName?.toLowerCase();

        switch (tagName) {
            case 'h1':
                lines.push('');
                lines.push(`### ${processInlineContent($, $el)}`);
                lines.push('');
                break;

            case 'h2':
                lines.push('');
                lines.push(`#### ${processInlineContent($, $el)}`);
                lines.push('');
                break;

            case 'h3':
                lines.push('');
                lines.push(`##### ${processInlineContent($, $el)}`);
                lines.push('');
                break;

            case 'p':
                lines.push(processInlineContent($, $el));
                lines.push('');
                break;

            case 'ol':
                $el.children('li').each((i, li) => {
                    lines.push(`${i + 1}. ${processInlineContent($, $(li))}`);
                });
                lines.push('');
                break;

            case 'ul':
                $el.children('li').each((_, li) => {
                    lines.push(`- ${processInlineContent($, $(li))}`);
                });
                lines.push('');
                break;

            case 'pre':
                const code = $el.find('code').text() || $el.text();
                lines.push('```');
                lines.push(code.trim());
                lines.push('```');
                lines.push('');
                break;

            case 'blockquote':
                const quoteText = processInlineContent($, $el);
                quoteText.split('\n').forEach(line => {
                    lines.push(`> ${line}`);
                });
                lines.push('');
                break;

            default:
                // Handle any other elements as plain text
                const text = processInlineContent($, $el);
                if (text.trim()) {
                    lines.push(text);
                    lines.push('');
                }
        }
    });

    return lines.join('\n').trim();
}

/**
 * Process inline content (code, links, strong, em, etc.)
 */
function processInlineContent($, $el) {
    let html = $el.html() || '';

    // Convert <code> to backticks
    html = html.replace(/<code>([^<]*)<\/code>/gi, '`$1`');

    // Convert <strong> and <b> to **
    html = html.replace(/<(strong|b)>([^<]*)<\/(strong|b)>/gi, '**$2**');

    // Convert <em> and <i> to *
    html = html.replace(/<(em|i)>([^<]*)<\/(em|i)>/gi, '*$2*');

    // Convert step reference links [9a], [9b], etc.
    html = html.replace(/<a[^>]*data-href="[^"]*traceLoc\/([^"]+)"[^>]*>\[([^\]]+)\]<\/a>/gi, '**[$2]**');

    // Convert regular links
    html = html.replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '[$2]($1)');

    // Remove any remaining HTML tags
    html = html.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    html = html.replace(/&nbsp;/g, ' ');
    html = html.replace(/&amp;/g, '&');
    html = html.replace(/&lt;/g, '<');
    html = html.replace(/&gt;/g, '>');
    html = html.replace(/&quot;/g, '"');

    return html.trim();
}

function parseTreeNodes($, $container, locations, depth, filesCollector) {
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
            const location = parseCodeLocation($, $codeLoc.first(), filesCollector);
            location.depth = depth;
            locations.push(location);
        }

        // Recursively process children
        const $children = $node.children('.trace-tree-node-children');
        if ($children.length) {
            parseTreeNodes($, $children, locations, depth + 1, filesCollector);
        }
    });
}

function parseCodeLocation($, $loc, filesCollector) {
    const $header = $loc.find('.location-header').first();
    
    const stepNumber = $header.find('.step-number').first().text().trim();
    const title = $header.find('.location-title').text().trim();
    const filename = $header.find('.location-filename').text().trim();
    const code = $loc.find('.code-content').text().trim();

    // Collect file snippets
    if (filename && code && filesCollector) {
        // Extract base filename (remove line number like "file.cljd:36")
        const baseFilename = filename.replace(/:\d+$/, '');
        const lineNumber = filename.match(/:(\d+)$/)?.[1] || null;

        if (!filesCollector[baseFilename]) {
            filesCollector[baseFilename] = [];
        }

        filesCollector[baseFilename].push({
            stepNumber,
            title,
            lineNumber,
            code
        });
    }

    return {
        type: 'code',
        stepNumber,
        title,
        filename,
        code
    };
}

module.exports = { parseCodeMapHTML };
