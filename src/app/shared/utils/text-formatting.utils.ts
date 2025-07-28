/**
 * Utility functions for text formatting operations
 */

/**
 * Converts plain text with line breaks to HTML paragraphs
 * @param content - The plain text content to convert
 * @returns HTML string with paragraph tags
 */
export function convertLineBreaksToParagraphs(content: string): string {
  if (!content) {
    return '<p></p>';
  }

  // Check if content looks like plain text (no HTML tags)
  if (!content.includes('<') && !content.includes('>')) {
    // Convert plain text to HTML paragraphs
    const paragraphs = content
      .split(/\n+/) // Split on any newline (single or multiple)
      .map(para => {
        // Don't filter out empty paragraphs - they represent intentional empty lines
        if (para.trim() === '') {
          return '<p></p>'; // Empty paragraph for empty lines
        }
        return `<p>${para}</p>`; // Each line becomes a separate paragraph
      })
      .join('');
    
    return paragraphs || '<p></p>';
  } else {
    // Content already contains HTML, return as-is
    return content;
  }
}