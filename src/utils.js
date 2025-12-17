
/**
 * Sanitize a string for use as a filename
 * @param {string} name - The raw name
 * @returns {string} - Safe filename
 */
export function sanitizeFilename(name) {
    return name
        .replace(/[<>:"/\\|?*]/g, '-')
        .replace(/\s+/g, '-')
        .substring(0, 80);
}
