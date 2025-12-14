/**
 * Generate Markdown from parsed Code Map data
 */
function generateMarkdown(codeMap) {
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
        lines.push(codeMap.description);
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
        lines.push(...generateTrace(trace));
    });

    // Footer
    lines.push('---');
    lines.push('');
    lines.push(`*Exported from Code Map on ${new Date().toLocaleDateString()}*`);

    return lines.join('\n');
}

function generateTrace(trace) {
    const lines = [];

    // Trace header
    lines.push(`## ${trace.number}. ${trace.title}`);
    lines.push('');

    if (trace.description) {
        lines.push(`> ${trace.description}`);
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

function detectLanguage(filename) {
    if (!filename) return '';
    
    const ext = filename.split('.').pop()?.toLowerCase();
    const langMap = {
        'cljd': 'clojure',
        'clj': 'clojure',
        'cljs': 'clojure',
        'dart': 'dart',
        'js': 'javascript',
        'ts': 'typescript',
        'py': 'python',
        'rs': 'rust',
        'go': 'go',
        'java': 'java',
        'kt': 'kotlin',
        'swift': 'swift',
        'yaml': 'yaml',
        'yml': 'yaml',
        'json': 'json',
        'md': 'markdown'
    };
    
    return langMap[ext] || '';
}

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

module.exports = { generateMarkdown };
