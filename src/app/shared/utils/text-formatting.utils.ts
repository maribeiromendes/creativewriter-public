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
 * Logic: Start with <p>, end current chunk with </p>, create new <p> after line breaks
 * @param text - Plain text to convert
 * @returns HTML string with streaming-friendly paragraph structure
 */
export function convertTextToStreamingParagraphs(text: string): string {
  if (!text) {
    return '<p></p>';
  }

  // Start with opening paragraph tag
  let result = '<p>';
  
  // Process text character by character to handle line breaks properly
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '\n' || (char === '\r' && nextChar === '\n')) {
      // Found line break - close current paragraph and start new one
      result += '</p><p>';
      
      // Skip \r in \r\n combination
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip the \n as well
      }
    } else if (char !== '\r') {
      // Add regular character (skip standalone \r)
      result += char;
    }
  }
  
  // Always end with closing paragraph tag
  result += '</p>';
  
  return result;
}