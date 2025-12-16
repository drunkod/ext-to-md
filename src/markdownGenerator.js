/**
 * Generate Markdown from parsed Code Map data
 */
function generateMarkdown(codeMap, options = {}) {
    const {
        includeGuides = true,
        includeFilesSection = true,
        fileContents = {}  // Full file contents from workspace
    } = options;
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

    // Files Section with full content
    if (includeFilesSection && codeMap.files && Object.keys(codeMap.files).length > 0) {
        lines.push('---');
        lines.push('');
        lines.push('## Referenced Files');
        lines.push('');
        lines.push(generateFilesSection(codeMap.files, fileContents));
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
    return description.replace(/\[(\d+[a-z])\]/g, '**[$1]**');
}

function generateTrace(trace, includeGuides) {
    const lines = [];

    lines.push(`## ${trace.number}. ${trace.title}`);
    lines.push('');

    if (trace.description) {
        lines.push(`> ${trace.description}`);
        lines.push('');
    }

    if (includeGuides && trace.guide && trace.guide.content) {
        lines.push('<details>');
        lines.push(`<summary>📖 <strong>${trace.guide.label || 'AI Generated Guide'}</strong> (click to expand)</summary>`);
        lines.push('');
        lines.push(trace.guide.content);
        lines.push('');
        lines.push('</details>');
        lines.push('');
    }

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
            
            let header = `${indent}#### [${loc.stepNumber}] ${loc.title}`;
            lines.push(header);
            
            if (loc.filename) {
                lines.push(`${indent}📄 \`${loc.filename}\``);
            }
            
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
 * Generate files section with FULL file content and citation comments
 */
function generateFilesSection(filesMap, fileContents) {
    const lines = [];

    lines.push('```xml');
    lines.push('<files>');

    // Sort files by name
    const sortedFiles = Object.keys(filesMap).sort();

    for (const filename of sortedFiles) {
        const snippets = filesMap[filename];
        const fullContent = fileContents[filename];

        lines.push(`<file path="${escapeXml(filename)}">`);

        if (fullContent) {
            // We have the full file content - insert citations at line numbers
            const annotatedContent = insertCitationsIntoFile(fullContent, snippets);
            lines.push(annotatedContent);
        } else {
            // Fallback: just show snippets with citations (sorted by line)
            const sortedSnippets = [...snippets].sort((a, b) => {
                const lineA = parseInt(a.lineNumber, 10) || 0;
                const lineB = parseInt(b.lineNumber, 10) || 0;
                return lineA - lineB;
            });

            sortedSnippets.forEach((snippet) => {
                const lineInfo = snippet.lineNumber ? ` (line ${snippet.lineNumber})` : '';
                lines.push(`<!-- [${snippet.stepNumber}] ${escapeXml(snippet.title)}${lineInfo} -->`);
                lines.push(snippet.code);
            });
        }

        lines.push('</file>');
    }

    lines.push('</files>');
    lines.push('```');

    return lines.join('\n');
}

/**
 * Insert citation comments into full file content at the referenced line numbers
 */
function insertCitationsIntoFile(fileContent, snippets) {
    // Split file into lines
    const fileLines = fileContent.split('\n');

    // Create a map of line number -> citations
    const citationsByLine = {};

    snippets.forEach(snippet => {
        const lineNum = parseInt(snippet.lineNumber, 10);
        if (lineNum && lineNum > 0) {
            if (!citationsByLine[lineNum]) {
                citationsByLine[lineNum] = [];
            }
            citationsByLine[lineNum].push({
                stepNumber: snippet.stepNumber,
                title: snippet.title
            });
        }
    });

    // Build result with citations inserted before referenced lines
    const resultLines = [];

    for (let i = 0; i < fileLines.length; i++) {
        const lineNum = i + 1; // 1-indexed

        // Insert any citations for this line
        if (citationsByLine[lineNum]) {
            citationsByLine[lineNum].forEach(citation => {
                resultLines.push(`<!-- [${citation.stepNumber}] ${escapeXml(citation.title)} (line ${lineNum}) -->`);
            });
        }

        resultLines.push(fileLines[i]);
    }

    return resultLines.join('\n');
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
    
    const cleanFilename = filename.replace(/:\d+$/, '');
    const ext = cleanFilename.split('.').pop()?.toLowerCase();

    const langMap = {
        'cljd': 'clojure', 'clj': 'clojure', 'cljs': 'clojure',
        'dart': 'dart', 'js': 'javascript', 'ts': 'typescript',
        'tsx': 'typescript', 'jsx': 'javascript', 'py': 'python',
        'rs': 'rust', 'go': 'go', 'java': 'java', 'kt': 'kotlin',
        'swift': 'swift', 'yaml': 'yaml', 'yml': 'yaml',
        'json': 'json', 'md': 'markdown', 'sh': 'bash',
        'bash': 'bash', 'zsh': 'bash', 'nix': 'nix',
        'sql': 'sql', 'html': 'html', 'css': 'css',
        'scss': 'scss', 'xml': 'xml', 'toml': 'toml',
        'ini': 'ini', 'dockerfile': 'dockerfile',
        'makefile': 'makefile', 'mk': 'makefile', 'lock': 'json'
    };
    
    const lowerFilename = cleanFilename.toLowerCase();
    if (lowerFilename === 'makefile') return 'makefile';
    if (lowerFilename === 'dockerfile') return 'dockerfile';
    if (lowerFilename.endsWith('.lock')) return 'json';

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
