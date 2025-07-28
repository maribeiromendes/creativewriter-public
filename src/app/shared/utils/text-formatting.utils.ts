/**
 * Utility functions for text formatting operations
 */

/**
 * Converts plain text with line breaks to HTML paragraphs using streaming-friendly logic
 * @param content - The plain text content to convert
 * @returns HTML string with paragraph tags
 */
export function convertLineBreaksToParagraphs(content: string): string {
  if (!content) {
    return '<p></p>';
  }

  // Check if content looks like plain text (no HTML tags)
  if (!content.includes('<') && !content.includes('>')) {
    // Use streaming-friendly paragraph conversion
    return convertTextToStreamingParagraphs(content);
  } else {
    // Content already contains HTML, return as-is
    return content;
  }
}

/**
 * Converts text to streaming-friendly HTML paragraphs
 * Logic: Only split on double line breaks to maintain proper paragraph structure
 * @param text - Plain text to convert
 * @returns HTML string with streaming-friendly paragraph structure
 */
export function convertTextToStreamingParagraphs(text: string): string {
  if (!text) {
    return '<p></p>';
  }

  // Split only on double line breaks (paragraph boundaries)
  // This preserves single line breaks within paragraphs
  const paragraphs = text
    .split(/\n\s*\n/) // Split on double newlines (with optional whitespace between)
    .map(para => para.trim())
    .filter(para => para.length > 0); // Remove empty paragraphs

  if (paragraphs.length === 0) {
    return '<p></p>';
  }

  // Convert each paragraph, replacing single line breaks with spaces
  return paragraphs
    .map(para => {
      // Replace single line breaks with spaces to avoid word/punctuation separation
      const cleanedPara = para.replace(/\s*\n\s*/g, ' ').trim();
      return `<p>${cleanedPara}</p>`;
    })
    .join('');
}