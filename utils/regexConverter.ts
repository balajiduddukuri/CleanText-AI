/**
 * Converts Markdown text to human-readable plain text based on specific requirement rules.
 * Ports the Python logic provided in requirements to TypeScript.
 */
export const markdownToHuman = (text: string): string => {
  if (!text) return '';

  let cleaned = text;

  // 1. Remove headings (#, ##, ###)
  // Replaces start-of-line hash sequences with nothing
  cleaned = cleaned.replace(/^\s*#+\s*/gm, '');

  // 2. Remove bold + italic (**text**, *text*, __text__, _text_)
  // Note: We run this twice to handle nested cases or mixed markers slightly better, 
  // though standard regex has limits with nesting.
  cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, '$2');
  cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, '$2');

  // 3. Convert Markdown links [text](url) → text (url)
  cleaned = cleaned.replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)');

  // 4. Remove image syntax ![alt](url) → alt
  cleaned = cleaned.replace(/!\[(.*?)\]\(.*?\)/g, '$1');

  // 5. Remove inline code `text`
  cleaned = cleaned.replace(/`([^`]*)`/g, '$1');

  // 6. Remove fenced code blocks ``` ```
  // We want to keep the content inside, just strip the backticks.
  cleaned = cleaned.replace(/```[\s\S]*?```/g, (match) => {
    // Remove the first line (language identifier) if present and the backticks
    return match.replace(/```.*\n?/, '').replace(/```/, '');
  });

  // 7. Remove blockquote markers >
  cleaned = cleaned.replace(/^\s*>\s?/gm, '');

  // 8. Convert tables to simple lines by removing pipes
  cleaned = cleaned.replace(/\|\s*/g, ' ');
  // Clean up double spaces resulting from pipe removal
  cleaned = cleaned.replace(/ {2,}/g, ' ');

  // 9. Remove horizontal rules (---, ***, ___)
  cleaned = cleaned.replace(/^\s*(-{3,}|\*{3,}|_{3,})\s*$/gm, '');

  // 10. Remove escaped characters like \*
  cleaned = cleaned.replace(/\\(.)/g, '$1');

  // 11. Remove list markers (-, *, 1.)
  // Unordered
  cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, '');
  // Ordered
  cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, '');

  // 12. Normalize whitespace
  // Replace 3+ newlines with 2 (paragraph break)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
};

export const getStats = (original: string, cleaned: string) => {
  const originalChars = original.length;
  const cleanedChars = cleaned.length;
  const reduction = originalChars > 0 ? ((originalChars - cleanedChars) / originalChars) * 100 : 0;
  
  return {
    originalChars,
    cleanedChars,
    reductionPercent: Math.round(reduction * 10) / 10
  };
};