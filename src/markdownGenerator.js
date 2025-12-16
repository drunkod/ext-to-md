/**
 * Generate Markdown from parsed Code Map data
 */
function generateMarkdown(codeMap, options = {}) {
    const { includeGuides = true, includeFilesSection = true } = options;
    const lines = [];

    // Title
    lines.push(`# ${codeMap.title || 'Code Map'}`);
    lines.push('');

    // Metadata
    if (codeMap.createdDate) {
        lines.push(`> 📅 **Created:** ${codeMap.createdDate}`);
        lines.push('');
    }

    // Description/Overview
    if (codeMap.description) {
        lines.push('## Overview');
        lines.push('');
        lines.push(formatDescription(codeMap.description));
        lines.push('');
    }

    // Table of Contents
    if (codeMap.traces.length > 0) {
        lines.push('## Table of Contents');
        lines.push('');
        codeMap.traces.forEach(trace => {
            const slug = slugify(trace.title);
            lines.push(`${trace.number}. [${trace.title}](#${trace.number}-${slug})`);
        });
        lines.push('');
        lines.push('---');
        lines.push('');
    }

    // Traces
    codeMap.traces.forEach(trace => {
        lines.push(...generateTrace(trace, includeGuides));
    });

    // Files Section
    if (includeFilesSection && codeMap.files && Object.keys(codeMap.files).length > 0) {
        lines.push('---');
        lines.push('');
        lines.push('## Referenced Files');
        lines.push('');
        lines.push(generateFilesSection(codeMap.files));
    }

    // Footer
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(`*Exported from Code Map on ${new Date().toLocaleDateString()}*`);

    return lines.join('\n');
}

/**
 * Format description with step references
 */
function formatDescription(description) {
    // Bold step references like [2d], [4b]
    return description.replace(/\[(\d+[a-z])\]/g, '**[$1]**');
}

function generateTrace(trace, includeGuides) {
    const lines = [];

    // Trace header
    lines.push(`## ${trace.number}. ${trace.title}`);
    lines.push('');

    if (trace.description) {
        lines.push(`> ${trace.description}`);
        lines.push('');
    }

    // Include AI-generated guide if present
    if (includeGuides && trace.guide && trace.guide.content) {
        lines.push('<details>');
        lines.push(`<summary>📖 <strong>${trace.guide.label || 'AI Generated Guide'}</strong> (click to expand)</summary>`);
        lines.push('');
        lines.push(trace.guide.content);
        lines.push('');
        lines.push('</details>');
        lines.push('');
    }

    // Process locations
    if (trace.locations.length > 0) {
        lines.push(...generateLocations(trace.locations));
    }

    lines.push('');
    lines.push('---');
    lines.push('');

    return lines;
}

function generateLocations(locations) {
    const lines = [];
    
    locations.forEach(loc => {
        const indent = '  '.repeat(Math.max(0, loc.depth));
        
        if (loc.type === 'label') {
            if (loc.isRoot) {
                lines.push('');
                lines.push(`### ${loc.text}`);
                lines.push('');
            } else {
                lines.push(`${indent}- ${loc.text}`);
            }
        } else if (loc.type === 'code') {
            lines.push('');
            
            // Step header
            let header = `${indent}#### [${loc.stepNumber}] ${loc.title}`;
            lines.push(header);
            
            // File reference
            if (loc.filename) {
                lines.push(`${indent}📄 \`${loc.filename}\``);
            }
            
            // Code block
            if (loc.code) {
                lines.push('');
                const lang = detectLanguage(loc.filename);
                lines.push(`${indent}\`\`\`${lang}`);
                lines.push(`${indent}${loc.code}`);
                lines.push(`${indent}\`\`\``);
            }
            lines.push('');
        }
    });

    return lines;
}

/**
 * Generate files section in XML format
 */
function generateFilesSection(files) {
    const lines = [];

    lines.push('```xml');
    lines.push('<files>');

    // Sort files by name
    const sortedFiles = Object.keys(files).sort();

    for (const filename of sortedFiles) {
        const snippets = files[filename];

        lines.push(`<file path="${escapeXml(filename)}">`);

        // Add each code snippet with context
        snippets.forEach((snippet, index) => {
            if (index > 0) {
                lines.push('');
                lines.push('<!-- ... -->');
                lines.push('');
            }

            // Add comment with step reference and title
            lines.push(`<!-- [${snippet.stepNumber}] ${escapeXml(snippet.title)}${snippet.lineNumber ? ` (line ${snippet.lineNumber})` : ''} -->`);
            lines.push(snippet.code);
        });

        lines.push('</file>');
    }

    lines.push('</files>');
    lines.push('```');

    return lines.join('\n');
}

/**
 * Escape special XML characters
 */
function escapeXml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function detectLanguage(filename) {
    if (!filename) return '';
    
    // Remove line number suffix like ":36"
    const cleanFilename = filename.replace(/:\d+$/, '');
    const ext = cleanFilename.split('.').pop()?.toLowerCase();

    const langMap = {
        'cljd': 'clojure',
        'clj': 'clojure',
        'cljs': 'clojure',
        'dart': 'dart',
        'js': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'jsx': 'javascript',
        'py': 'python',
        'rs': 'rust',
        'go': 'go',
        'java': 'java',
        'kt': 'kotlin',
        'swift': 'swift',
        'yaml': 'yaml',
        'yml': 'yaml',
        'json': 'json',
        'md': 'markdown',
        'sh': 'bash',
        'bash': 'bash',
        'zsh': 'bash',
        'nix': 'nix',
        'sql': 'sql',
        'html': 'html',
        'css': 'css',
        'scss': 'scss',
        'xml': 'xml',
        'toml': 'toml',
        'ini': 'ini',
        'dockerfile': 'dockerfile',
        'makefile': 'makefile',
        'mk': 'makefile'
    };
    
    // Handle Makefile specially
    if (cleanFilename.toLowerCase() === 'makefile') {
        return 'makefile';
    }

    return langMap[ext] || '';
}

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
        .substring(0, 50);
}

module.exports = { generateMarkdown };
