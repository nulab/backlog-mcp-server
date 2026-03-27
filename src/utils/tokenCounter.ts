export function countTokens(text: string): number {
  // Normalize whitespace (convert tabs and newlines to spaces)
  const normalized = text
    .replace(/\s+/g, ' ') // Replace multiple whitespace with a single space
    .replace(/[\n\t]/g, ' ') // Replace newlines and tabs with a space
    .trim();

  // Split into words and individual symbols
  const tokens = normalized.match(/\w+|[^\s\w]/g);

  // Return the number of tokens
  return tokens ? tokens.length : 0;
}
